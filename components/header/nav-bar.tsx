"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/flash-deals", label: "Flash Sale" },
  { href: "/blog", label: "Blogs" },
  { href: "/brands", label: "All Brands" },
];

export function NavBar() {
  const pathname = usePathname() || "";

  return (
    <div className="hidden lg:block bg-[#2f3b51] border-t border-[#46536a]">
      <div className="max-w-[1340px] mx-auto px-4 h-[50px] flex items-center justify-center gap-4">
        {navLinks.map((link) => {
          const isActive =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-[15px] font-semibold transition-colors px-4 py-2 rounded-sm",
                isActive
                  ? "text-white"
                  : "text-gray-300 hover:text-white"
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
