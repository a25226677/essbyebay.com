"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Warehouse,
  TrendingUp,
  Users,
  Store,
  UserCheck,
  Settings2,
  CreditCard,
  BarChart3,
  Megaphone,
  Headphones,
  Globe,
  SlidersHorizontal,
  ChevronRight,
  Search,
  Star,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  badgeColor?: string;
  children?: { href: string; label: string }[];
};

const navItems: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    href: "/admin/pos-system",
    label: "POS System",
    icon: ShoppingCart,
    children: [
      { href: "/admin/pos-system", label: "POS Manager" },
      { href: "/admin/pos-system/pos-configuration", label: "POS Configuration" },
    ],
  },
  {
    href: "/admin/products",
    label: "Products",
    icon: Package,
    children: [
      { href: "/admin/products", label: "All Products" },
      { href: "/admin/products/add", label: "Add Product" },
      { href: "/admin/products/categories", label: "Categories" },
      { href: "/admin/products/brands", label: "Brands" },
    ],
  },
  {
    href: "/admin/product-storehouse",
    label: "Product Storehouse",
    icon: Warehouse,
    children: [
      { href: "/admin/product-storehouse", label: "Product Storehouse" },
    ],
  },
  {
    href: "/admin/sales",
    label: "Sales",
    icon: TrendingUp,
    children: [
      { href: "/admin/sales", label: "All Orders" },
      { href: "/admin/sales/seller-orders", label: "Seller Orders" },
      { href: "/admin/sales/inhouse-orders", label: "Inhouse Orders" },
    ],
  },
  {
    href: "/admin/customers",
    label: "Customers",
    icon: Users,
    badge: 8,
    badgeColor: "bg-emerald-500",
    children: [
      { href: "/admin/customers", label: "Customer list" },
      { href: "/admin/customers/payout-requests", label: "Payout Requests" },
      { href: "/admin/customers/payouts", label: "Payouts" },
    ],
  },
  {
    href: "/admin/sellers",
    label: "Sellers",
    icon: Store,
    badge: 2,
    badgeColor: "bg-amber-500",
    children: [
      { href: "/admin/sellers", label: "All Seller" },
      { href: "/admin/sellers/payout-requests", label: "Payout Requests", badge: 2 },
      { href: "/admin/sellers/payouts", label: "Payouts" },
    ],
  },
  {
    href: "/admin/salesmans",
    label: "Salesmans",
    icon: UserCheck,
    children: [
      { href: "/admin/salesmans", label: "All Salesmans" },
      { href: "/admin/salesmans/commissions", label: "Commissions" },
    ],
  },
  {
    href: "/admin/seller-functions",
    label: "Seller Functions",
    icon: Settings2,
    children: [
      { href: "/admin/seller-functions", label: "Functions" },
      { href: "/admin/seller-functions/payments", label: "Seller Payments" },
    ],
  },
  {
    href: "/admin/offline-payment",
    label: "Offline Payment",
    icon: CreditCard,
    badge: 40,
    badgeColor: "bg-rose-500",
    children: [
      { href: "/admin/offline-payment", label: "Payment Methods" },
      { href: "/admin/offline-payment/requests", label: "Payment Requests" },
    ],
  },
  {
    href: "/admin/reviews",
    label: "Reviews",
    icon: Star,
    children: [
      { href: "/admin/reviews", label: "All Reviews" },
    ],
  },
  {
    href: "/admin/reports",
    label: "Reports",
    icon: BarChart3,
    children: [
      { href: "/admin/reports", label: "Sales Report" },
      { href: "/admin/reports/products", label: "Product Report" },
    ],
  },
  {
    href: "/admin/marketing",
    label: "Marketing",
    icon: Megaphone,
    children: [
      { href: "/admin/marketing", label: "Campaigns" },
      { href: "/admin/marketing/coupons", label: "Coupons" },
      { href: "/admin/marketing/banners", label: "Banners" },
    ],
  },
  {
    href: "/admin/support",
    label: "Support",
    icon: Headphones,
    children: [
      { href: "/admin/support", label: "Tickets" },
      { href: "/admin/support/faq", label: "FAQ" },
    ],
  },
  {
    href: "/admin/website-setup",
    label: "Website Setup",
    icon: Globe,
    children: [
      { href: "/admin/website-setup", label: "General Settings" },
      { href: "/admin/website-setup/pages", label: "Pages" },
      { href: "/admin/website-setup/menus", label: "Menus" },
    ],
  },
  {
    href: "/admin/setup-configurations",
    label: "Setup & Config",
    icon: SlidersHorizontal,
    children: [
      { href: "/admin/setup-configurations", label: "System Config" },
      { href: "/admin/setup-configurations/payment-gateways", label: "Payment Gateways" },
      { href: "/admin/setup-configurations/shipping", label: "Shipping Methods" },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const [openMenus, setOpenMenus] = useState<string[]>([]);

  const toggleMenu = (href: string) => {
    setOpenMenus((prev) =>
      prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href],
    );
  };

  const filtered = navItems.filter((item) =>
    item.label.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <aside className="w-[260px] min-h-screen flex flex-col overflow-hidden shrink-0"
      style={{ background: "#1a1f37" }}>
      {/* Logo */}
      <div className="h-16 px-5 flex items-center gap-3 border-b border-white/10">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-white text-sm shadow-lg"
          style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}
        >
          A
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-tight">StoreBay</p>
          <p className="text-indigo-300 text-[10px]">Admin Panel</p>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.07)" }}>
          <Search className="size-3.5 shrink-0" style={{ color: "#6b7db3" }} />
          <input
            type="text"
            placeholder="Search menu…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-xs outline-none w-full placeholder:text-[#4a5680]"
            style={{ color: "#a8b5d8" }}
          />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto pb-4" style={{ scrollbarWidth: "none" }}>
        {filtered.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const isOpen = openMenus.includes(item.href) || isActive;
          const hasChildren = Boolean(item.children?.length);

          return (
            <div key={item.href}>
              {hasChildren ? (
                <button
                  onClick={() => toggleMenu(item.href)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all rounded-lg mx-2 my-0.5",
                    "hover:bg-white/5",
                    isActive ? "text-white" : "text-[#6b7db3]",
                  )}
                  style={{ width: "calc(100% - 16px)" }}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="flex-1 text-left truncate text-xs font-medium">{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      className={cn(
                        "text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none",
                        item.badgeColor ?? "bg-indigo-500",
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                  <ChevronRight
                    className={cn("size-3 transition-transform", isOpen && "rotate-90")}
                    style={{ color: "#4a5680" }}
                  />
                </button>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 text-xs font-medium transition-all rounded-lg mx-2 my-0.5",
                    isActive
                      ? "text-white shadow-lg"
                      : "text-[#6b7db3] hover:text-white hover:bg-white/5",
                  )}
                  style={
                    isActive
                      ? { background: "linear-gradient(135deg,#4f46e5,#6d28d9)", width: "calc(100% - 16px)" }
                      : { width: "calc(100% - 16px)" }
                  }
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                </Link>
              )}

              {/* Sub-items */}
              {hasChildren && isOpen && (
                <div className="ml-4 mr-2 mb-1 rounded-lg overflow-hidden" style={{ background: "rgba(0,0,0,0.2)" }}>
                  {item.children!.map((child) => {
                    const childActive = pathname === child.href;
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          "flex items-center gap-2.5 pl-8 pr-3 py-2 text-[11px] transition-colors",
                          childActive
                            ? "text-indigo-300 font-medium"
                            : "text-[#4a5680] hover:text-[#a8b5d8]",
                        )}
                      >
                        <span
                          className={cn(
                            "w-1.5 h-1.5 rounded-full shrink-0",
                            childActive ? "bg-indigo-400" : "bg-[#2d3a5e]",
                          )}
                        />
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/10">
        <p className="text-[10px] text-center" style={{ color: "#2d3a5e" }}>
          StoreBay Admin v2.0
        </p>
      </div>
    </aside>
  );
}
