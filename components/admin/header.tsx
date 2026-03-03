"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import {
  Bell,
  Search,
  ChevronDown,
  LogOut,
  User,
  RefreshCw,
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
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  };

  const refresh = async () => {
    setRefreshing(true);
    router.refresh();
    await new Promise((r) => setTimeout(r, 1000));
    setRefreshing(false);
  };

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center px-6 gap-4 sticky top-0 z-30 shadow-sm">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus-within:border-indigo-400 focus-within:bg-white transition-all">
          <Search className="size-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search anything…"
            className="bg-transparent text-sm text-gray-700 placeholder:text-gray-400 outline-none w-full"
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Refresh */}
        <button
          onClick={refresh}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500 hover:text-indigo-600"
          title="Refresh page"
        >
          <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>

        {/* Notifications */}
        <button className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500 hover:text-indigo-600">
          <Bell className="size-4" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
        </button>

        {/* Language */}
        <div ref={langRef} className="relative">
          <button
            onClick={() => setLangOpen((o) => !o)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors text-sm text-gray-600"
          >
            <span className="text-base leading-none">{lang.flag}</span>
            <span className="font-medium">{lang.label}</span>
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

        {/* User avatar */}
        <div ref={userRef} className="relative">
          <button
            onClick={() => setUserOpen((o) => !o)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow"
              style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}>
              A
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-gray-800 leading-tight">Admin</p>
              <p className="text-[10px] text-gray-400 leading-tight">Administrator</p>
            </div>
            <ChevronDown className="size-3 text-gray-400" />
          </button>
          {userOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-50">
              <button className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors text-gray-700">
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
