"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Grid3X3, ShoppingCart, Bell, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";

export function MobileBottomNav() {
  const pathname = usePathname();
  const totalItems = useCartStore((s) => s.totalItems);
  const [mounted, setMounted] = React.useState(false);
  const [accountHref, setAccountHref] = React.useState("/users/login");
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const supabase = createClient();
    const loadRole = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        setIsLoggedIn(true);
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.session.user.id)
          .maybeSingle();
        if (profile?.role === "admin") setAccountHref("/admin/dashboard");
        else if (profile?.role === "seller") setAccountHref("/seller/dashboard");
        else setAccountHref("/account");
      } else {
        setIsLoggedIn(false);
        setAccountHref("/users/login");
      }
    };
    loadRole();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setIsLoggedIn(true);
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle();
        if (profile?.role === "admin") setAccountHref("/admin/dashboard");
        else if (profile?.role === "seller") setAccountHref("/seller/dashboard");
        else setAccountHref("/account");
      } else {
        setIsLoggedIn(false);
        setAccountHref("/users/login");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const items = [
    { href: "/", label: "Home", icon: Home },
    { href: "/categories", label: "Categories", icon: Grid3X3 },
    { href: "/cart", label: "Cart", icon: ShoppingCart, showBadge: true },
    { href: "#", label: "Alerts", icon: Bell },
    { href: accountHref, label: isLoggedIn ? "Account" : "Login", icon: User },
  ];

  return (
    <nav className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-50 bg-[#1b233a] border-t border-[#2a3350] md:hidden">
      <div className="flex items-center justify-around h-14">
        {items.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : item.href !== "#" && pathname.startsWith(item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full transition-colors",
                isActive ? "text-[#f77f00]" : "text-gray-400"
              )}
            >
              <div className="relative">
                <item.icon size={20} />
                {item.showBadge && mounted && totalItems() > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-[#f77f00] text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-medium">
                    {totalItems()}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
