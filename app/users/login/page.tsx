"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import ReCAPTCHA from "react-google-recaptcha";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Redirect already-logged-in users away
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .maybeSingle();
        if (profile?.role === "admin") router.replace("/admin/dashboard");
        else if (profile?.role === "seller") router.replace("/seller/dashboard");
        else router.replace("/account");
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Read errors / success from query params
  useEffect(() => {
    const errParam = searchParams.get("error");
    if (errParam) setError(decodeURIComponent(errParam));
    if (searchParams.get("registered") === "true")
      setSuccessMsg("Account created! Please log in.");
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!captchaVerified) {
      setError("Please complete the CAPTCHA verification.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      recaptchaRef.current?.reset();
      setCaptchaVerified(false);
      setLoading(false);
    } else {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      const next = searchParams.get("next");
      if (next?.startsWith("/")) {
        router.push(next);
      } else if (profile?.role === "admin") {
        router.push("/admin/dashboard");
      } else if (profile?.role === "seller") {
        router.push("/seller/dashboard");
      } else {
        router.push("/account");
      }

      setLoading(false);
      router.refresh();
    }
  };

  return (
    <div className="min-h-[65vh] flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-sm p-8 space-y-5">
          {/* Heading */}
          <h1 className="text-3xl font-extrabold text-center text-gray-900">
            Login to your account.
          </h1>

          {/* Success */}
          {successMsg && (
            <div className="bg-green-50 text-green-700 text-sm rounded-md p-3">
              {successMsg}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-md p-3">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <Input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 bg-[#eef0f8] border-transparent focus:border-gray-300 focus:bg-white placeholder:text-gray-400"
            />

            {/* Password */}
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 bg-[#eef0f8] border-transparent focus:border-gray-300 focus:bg-white placeholder:text-gray-400 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Remember Me + Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={rememberMe}
                  onCheckedChange={(v) => setRememberMe(!!v)}
                  className="border-gray-400"
                />
                <span className="text-sm text-gray-500">Remember Me</span>
              </label>
              <Link
                href="/password/reset"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Forgot password?
              </Link>
            </div>

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

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-red-500 hover:bg-red-600 text-white font-bold tracking-widest uppercase rounded-lg text-sm"
            >
              {loading ? "Signing in…" : "Login"}
            </Button>
          </form>

          {/* Register link */}
          <p className="text-sm text-center text-gray-400">
            Dont have an account?{" "}
            <Link
              href="/users/registration"
              className="text-red-500 font-semibold hover:underline"
            >
              Register Now
            </Link>
          </p>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-gray-400">other portals</span>
            </div>
          </div>

          {/* Portal links */}
          <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
            <Link href="/seller/login" className="hover:text-orange-500 transition-colors font-medium">
              Seller Portal →
            </Link>
            <span>|</span>
            <Link href="/admin/login" className="hover:text-indigo-600 transition-colors font-medium">
              Admin Portal →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
