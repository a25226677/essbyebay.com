"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, ShieldCheck, Zap, Lock, Mail } from "lucide-react";

const DEMO_EMAIL = "admin@demo.com";
const DEMO_PASSWORD = "Admin@123456";

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect already-logged-in admins
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.session.user.id)
          .maybeSingle();
        if (profile?.role === "admin") {
          router.replace("/admin/dashboard");
        }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show errors from middleware redirect (e.g. ?error=not_admin)
  useEffect(() => {
    const errParam = searchParams.get("error");
    if (errParam === "not_admin") {
      setError("This account does not have admin access.");
    } else if (errParam) {
      setError(decodeURIComponent(errParam));
    }
  }, [searchParams]);

  const fillDemo = () => {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setError("");
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
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
        setError("This account does not have admin access. Make sure the admin seed SQL has been run in Supabase.");
        setLoading(false);
        return;
      }

      router.push("/admin/dashboard");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unexpected error. Check your network and Supabase config.";
      setError(msg);
      setLoading(false);
    }
  };

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
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-500/20 border border-blue-500/30 rounded-2xl mb-3">
            <ShieldCheck className="size-7 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Admin Portal</h1>
          <p className="text-sm text-gray-400 mt-1">Sign in to access the dashboard</p>
        </div>

        {/* Demo Credentials Banner */}
        <div className="bg-teal-500/10 border border-teal-500/30 rounded-xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-teal-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Zap className="size-3" /> Demo Credentials
              </p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Mail className="size-3 text-gray-400 shrink-0" />
                  <code className="text-xs text-gray-200 font-mono">{DEMO_EMAIL}</code>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="size-3 text-gray-400 shrink-0" />
                  <code className="text-xs text-gray-200 font-mono">{DEMO_PASSWORD}</code>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={fillDemo}
              className="shrink-0 text-xs px-3 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-semibold transition-colors flex items-center gap-1.5"
            >
              <Zap className="size-3" /> Use Demo
            </button>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl p-7 shadow-2xl">
          {error && (
            <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={onSubmit}>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-gray-300 uppercase tracking-wide">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@demo.com"
                  required
                  className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500 focus:ring-blue-500/20 h-11"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium text-gray-300 uppercase tracking-wide">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="pl-9 pr-10 bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-blue-500 focus:ring-blue-500/20 h-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-colors"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <ShieldCheck className="size-4" /> Sign In to Dashboard
                </span>
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-600">
          Admin access only · Unauthorized access is prohibited
        </p>
      </div>
    </div>
  );
}
