"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, ShieldCheck, Lock, Mail, AlertCircle } from "lucide-react";

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

  // Redirect already-logged-in admins
  useEffect(() => {
    const supabase = createClient();
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (data.session?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", data.session.user.id)
            .maybeSingle();
          if (profile?.role === "admin") {
            router.replace("/admin/dashboard");
            return;
          }
        }
        setCheckingSession(false);
      })
      .catch(() => setCheckingSession(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show errors from middleware redirect (e.g. ?error=not_admin)
  useEffect(() => {
    const errParam = searchParams.get("error");
    if (errParam === "not_admin") {
      setError("This account does not have admin privileges.");
    } else if (errParam) {
      setError(decodeURIComponent(errParam));
    }
  }, [searchParams]);

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
        // Map Supabase errors to user-friendly messages
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a2238] via-[#1e2a42] to-[#0f172a]">
        <div className="w-8 h-8 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a2238] via-[#1e2a42] to-[#0f172a] px-4 py-12">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md space-y-4">
        {/* Logo / Brand */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500/20 border border-blue-500/30 rounded-2xl mb-4 shadow-lg shadow-blue-500/10">
            <ShieldCheck className="size-8 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Admin Portal</h1>
          <p className="text-sm text-gray-400 mt-1">Secure access to the management dashboard</p>
        </div>

        {/* Dev-only Demo Credentials Banner — completely stripped from production builds */}
        {IS_DEV && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
            <p className="text-[11px] font-medium text-amber-400 text-center">
              Development Mode — Demo: admin@demo.com / Admin@123456
            </p>
          </div>
        )}

        {/* Login Card */}
        <div className="bg-white/[0.04] border border-white/10 backdrop-blur-sm rounded-2xl p-7 shadow-2xl">
          {error && (
            <div className="mb-5 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 flex items-start gap-2.5">
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
                  placeholder="you@company.com"
                  required
                  disabled={loading}
                  className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500 focus:ring-blue-500/20 h-11 disabled:opacity-50"
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
                  className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors font-medium"
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
                  className="pl-9 pr-10 bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500 focus:ring-blue-500/20 h-11 disabled:opacity-50"
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
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-colors disabled:opacity-60"
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

        {/* Footer */}
        <div className="text-center space-y-1 pt-2">
          <p className="text-xs text-gray-500">
            Restricted area — Authorized personnel only
          </p>
          <p className="text-[11px] text-gray-700">
            &copy; {new Date().getFullYear()} All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
}
