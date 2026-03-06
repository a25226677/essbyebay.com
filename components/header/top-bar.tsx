"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const languages = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "pt-pt", name: "Portuguese (Portugal)", flag: "🇵🇹" },
  { code: "pt-br", name: "Portuguese (Brazil)", flag: "🇧🇷" },
  { code: "pl", name: "Polish", flag: "🇵🇱" },
  { code: "hu", name: "Hungarian", flag: "🇭🇺" },
  { code: "no", name: "Norwegian", flag: "🇳🇴" },
  { code: "cs", name: "Czech", flag: "🇨🇿" },
  { code: "sl", name: "Slovenian", flag: "🇸🇮" },
  { code: "sk", name: "Slovakian", flag: "🇸🇰" },
];

export function TopBar() {
  const router = useRouter();
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState(languages[0]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();

    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      setIsLoggedIn(!!data.session);
      if (data.session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.session.user.id)
          .maybeSingle();
        setUserRole(profile?.role ?? null);
      }
    };
    loadSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setIsLoggedIn(!!session);
      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle();
        setUserRole(profile?.role ?? null);
      } else {
        setUserRole(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUserRole(null);
    setIsLoggedIn(false);
    toast.success("Signed out successfully");
    router.push("/");
    router.refresh();
  };

  // Derive helper flags
  const isAdmin = userRole === "admin";
  const isSeller = userRole === "seller" || userRole === "admin";
  const showSellLink = userRole !== "admin";
  const dashboardHref = isAdmin
    ? "/admin/dashboard"
    : isSeller
    ? "/seller/dashboard"
    : "/account";
  const dashboardLabel = isAdmin
    ? "Admin Panel"
    : isSeller
    ? "Seller Panel"
    : "My Account";

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setLangDropdownOpen(false);
      }
    };

    if (langDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [langDropdownOpen]);

  return (
    <div className="hidden lg:block bg-[#171f2f] border-b border-[#2a3348]">
      <div className="max-w-[1340px] mx-auto px-4 h-[46px] flex items-center justify-between text-sm text-gray-300">
        {/* Left - Language Selector */}
        <div className="flex items-center" ref={dropdownRef}>
          <button 
            onClick={() => setLangDropdownOpen(!langDropdownOpen)}
            className="h-[46px] px-4 border-x border-[#2a3348] flex items-center gap-2 hover:text-white transition-colors"
          >
            <span className="text-base">{selectedLang.flag}</span>
            <span>{selectedLang.name}</span>
            <ChevronDown size={12} className={`transition-transform duration-200 ${
              langDropdownOpen ? "rotate-180" : ""
            }`} />
          </button>

          {/* Language Dropdown */}
          {langDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-[240px] bg-white rounded-md shadow-xl z-[100] border border-gray-200 max-h-[320px] overflow-y-auto">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setSelectedLang(lang);
                    setLangDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-gray-700 text-sm border-b border-gray-100 last:border-0"
                >
                  <span className="text-xl">{lang.flag}</span>
                  <span className="text-sm">{lang.name}</span>
                </button>
              ))}
            </div>
          )}

          <Link 
            href="/today-deals" 
            className="h-[46px] px-5 flex items-center hover:text-white transition-colors border-r border-[#2a3348]"
          >
            Today&apos;s Deals
          </Link>
          <Link 
            href="/brands" 
            className="h-[46px] px-4 flex items-center hover:text-white transition-colors"
          >
            Brands
          </Link>
        </div>

        {/* Right - Links */}
        <div className="flex items-center gap-6 text-[12px]">
          {showSellLink && (
            <Link 
              href={isSeller ? "/seller/dashboard" : "/shop/create"} 
              className="hover:text-white transition-colors"
            >
              Sell
            </Link>
          )}
          {isLoggedIn ? (
            <>
              <Link
                href={dashboardHref}
                className="hover:text-white transition-colors font-medium"
              >
                {dashboardLabel}
              </Link>
              <button
                onClick={handleLogout}
                className="hover:text-red-300 transition-colors cursor-pointer text-red-400"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link 
                href="/users/login" 
                className="hover:text-white transition-colors"
              >
                Login
              </Link>
              <Link
                href="/users/registration"
                className="hover:text-white transition-colors"
              >
                Registration
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
