import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import Link from "next/link";
import { AccountSignOutButton } from "@/components/account/signout-button";
import {
  User,
  Package,
  Heart,
  MapPin,
  ChevronRight,
} from "lucide-react";

export const metadata = { title: "My Account" };

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/users/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role === "admin") {
    redirect("/admin/dashboard");
  }

  const fullName = user.user_metadata?.full_name || "Customer";
  const initial = fullName.charAt(0).toUpperCase();

  const menuItems = [
    {
      icon: Package,
      label: "My Orders",
      href: "/track-your-order",
      desc: "Track, return, or buy again",
    },
    {
      icon: Heart,
      label: "Wishlist",
      href: "/account/wishlist",
      desc: "Your saved items",
    },
    {
      icon: MapPin,
      label: "Addresses",
      href: "/account/addresses",
      desc: "Manage delivery addresses",
    },
    {
      icon: User,
      label: "Profile Settings",
      href: "/account/settings",
      desc: "Name, email, password",
    },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <BreadcrumbNav items={[{ label: "My Account" }]} />

      {/* Profile card */}
      <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-6 flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate">{fullName}</h1>
          <p className="text-sm text-muted-foreground truncate">
            {user.email}
          </p>
        </div>
      </div>

      {/* Menu list */}
      <div className="bg-white border border-gray-100 rounded-lg shadow-sm divide-y">
        {menuItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <item.icon size={18} className="text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
          </Link>
        ))}
      </div>

      {/* Logout */}
      <div className="mt-6">
        <AccountSignOutButton />
      </div>
    </div>
  );
}
