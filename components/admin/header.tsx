"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import {
  Bell,
  ChevronDown,
  LogOut,
  User,
  RotateCcw,
  Printer,
  Menu,
  Trash2,
  ShoppingBag,
} from "lucide-react";

const LANGUAGES = [
  { code: "en", label: "EN", flag: "🇺🇸" },
  { code: "es", label: "ES", flag: "🇪🇸" },
  { code: "fr", label: "FR", flag: "🇫🇷" },
];

export function AdminHeader() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [lang, setLang] = useState(LANGUAGES[0]);
  const [langOpen, setLangOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node))
        setLangOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node))
        setUserOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const signOut = async () => {
    setUserOpen(false);
    try {
      await fetch("/api/auth/signout?next=/admin/login", { method: "POST" });
    } finally {
      window.location.href = "/admin/login";
    }
  };

  const clearCache = async () => {
    setRefreshing(true);
    router.refresh();
    await new Promise((r) => setTimeout(r, 1200));
    setRefreshing(false);
  };

  const goToProfile = () => {
    setUserOpen(false);
    router.push("/admin/settings");
  };

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center px-4 gap-2 sticky top-0 z-30 shadow-sm">
      {/* Left Actions */}
      <div className="flex items-center gap-1">
        <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
          <Menu className="size-5" />
        </button>
        <button
          onClick={() => router.refresh()}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
          title="Refresh"
        >
          <RotateCcw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
        <button
          onClick={() => window.print()}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
          title="Print"
        >
          <Printer className="size-4" />
        </button>
        <button
          onClick={clearCache}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ml-1 text-white"
          style={{
            background: refreshing
              ? "#fca5a5"
              : "linear-gradient(135deg,#fb7185,#f43f5e)",
            opacity: refreshing ? 0.7 : 1,
          }}
        >
          <Trash2 className="size-3.5" />
          {refreshing ? "Clearing…" : "Clear Cache"}
        </button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right Actions */}
      <div className="flex items-center gap-1">
        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
          <Bell className="size-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
        </button>

        {/* Language */}
        <div ref={langRef} className="relative">
          <button
            onClick={() => setLangOpen((o) => !o)}
            className="flex items-center gap-1 px-2 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span className="text-lg leading-none">{lang.flag}</span>
            <ChevronDown className="size-3 text-gray-400" />
          </button>
          {langOpen && (
            <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-50">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => { setLang(l); setLangOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors text-left"
                >
                  <span>{l.flag}</span>
                  <span className="text-gray-700">{l.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User */}
        <div ref={userRef} className="relative">
          <button
            onClick={() => setUserOpen((o) => !o)}
            className="flex items-center gap-2 pl-2 pr-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white shadow"
              style={{ background: "linear-gradient(135deg,#f43f5e,#fb923c)" }}
            >
              <ShoppingBag className="size-4" />
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-gray-800 leading-tight">Admin</p>
              <p className="text-[10px] text-gray-400 leading-tight">admin</p>
            </div>
            <ChevronDown className="size-3 text-gray-400" />
          </button>
          {userOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-50">
              <button
                onClick={goToProfile}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors text-gray-700"
              >
                <User className="size-4 text-gray-400" />
                My Profile
              </button>
              <div className="my-1 border-t border-gray-100" />
              <button
                onClick={signOut}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-rose-50 transition-colors text-rose-600"
              >
                <LogOut className="size-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
