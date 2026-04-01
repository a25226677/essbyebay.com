"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Eye, EyeOff, RefreshCw, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProfileForm = {
  full_name: string;
  email: string;
  phone: string;
};

type PasswordForm = {
  newPassword: string;
  confirmPassword: string;
};

export default function AdminSettingsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [profileForm, setProfileForm] = useState<ProfileForm>({
    full_name: "",
    email: "",
    phone: "",
  });

  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    async function loadAdminProfile() {
      setLoading(true);
      setProfileError("");

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace("/admin/login?next=/admin/settings");
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, full_name, phone")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          setProfileError(profileError.message || "Failed to load admin profile.");
          return;
        }

        if (!profile || profile.role !== "admin") {
          router.replace("/admin/login?error=not_admin");
          return;
        }

        setProfileForm({
          full_name: profile.full_name || user.user_metadata?.full_name || "",
          email: user.email || "",
          phone: profile.phone || "",
        });
      } catch {
        setProfileError("Failed to load admin settings.");
      } finally {
        setLoading(false);
      }
    }

    loadAdminProfile();
  }, [router, supabase]);

  const handleProfileChange = (field: keyof ProfileForm, value: string) => {
    setProfileError("");
    setProfileSuccess("");
    setProfileForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePasswordChange = (field: keyof PasswordForm, value: string) => {
    setPasswordError("");
    setPasswordSuccess("");
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    setProfileError("");
    setProfileSuccess("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setProfileError("Your session has expired. Please login again.");
        return;
      }

      const { error: updateProfileError } = await supabase
        .from("profiles")
        .update({
          full_name: profileForm.full_name.trim(),
          phone: profileForm.phone.trim(),
        })
        .eq("id", user.id);

      if (updateProfileError) {
        setProfileError(updateProfileError.message || "Failed to update profile.");
        return;
      }

      const { error: updateAuthError } = await supabase.auth.updateUser({
        data: { full_name: profileForm.full_name.trim() },
      });

      if (updateAuthError) {
        setProfileError(updateAuthError.message || "Failed to update profile.");
        return;
      }

      setProfileSuccess("Profile updated successfully.");
    } catch {
      setProfileError("Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const updatePassword = async () => {
    setSavingPassword(true);
    setPasswordError("");
    setPasswordSuccess("");

    try {
      const newPassword = passwordForm.newPassword;
      const confirmPassword = passwordForm.confirmPassword;

      if (newPassword.length < 8) {
        setPasswordError("Password must be at least 8 characters.");
        return;
      }

      if (newPassword !== confirmPassword) {
        setPasswordError("Passwords do not match.");
        return;
      }

      const { error: passwordUpdateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (passwordUpdateError) {
        setPasswordError(passwordUpdateError.message || "Failed to update password.");
        return;
      }

      setPasswordForm({ newPassword: "", confirmPassword: "" });
      setPasswordSuccess("Password updated successfully.");
    } catch {
      setPasswordError("Failed to update password.");
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="size-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">My Profile</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your admin profile details and update your account password.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-base font-semibold text-gray-800">Profile Information</h2>

          {profileError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="size-4 mt-0.5 shrink-0" />
              <span>{profileError}</span>
            </div>
          )}

          {profileSuccess && (
            <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              <CheckCircle2 className="size-4 mt-0.5 shrink-0" />
              <span>{profileSuccess}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              value={profileForm.full_name}
              onChange={(event) => handleProfileChange("full_name", event.target.value)}
              placeholder="Admin name"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" value={profileForm.email} readOnly className="bg-gray-50 text-gray-500" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              value={profileForm.phone}
              onChange={(event) => handleProfileChange("phone", event.target.value)}
              placeholder="Optional"
            />
          </div>

          <Button
            type="button"
            onClick={saveProfile}
            disabled={savingProfile}
            className="inline-flex items-center gap-2"
          >
            <Save className="size-4" />
            {savingProfile ? "Saving..." : "Save Profile"}
          </Button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-base font-semibold text-gray-800">Password Settings</h2>
          <p className="text-xs text-gray-500">
            Use a strong password with at least 8 characters.
          </p>

          {passwordError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="size-4 mt-0.5 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          {passwordSuccess && (
            <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              <CheckCircle2 className="size-4 mt-0.5 shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="new-password">New Password</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNewPassword ? "text" : "password"}
                autoComplete="new-password"
                value={passwordForm.newPassword}
                onChange={(event) => handlePasswordChange("newPassword", event.target.value)}
                placeholder="Enter new password"
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showNewPassword ? "Hide password" : "Show password"}
              >
                {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                value={passwordForm.confirmPassword}
                onChange={(event) => handlePasswordChange("confirmPassword", event.target.value)}
                placeholder="Confirm new password"
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <Button
            type="button"
            onClick={updatePassword}
            disabled={savingPassword}
            className="inline-flex items-center gap-2"
          >
            <Save className="size-4" />
            {savingPassword ? "Updating..." : "Update Password"}
          </Button>
        </div>
      </div>
    </div>
  );
}