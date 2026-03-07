"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, ShieldCheck, Lock, Mail, AlertCircle, LogOut, Store } from "lucide-react";
import { toast, Toaster } from "sonner";

const IS_DEV = process.env.NODE_ENV === "development";

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [nonAdminUser, setNonAdminUser] = useState<{ email: string; role: string } | null>(null);

  // Redirect already-logged-in admins; detect non-admin users
  useEffect(() => {
    const supabase = createClient();
    supabase.auth
      .getUser()
      .then(async ({ data }) => {
        if (data.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", data.user.id)
            .maybeSingle();

          if (profile?.role === "admin") {
            router.replace("/admin/dashboard");
            return;
          }

          // Non-admin user is logged in — show info card instead of form
          const errParam = searchParams.get("error");
          if (errParam === "not_admin" || profile?.role) {
            setNonAdminUser({
              email: data.user.email || "",
              role: profile?.role || "user",
            });
          }
        }
        setCheckingSession(false);
      })
      .catch(() => setCheckingSession(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show errors from middleware redirect
  useEffect(() => {
    const errParam = searchParams.get("error");
    if (errParam === "not_admin") {
      setError("This account does not have admin privileges.");
    } else if (errParam) {
      setError(decodeURIComponent(errParam));
    }
  }, [searchParams]);

  const handleSignOutAndReset = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setNonAdminUser(null);
    setError("");
    toast.success("Signed out successfully");
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        const msg = signInError.message.toLowerCase();
        if (msg.includes("invalid login")) {
          setError("Invalid email or password. Please try again.");
        } else if (msg.includes("email not confirmed")) {
          setError("Your email address has not been verified. Please check your inbox.");
        } else if (msg.includes("too many requests") || msg.includes("rate limit")) {
          setError("Too many login attempts. Please wait a moment and try again.");
        } else {
          setError(signInError.message);
        }
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      if (!profile || profile.role !== "admin") {
        await supabase.auth.signOut();
        setError("This account does not have admin privileges.");
        setLoading(false);
        return;
      }

      toast.success("Welcome back, Admin!");
      router.push("/admin/dashboard");
      router.refresh();
    } catch {
      setError("Unable to connect. Please check your internet connection and try again.");
      setLoading(false);
    }
  };

  // Show a clean loading state while checking existing session
  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0c1220] via-[#141e33] to-[#0a1628]">
        <Toaster position="top-right" richColors />
        <div className="w-8 h-8 border-2 border-orange-400/30 border-t-orange-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0c1220] via-[#141e33] to-[#0a1628] px-4 py-12">
      <Toaster position="top-right" richColors />

      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-500/8 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-500/8 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-orange-600/5 to-blue-600/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-[420px] space-y-5">
        {/* Logo / Brand */}
        <div className="text-center mb-2">
          <div className="inline-flex items-center justify-center w-[72px] h-[72px] bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/20 rounded-2xl mb-5 shadow-lg shadow-orange-500/5">
            <ShieldCheck className="size-9 text-orange-400" />
          </div>
          <h1 className="text-[26px] font-bold text-white tracking-tight">Admin Portal</h1>
          <p className="text-sm text-gray-400 mt-1.5">Secure access to the management dashboard</p>
        </div>

        {/* Non-admin user already logged in — show clear message */}
        {nonAdminUser ? (
          <div className="bg-white/[0.04] border border-white/10 backdrop-blur-sm rounded-2xl p-7 shadow-2xl space-y-5">
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-5 py-4 text-center space-y-2">
              <AlertCircle className="size-6 text-red-400 mx-auto" />
              <p className="text-sm font-semibold text-red-400">Access Denied</p>
              <p className="text-xs text-red-400/80">
                <span className="font-medium text-white/70">{nonAdminUser.email}</span> is signed in as{" "}
                <span className="capitalize font-medium text-white/70">{nonAdminUser.role}</span> — not an admin.
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleSignOutAndReset}
                variant="outline"
                className="w-full h-11 bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white font-medium text-sm rounded-xl"
              >
                <LogOut className="size-4 mr-2" />
                Sign Out &amp; Login as Admin
              </Button>

              <Button
                onClick={() => router.push(nonAdminUser.role === "seller" ? "/seller/dashboard" : "/account")}
                className="w-full h-11 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium text-sm rounded-xl border-0"
              >
                <Store className="size-4 mr-2" />
                {nonAdminUser.role === "seller" ? "Go to Seller Dashboard" : "Go to My Account"}
              </Button>
            </div>

            <p className="text-center text-[11px] text-gray-600">
              Need admin access?{" "}
              <Link href="/support" className="text-orange-400 hover:text-orange-300 font-medium">
                Contact Support
              </Link>
            </p>
          </div>
        ) : (
          <>
            {/* Dev-only Demo Credentials Banner */}
            {IS_DEV && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                <p className="text-[11px] font-medium text-amber-400 text-center">
                  Development Mode — Demo: admin@demo.com / Admin@123456
                </p>
              </div>
            )}

            {/* Login Card */}
            <div className="bg-white/[0.04] border border-white/10 backdrop-blur-sm rounded-2xl p-7 shadow-2xl">
              {error && (
                <div className="mb-5 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 flex items-start gap-2.5">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form className="space-y-5" onSubmit={onSubmit} noValidate>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium text-gray-300 uppercase tracking-wide">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@company.com"
                      required
                      disabled={loading}
                      className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-orange-500 focus:ring-orange-500/20 h-11 disabled:opacity-50 rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-medium text-gray-300 uppercase tracking-wide">
                      Password
                    </Label>
                    <Link
                      href="/password/reset"
                      className="text-[11px] text-orange-400 hover:text-orange-300 transition-colors font-medium"
                      tabIndex={-1}
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      disabled={loading}
                      className="pl-9 pr-10 bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-orange-500 focus:ring-orange-500/20 h-11 disabled:opacity-50 rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold text-sm rounded-xl transition-all disabled:opacity-60 shadow-lg shadow-orange-500/20 border-0"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signing in…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="size-4" /> Sign In
                    </span>
                  )}
                </Button>
              </form>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="text-center space-y-2 pt-1">
          <div className="flex items-center justify-center gap-4 text-[11px]">
            <Link href="/" className="text-gray-500 hover:text-orange-400 transition-colors">
              Home
            </Link>
            <span className="text-gray-700">|</span>
            <Link href="/seller/login" className="text-gray-500 hover:text-orange-400 transition-colors">
              Seller Login
            </Link>
            <span className="text-gray-700">|</span>
            <Link href="/support-policy" className="text-gray-500 hover:text-orange-400 transition-colors">
              Support
            </Link>
          </div>
          <p className="text-[11px] text-gray-700">
            &copy; {new Date().getFullYear()} eSellerStoreBay — All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
}
