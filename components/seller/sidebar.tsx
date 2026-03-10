"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUserData } from "@/lib/hooks/use-user-data";
import {
  LayoutDashboard,
  Package,
  ChevronDown,
  Warehouse,
  FileUp,
  ShoppingCart,
  Settings,
  Clock,
  Wallet,
  BarChart3,
  MessageSquare,
  HelpCircle,
  Search,
} from "lucide-react";

type SidebarLink =
  | {
      label: string;
      href: string;
      icon: React.ComponentType<{ className?: string }>;
      badge?: number;
      children?: never;
    }
  | {
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      children: { label: string; href: string }[];
      href?: never;
      badge?: number;
    };

const sidebarLinks: SidebarLink[] = [
  {
    label: "Dashboard",
    href: "/seller/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Products",
    icon: Package,
    children: [
      { label: "Products", href: "/seller/products" },
      { label: "Product Reviews", href: "/seller/products/reviews" },
    ],
  },
  {
    label: "Product Storehouse",
    href: "/seller/storehouse",
    icon: Warehouse,
  },
  {
    label: "Uploaded Files",
    href: "/seller/files",
    icon: FileUp,
  },
  {
    label: "Orders",
    href: "/seller/orders",
    icon: ShoppingCart,
    badge: 3,
  },
  {
    label: "Shop Setting",
    href: "/seller/settings",
    icon: Settings,
  },
  {
    label: "Payment History",
    href: "/seller/payments",
    icon: Clock,
  },
  {
    label: "Money Withdraw",
    href: "/seller/withdraw",
    icon: Wallet,
  },
  {
    label: "Commission History",
    href: "/seller/commission",
    icon: BarChart3,
  },
  {
    label: "Conversations",
    href: "/seller/conversations",
    icon: MessageSquare,
  },
  {
    label: "Support Ticket",
    href: "/seller/support",
    icon: HelpCircle,
  },
];

export function SellerSidebar() {
  const pathname = usePathname();
  const [expandedGroups, setExpandedGroups] = useState<string[]>(["Products"]);
  const [searchMenu, setSearchMenu] = useState("");
  const { user: profile } = useUserData();

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) =>
      prev.includes(label)
        ? prev.filter((g) => g !== label)
        : [...prev, label]
    );
  };

  const filteredLinks = sidebarLinks.filter((link) => {
    if (searchMenu === "") return true;
    const q = searchMenu.toLowerCase();
    if (link.label.toLowerCase().includes(q)) return true;
    if (link.children) {
      return link.children.some((c) => c.label.toLowerCase().includes(q));
    }
    return false;
  });

  const sellerImage = profile.shopLogoUrl || profile.avatarUrl || "/logo.png";
  const sellerName = profile.shopName || profile.fullName || "My Shop";

  return (
    <aside className="w-[240px] min-h-screen bg-white border-r border-gray-200 flex flex-col shrink-0">
      {/* Shop info */}
      <div className="p-4 text-center border-b border-gray-100">
        <Link href="/seller/dashboard">
          <div className="h-16 w-16 rounded-xl mx-auto mb-2 bg-white overflow-hidden border border-gray-200 flex items-center justify-center">
            <Image
              src={sellerImage}
              alt={sellerName}
              width={64}
              height={64}
              className="h-16 w-16 object-contain"
            />
          </div>
        </Link>
        <h3 className="text-sm font-semibold text-sky-700">
          {sellerName}
        </h3>
        <p className="text-xs text-gray-500 truncate px-2" title={profile.email || "Email not available"}>
          {profile.email || "Email not available"}
        </p>
        <span className="inline-block mt-1 px-3 py-0.5 bg-green-500 text-white text-[10px] font-semibold rounded-full">
          Credit Score: {profile.creditScore}
        </span>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search in menu"
            value={searchMenu}
            onChange={(e) => setSearchMenu(e.target.value)}
            className="w-full h-8 pl-8 pr-3 text-xs border border-gray-200 rounded-md bg-gray-50 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
        {filteredLinks.map((link) => {
          if (link.children) {
            const isExpanded = expandedGroups.includes(link.label);
            const isChildActive = link.children.some((c) =>
              pathname.startsWith(c.href)
            );
            const Icon = link.icon;

            return (
              <div key={link.label}>
                <button
                  onClick={() => toggleGroup(link.label)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-md transition-colors",
                    isChildActive
                      ? "text-sky-600 font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  )}
                >
                  <Icon className="size-4" />
                  <span className="flex-1 text-left">{link.label}</span>
                  {"badge" in link && link.badge && (
                    <span className="bg-red-500 text-white text-[10px] font-bold size-4 rounded-full flex items-center justify-center">
                      {link.badge}
                    </span>
                  )}
                  <ChevronDown
                    className={cn(
                      "size-3.5 transition-transform",
                      isExpanded && "rotate-180"
                    )}
                  />
                </button>
                {isExpanded && (
                  <div className="ml-6 mt-0.5 space-y-0.5">
                    {link.children.map((child) => {
                      const isActive = pathname === child.href;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            "block px-3 py-1.5 text-sm rounded-md transition-colors",
                            isActive
                              ? "text-sky-600 font-medium bg-sky-50"
                              : "text-gray-600 hover:bg-gray-50"
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <span className="size-1.5 rounded-full bg-current opacity-50" />
                            {child.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const Icon = link.icon;
          const isActive = pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href!}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 text-sm rounded-md transition-colors",
                isActive
                  ? "text-sky-600 font-medium bg-sky-50"
                  : "text-gray-700 hover:bg-gray-50"
              )}
            >
              <Icon className="size-4" />
              <span className="flex-1">{link.label}</span>
              {link.badge && (
                <span className="bg-red-500 text-white text-[10px] font-bold size-4 rounded-full flex items-center justify-center">
                  {link.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
