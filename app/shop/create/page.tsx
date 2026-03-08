"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ReCAPTCHA from "react-google-recaptcha";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Store,
  CheckCircle,
  RefreshCw,
  AlertCircle,
  Eye,
  EyeOff,
  Upload,
  X,
} from "lucide-react";

const CERTIFICATE_TYPES = [
  { value: "id_card", label: "ID Card" },
  { value: "passport", label: "Passport" },
  { value: "driving_license", label: "Driving License" },
  { value: "business_license", label: "Business License" },
];

export default function RegisterShopPage() {
  const router = useRouter();
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [hasShop, setHasShop] = useState(false);

  // OTP state
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpCooldown, setOtpCooldown] = useState(0);

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showTxPassword, setShowTxPassword] = useState(false);
  const [showTxConfirmPassword, setShowTxConfirmPassword] = useState(false);

  // reCAPTCHA
  const [captchaVerified, setCaptchaVerified] = useState(false);

  // File uploads
  const [certFrontFile, setCertFrontFile] = useState<File | null>(null);
  const [certBackFile, setCertBackFile] = useState<File | null>(null);

  // Form fields
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    transactionPassword: "",
    confirmTransactionPassword: "",
    shopName: "",
    address: "",
    certificateType: "id_card",
    invitationCode: "",
  });

  const updateField = (field: string, value: string) =>
    setForm((p) => ({ ...p, [field]: value }));

  // OTP cooldown timer
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const t = setTimeout(() => setOtpCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [otpCooldown]);

  // Check if user already has a shop
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session?.user) {
        setChecking(false);
        return;
      }
      const { data: existing } = await supabase
        .from("shops")
        .select("id, name")
        .eq("owner_id", data.session.user.id)
        .maybeSingle();

      if (existing) {
        setHasShop(true);
      }
      setChecking(false);
    });
  }, []);

  // ── Send OTP ──
  const handleSendOtp = useCallback(async () => {
    if (!form.email.trim()) {
      setOtpError("Enter your email first");
      return;
    }
    setOtpError("");
    setOtpLoading(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.error || "Failed to send OTP");
      } else {
        setOtpSent(true);
        setOtpCooldown(60);
      }
    } catch {
      setOtpError("Network error. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  }, [form.email]);

  // ── Verify OTP ──
  const handleVerifyOtp = useCallback(async () => {
    if (!otpCode.trim() || otpCode.length < 6) {
      setOtpError("Enter the 6-digit code");
      return;
    }
    setOtpError("");
    setOtpLoading(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, code: otpCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.error || "Invalid OTP");
      } else {
        setOtpVerified(true);
      }
    } catch {
      setOtpError("Network error. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  }, [form.email, otpCode]);

  // ── Submit form ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.fullName.trim()) {
      setError("Full name is required");
      return;
    }
    if (!form.email.trim()) {
      setError("Email is required");
      return;
    }
    if (!otpVerified) {
      setError("Please verify your email with OTP first");
      return;
    }
    if (!form.phone.trim()) {
      setError("Phone number is required");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (!/^\d{6}$/.test(form.transactionPassword)) {
      setError("Transaction password must be exactly 6 digits");
      return;
    }
    if (form.transactionPassword !== form.confirmTransactionPassword) {
      setError("Transaction passwords do not match");
      return;
    }
    if (!form.shopName.trim()) {
      setError("Shop name is required");
      return;
    }
    if (!captchaVerified) {
      setError("Please complete the CAPTCHA verification");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.set("fullName", form.fullName);
      formData.set("email", form.email);
      formData.set("phone", form.phone);
      formData.set("password", form.password);
      formData.set("transactionPassword", form.transactionPassword);
      formData.set("shopName", form.shopName);
      formData.set("address", form.address);
      formData.set("certificateType", form.certificateType);
      formData.set("invitationCode", form.invitationCode);

      if (certFrontFile) {
        formData.set("certFrontFile", certFrontFile);
      }

      if (certBackFile) {
        formData.set("certBackFile", certBackFile);
      }

      const response = await fetch("/api/shop/register", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;

      if (!response.ok) {
        setError(data?.error || "Failed to create shop. Please try again.");
        recaptchaRef.current?.reset();
        setCaptchaVerified(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Loading state ──
  if (checking) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <RefreshCw className="size-6 animate-spin text-indigo-400 mx-auto" />
        <p className="text-sm text-gray-500 mt-3">Checking your account...</p>
      </div>
    );
  }

  // ── Already has a shop ──
  if (hasShop) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
          <Store className="size-8 text-amber-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">You Already Have a Shop</h1>
        <p className="text-muted-foreground text-sm mb-6">
          You can manage your shop from the seller dashboard.
        </p>
        <Button onClick={() => router.push("/seller/dashboard")}>
          Go to Seller Dashboard
        </Button>
      </div>
    );
  }

  // ── Success state ──
  if (success) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="size-8 text-emerald-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Shop Registration Submitted!</h1>
        <p className="text-muted-foreground text-sm mb-2">
          Your shop <strong>{form.shopName}</strong> has been registered.
        </p>
        <p className="text-muted-foreground text-sm mb-6">
          Your shop is currently <strong>unverified</strong>. Our admin team will
          review and approve your shop shortly. You&apos;ll receive an email once
          approved.
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => router.push("/seller/login")}>
            Go to Seller Login
          </Button>
          <Button variant="outline" onClick={() => router.push("/")}>
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  // ── Registration form ──
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-[580px] mx-auto">
        {/* Header */}
        <div className="bg-white rounded-t-xl shadow-sm border border-b-0 border-gray-200 px-8 pt-8 pb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
              <Store className="size-5 text-indigo-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Register Your Shop
            </h1>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-b-xl shadow-sm border border-gray-200 px-8 pb-8">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 mb-6 flex items-start gap-2">
              <AlertCircle className="size-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-7">
            {/* ─── Personal Info ─── */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
                Personal Info
              </h2>
              <div className="space-y-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="fullName" className="text-sm font-medium text-gray-700">
                    Your Name
                  </Label>
                  <Input
                    id="fullName"
                    placeholder="Full Name"
                    value={form.fullName}
                    onChange={(e) => updateField("fullName", e.target.value)}
                    required
                    className="h-11 bg-white border-gray-300"
                  />
                </div>

                {/* Email + OTP */}
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Your Email
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="email"
                      type="email"
                      placeholder="Email"
                      value={form.email}
                      onChange={(e) => {
                        updateField("email", e.target.value);
                        if (otpVerified) {
                          setOtpVerified(false);
                          setOtpSent(false);
                          setOtpCode("");
                        }
                      }}
                      required
                      disabled={otpVerified}
                      className="h-11 flex-1 bg-white border-gray-300"
                    />
                    <Button
                      type="button"
                      variant={otpVerified ? "default" : "outline"}
                      onClick={handleSendOtp}
                      disabled={
                        otpLoading || otpCooldown > 0 || otpVerified || !form.email.trim()
                      }
                      className="h-11 px-4 shrink-0"
                    >
                      {otpVerified ? (
                        <span className="flex items-center gap-1.5">
                          <CheckCircle className="size-4" /> Verified
                        </span>
                      ) : otpLoading ? (
                        <RefreshCw className="size-4 animate-spin" />
                      ) : otpCooldown > 0 ? (
                        `${otpCooldown}s`
                      ) : otpSent ? (
                        "Resend OTP"
                      ) : (
                        "Get OTP"
                      )}
                    </Button>
                  </div>
                </div>

                {/* OTP Input */}
                {otpSent && !otpVerified && (
                  <div className="space-y-1.5">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Verification Code (OTP)"
                        value={otpCode}
                        onChange={(e) =>
                          setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                        }
                        maxLength={6}
                        className="h-11 flex-1 bg-white border-gray-300"
                      />
                      <Button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={otpLoading || otpCode.length < 6}
                        className="h-11 px-4"
                      >
                        {otpLoading ? (
                          <RefreshCw className="size-4 animate-spin" />
                        ) : (
                          "Verify"
                        )}
                      </Button>
                    </div>
                    {otpError && (
                      <p className="text-xs text-red-600">{otpError}</p>
                    )}
                  </div>
                )}

                {/* Phone */}
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-sm font-medium text-red-500">
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Your phone number"
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    required
                    className="h-11 bg-white border-gray-300"
                  />
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={form.password}
                      onChange={(e) => updateField("password", e.target.value)}
                      required
                      minLength={6}
                      className="h-11 bg-white border-gray-300 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Password must contain at least 6 digits.
                  </p>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm Password"
                      value={form.confirmPassword}
                      onChange={(e) =>
                        updateField("confirmPassword", e.target.value)
                      }
                      required
                      minLength={6}
                      className="h-11 bg-white border-gray-300 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Transaction Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="txPassword" className="text-sm font-medium text-gray-700">
                    Transaction Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="txPassword"
                      type={showTxPassword ? "text" : "password"}
                      placeholder="Transaction Password (6 digits)"
                      value={form.transactionPassword}
                      onChange={(e) =>
                        updateField(
                          "transactionPassword",
                          e.target.value.replace(/\D/g, "").slice(0, 6)
                        )
                      }
                      maxLength={6}
                      required
                      className="h-11 bg-white border-gray-300 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowTxPassword(!showTxPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showTxPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Repeat Transaction Password */}
                <div className="space-y-1.5">
                  <Label htmlFor="txConfirmPassword" className="text-sm font-medium text-gray-700">
                    Repeat Transaction Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="txConfirmPassword"
                      type={showTxConfirmPassword ? "text" : "password"}
                      placeholder="Repeat Transaction Password"
                      value={form.confirmTransactionPassword}
                      onChange={(e) =>
                        updateField(
                          "confirmTransactionPassword",
                          e.target.value.replace(/\D/g, "").slice(0, 6)
                        )
                      }
                      maxLength={6}
                      required
                      className="h-11 bg-white border-gray-300 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowTxConfirmPassword(!showTxConfirmPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showTxConfirmPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── Basic Info ─── */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
                Basic Info
              </h2>
              <div className="space-y-4">
                {/* Shop Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="shopName" className="text-sm font-medium text-gray-700">
                    Shop Name
                  </Label>
                  <Input
                    id="shopName"
                    placeholder="Shop Name"
                    value={form.shopName}
                    onChange={(e) => updateField("shopName", e.target.value)}
                    required
                    className="h-11 bg-white border-gray-300"
                  />
                </div>

                {/* Address */}
                <div className="space-y-1.5">
                  <Label htmlFor="address" className="text-sm font-medium text-gray-700">
                    Address
                  </Label>
                  <Input
                    id="address"
                    placeholder="Address"
                    value={form.address}
                    onChange={(e) => updateField("address", e.target.value)}
                    className="h-11 bg-white border-gray-300"
                  />
                </div>
              </div>
            </div>

            {/* ─── Certificates Type ─── */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
                Certificates Type
              </h2>
              <div className="space-y-4">
                {/* Certificate Type Selector */}
                <div className="space-y-1.5">
                  <Select
                    value={form.certificateType}
                    onValueChange={(val) => updateField("certificateType", val)}
                  >
                    <SelectTrigger className="h-11 bg-white border-gray-300">
                      <SelectValue placeholder="Select certificate type" />
                    </SelectTrigger>
                    <SelectContent>
                      {CERTIFICATE_TYPES.map((ct) => (
                        <SelectItem key={ct.value} value={ct.value}>
                          {ct.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Certificate Front */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-indigo-600">
                    Certificate Front
                  </Label>
                  <FileUploadField
                    file={certFrontFile}
                    onChange={setCertFrontFile}
                    placeholder="Choose File"
                  />
                </div>

                {/* Certificate Back */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-indigo-600">
                    Certificate Back
                  </Label>
                  <FileUploadField
                    file={certBackFile}
                    onChange={setCertBackFile}
                    placeholder="Choose File"
                  />
                </div>
              </div>
            </div>

            {/* ─── Invitation Code ─── */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
                Invitation Code
              </h2>
              <div className="space-y-1.5">
                <Input
                  id="invitationCode"
                  placeholder="Invitation Code"
                  value={form.invitationCode}
                  onChange={(e) => updateField("invitationCode", e.target.value)}
                  className="h-11 bg-white border-gray-300"
                />
              </div>
            </div>

            {/* ─── reCAPTCHA ─── */}
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

            {/* ─── Submit ─── */}
            <Button
              type="submit"
              className="w-full h-12 bg-red-500 hover:bg-red-600 text-white font-bold tracking-wide uppercase rounded-lg text-sm"
              disabled={loading}
            >
              {loading ? (
                <>
                  <RefreshCw className="size-4 animate-spin mr-2" />
                  Registering...
                </>
              ) : (
                "Register Your Shop"
              )}
            </Button>

            {/* Back link */}
            <div className="text-center">
              <Link
                href="/"
                className="text-sm text-gray-500 hover:text-gray-700 hover:underline"
              >
                Back to Previous Page
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── File upload field (mimics the screenshot style) ──
function FileUploadField({
  file,
  onChange,
  placeholder,
}: {
  file: File | null;
  onChange: (f: File | null) => void;
  placeholder: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center border border-gray-300 rounded-md overflow-hidden h-11">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onChange(f);
        }}
      />
      <div className="flex-1 px-3 text-sm text-gray-500 truncate">
        {file ? file.name : placeholder}
      </div>
      {file ? (
        <button
          type="button"
          onClick={() => {
            onChange(null);
            if (inputRef.current) inputRef.current.value = "";
          }}
          className="h-full px-3 text-gray-400 hover:text-red-500"
        >
          <X className="size-4" />
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="h-full px-4 bg-gray-100 border-l border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors flex items-center gap-1.5"
      >
        <Upload className="size-3.5" />
        Browse
      </button>
    </div>
  );
}
