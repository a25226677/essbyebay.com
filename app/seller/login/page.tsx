"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff } from "lucide-react";

export default function SellerLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect already-logged-in sellers/admins
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.session.user.id)
          .maybeSingle();
        if (profile?.role === "seller" || profile?.role === "admin") {
          router.replace("/seller/dashboard");
        }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const errParam = searchParams.get("error");
    if (errParam === "not_seller") {
      setError("This account does not have seller access.");
    } else if (errParam) {
      setError(decodeURIComponent(errParam));
    }
    if (searchParams.get("registered") === "true")
      setSuccessMsg("Seller account created! Please log in.");
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profile?.role !== "seller" && profile?.role !== "admin") {
        await supabase.auth.signOut();
        setError("This account is not a seller account.");
        setLoading(false);
        return;
      }

      router.push("/seller/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="min-h-[65vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 md:p-10">
          <h1 className="text-2xl font-bold text-center mb-6">
            Seller Portal Login
          </h1>

          {successMsg && (
            <div className="bg-green-50 text-green-700 text-sm rounded-md p-3 mb-4">
              {successMsg}
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm rounded-md p-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Input
                id="email"
                type="email"
                placeholder="a25226677@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 bg-gray-50 border-gray-200"
              />
            </div>

            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 bg-blue-50/50 border-blue-200"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) =>
                    setRememberMe(checked as boolean)
                  }
                />
                <Label
                  htmlFor="remember"
                  className="text-sm text-gray-600 cursor-pointer"
                >
                  Remember Me
                </Label>
              </div>
              <Link
                href="/password/reset"
                className="text-sm text-gray-600 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            {/* reCAPTCHA placeholder */}
            <div className="border border-gray-200 rounded-md p-3 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-6 border-2 border-gray-300 rounded-sm" />
                <span className="text-sm text-gray-700">
                  I&apos;m not a robot
                </span>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-500">reCAPTCHA</p>
                <p className="text-[8px] text-gray-400">Privacy - Terms</p>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-red-500 hover:bg-red-600 text-white text-base font-bold uppercase tracking-wide"
              disabled={loading}
            >
              {loading ? "Signing in…" : "LOGIN"}
            </Button>
          </form>

          <div className="text-center mt-6">
            <p className="text-sm text-gray-500">Dont have an account?</p>
            <Link
              href="/users/registration"
              className="text-sm text-red-500 font-medium hover:underline"
            >
              Register Now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
