"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReCAPTCHA from "react-google-recaptcha";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, User, Store } from "lucide-react";
import { cn } from "@/lib/utils";

export default function RegistrationPage() {
  const router = useRouter();
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const [role, setRole] = useState<"customer" | "seller">("customer");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect already-logged-in users away
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.session.user.id)
          .maybeSingle();
        if (profile?.role === "admin") router.replace("/admin/dashboard");
        else if (profile?.role === "seller") router.replace("/seller/dashboard");
        else router.replace("/account");
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!agreeTerms) {
      setError("You must agree to the terms and conditions.");
      return;
    }
    if (!captchaVerified) {
      setError("Please complete the CAPTCHA verification.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (error) {
      setError(error.message);
      recaptchaRef.current?.reset();
      setCaptchaVerified(false);
      setLoading(false);
    } else {
      if (data.user) {
        await supabase
          .from("profiles")
          .update({ full_name: fullName, role })
          .eq("id", data.user.id);

        // Send welcome email + admin notification (non-blocking)
        try {
          await fetch("/api/auth/welcome", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fullName, role }),
          });
        } catch {
          // Email failure should not block registration
        }
      }
      if (role === "seller") {
        router.push("/seller/login?registered=true");
      } else {
        router.push("/users/login?registered=true");
      }
    }
  };

  return (
    <div className="min-h-[65vh] flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-sm p-8 space-y-5">
          {/* Heading */}
          <h1 className="text-3xl font-extrabold text-center text-gray-900">
            Create an account.
          </h1>

          {/* Role Selector Tabs */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setRole("customer")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors",
                role === "customer"
                  ? "bg-red-500 text-white"
                  : "bg-white text-gray-500 hover:bg-gray-50"
              )}
            >
              <User size={15} />
              Customer
            </button>
            <button
              type="button"
              onClick={() => setRole("seller")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors border-l border-gray-200",
                role === "seller"
                  ? "bg-red-500 text-white"
                  : "bg-white text-gray-500 hover:bg-gray-50"
              )}
            >
              <Store size={15} />
              Seller
            </button>
          </div>

          {role === "seller" && (
            <div className="bg-orange-50 border border-orange-200 rounded-md p-3 text-xs text-orange-700">
              You are registering as a <strong>Seller</strong>. After signup you&apos;ll be redirected to the Seller Portal.
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-md p-3">
              {error}
            </div>
          )}

          <form onSubmit={handleSignUp} className="space-y-4">
            {/* Full Name */}
            <Input
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="h-12 bg-white border-gray-200 placeholder:text-gray-400"
            />

            {/* Email */}
            <Input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 bg-[#eef0f8] border-transparent placeholder:text-gray-400"
            />

            {/* Password */}
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-12 bg-[#eef0f8] border-transparent placeholder:text-gray-400 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Confirm Password */}
            <Input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="h-12 bg-white border-gray-200 placeholder:text-gray-400"
            />

            {/* reCAPTCHA */}
            <div className="flex justify-center">
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={
                  process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ||
                  "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"
                }
                onChange={(token) => setCaptchaVerified(!!token)}
                onExpired={() => setCaptchaVerified(false)}
              />
            </div>

            {/* Terms checkbox */}
            <label className="flex items-start gap-2 cursor-pointer">
              <Checkbox
                checked={agreeTerms}
                onCheckedChange={(v) => setAgreeTerms(!!v)}
                className="border-gray-400 mt-0.5"
              />
              <span className="text-sm text-gray-500 leading-snug">
                By signing up you agree to our{" "}
                <Link
                  href="/terms"
                  className="text-gray-700 underline hover:text-gray-900"
                >
                  terms and conditions
                </Link>
                .
              </span>
            </label>

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-red-500 hover:bg-red-600 text-white font-bold tracking-widest uppercase rounded-lg text-sm"
            >
              {loading
                ? "Creating account…"
                : role === "seller"
                ? "Create Seller Account"
                : "Create Account"}
            </Button>
          </form>

          {/* Login link */}
          <p className="text-sm text-center text-gray-400">
            Already have an account?{" "}
            <Link
              href="/users/login"
              className="text-red-500 font-semibold hover:underline"
            >
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
