"use client";

import Link from "next/link";
import Image from "next/image";
import { Bell, Globe, Printer, Menu, LogOut, User, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useUserData } from "@/lib/hooks/use-user-data";
import { useState, useRef, useEffect } from "react";

interface SellerHeaderProps {
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
}

export function SellerHeader({ onToggleSidebar, sidebarOpen }: SellerHeaderProps) {
  const { user: profile } = useUserData();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const displayName = profile.shopName || profile.fullName || "My Shop";
  const avatarUrl = profile.shopLogoUrl || profile.avatarUrl || "/logo.png";
  const balance = profile.balance;

  const handleSignOut = async () => {
    setUserMenuOpen(false);
    const res = await fetch("/api/auth/signout?next=/seller/login", { method: "POST" });
    window.location.href = res.ok ? res.url : "/seller/login";
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node))
        setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-md hover:bg-gray-100 lg:hidden"
        >
          <Menu className="size-5 text-gray-600" />
        </button>
        <div className="flex items-center gap-2">
          <Link
            href="/seller/dashboard"
            className="hidden sm:flex items-center"
            title="ESS by eBay"
          >
            <Image src="/logo.png" alt="ESS by eBay" width={124} height={30} className="h-8 w-auto object-contain" priority />
          </Link>
          <button
            onClick={onToggleSidebar}
            className={`p-2 rounded-full transition-colors ${!sidebarOpen ? "bg-sky-100 text-sky-600" : "hover:bg-gray-100 text-gray-600"}`}
            title="Toggle sidebar"
          >
            <Menu className="size-4" />
          </button>
          <Link
            href="/"
            className="p-2 rounded-full bg-sky-500 text-white hover:bg-sky-600 flex items-center justify-center"
            title="Open storefront"
          >
            <Globe className="size-4" />
          </Link>
          <button
            onClick={() => toast.info("POS is turned off", { description: "The Point of Sale system is currently disabled." })}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
            title="POS"
          >
            <Printer className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/seller/withdraw"
          className="flex items-center gap-1.5 text-sm text-sky-600 font-medium"
        >
          <span>💰</span>
          Balance: ${balance.toFixed(2)}
        </Link>
        <Link
          href="/seller/withdraw"
          className="flex items-center gap-1.5 text-sm text-amber-600 font-medium"
        >
          <span>🛡️</span>
          Guarantee Money: ${(profile.guaranteeMoney ?? 0).toFixed(2)}
        </Link>
        <button className="relative p-2 rounded-full hover:bg-gray-100 text-gray-600">
          <Bell className="size-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen((o) => !o)}
              className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-gray-100 transition-colors"
            >
              <div className="size-8 bg-sky-100 rounded-full flex items-center justify-center overflow-hidden">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={displayName}
                    width={32}
                    height={32}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <span className="text-sky-600 font-bold text-sm">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium text-gray-800">{displayName}</p>
                <p
                  className="text-[10px] text-gray-500 truncate max-w-[180px]"
                  title={profile.email || "Email not available"}
                >
                  {profile.email || "Email not available"}
                </p>
              </div>
              <ChevronDown className="size-3.5 text-gray-400 hidden sm:block" />
            </button>

            {/* Dropdown */}
            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-50">
                <Link
                  href="/account"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700 transition-colors"
                >
                  <User className="size-4 text-gray-400" />
                  My Account
                </Link>
                <Link
                  href="/"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700 transition-colors"
                >
                  <Globe className="size-4 text-gray-400" />
                  View Storefront
                </Link>
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-red-50 text-sm text-red-600 transition-colors"
                >
                  <LogOut className="size-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
