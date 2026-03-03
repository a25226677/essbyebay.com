"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import {
  Search,
  Bell,
  Heart,
  ShoppingCart,
  Menu,
  X,
  Home,
  Tag,
  BookOpen,
  Store,
  ChevronRight,
  ChevronDown,
  ShoppingBag,
  Shirt,
  Laptop,
  Baby,
  Bike,
  Watch,
  Smartphone,
  Hammer,
  Sofa,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useCartStore } from "@/lib/store";
import { useWishlistStore } from "@/lib/store";
import { categories } from "@/lib/placeholder-data";
import { useRouter } from "next/navigation";

export function MainHeader() {
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const totalItems = useCartStore((s) => s.totalItems);
  const wishlistCount = useWishlistStore((s) => s.items.length);
  const cartCount = totalItems();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setCatDropdownOpen(false);
      }
    };

    if (catDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [catDropdownOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setMobileOpen(false);
    }
  };

  return (
    <div className="bg-[#2f3b51] border-b border-[#47536b]">
      <div className="max-w-[1340px] mx-auto px-4 h-[70px] sm:h-[76px] lg:h-[84px] flex items-center gap-3 lg:gap-4">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0 flex items-center gap-2">
          <div className="relative w-[120px] h-[38px] sm:w-[132px] sm:h-[42px] lg:w-[140px] lg:h-[44px]">
            <Image
              src="/logo.png"
              alt="Seller Store"
              fill
              sizes="140px"
              className="object-contain"
              priority
            />
          </div>
        </Link>

        {/* Search Bar - Desktop */}
        <div className="hidden lg:flex items-center flex-1 mx-4 relative" ref={dropdownRef}>
          {/* Category Dropdown Button */}
          <button
            type="button"
            onClick={() => setCatDropdownOpen(!catDropdownOpen)}
            className="flex items-center gap-2 bg-[#4a5468] text-white text-[15px] font-semibold h-[58px] px-6 rounded-l-md whitespace-nowrap hover:bg-[#556177] transition-colors border border-[#6a7488] border-r-0"
          >
            Shop by category
            <ChevronDown size={16} className={`transition-transform duration-200 ${
              catDropdownOpen ? "rotate-180" : ""
            }`} />
          </button>

          {/* Category Dropdown Panel */}
          {catDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-[380px] bg-[#fef5ed] rounded-md shadow-2xl z-[100] border border-gray-200">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
                <h3 className="text-[#e85d2a] font-semibold text-base">Categories</h3>
                <Link
                  href="/categories"
                  className="text-[#e85d2a] text-sm font-medium hover:underline flex items-center gap-1"
                  onClick={() => setCatDropdownOpen(false)}
                >
                  See All
                  <ChevronRight size={14} />
                </Link>
              </div>

              {/* Categories List */}
              <div className="py-2 max-h-[420px] overflow-y-auto">
                <Link
                  href="/categories?cat=women-fashion-bag"
                  className="flex items-center gap-3 px-5 py-2.5 hover:bg-white/60 transition-colors"
                  onClick={() => setCatDropdownOpen(false)}
                >
                  <ShoppingBag size={18} className="text-gray-600" />
                  <span className="text-gray-800 text-sm">Women&apos;s fashion bag</span>
                </Link>
                <Link
                  href="/categories?cat=women-clothing"
                  className="flex items-center gap-3 px-5 py-2.5 hover:bg-white/60 transition-colors"
                  onClick={() => setCatDropdownOpen(false)}
                >
                  <ShoppingBag size={18} className="text-gray-600" />
                  <span className="text-gray-800 text-sm">Women Clothing & Fashion</span>
                </Link>
                <Link
                  href="/categories?cat=men-clothing"
                  className="flex items-center gap-3 px-5 py-2.5 hover:bg-white/60 transition-colors"
                  onClick={() => setCatDropdownOpen(false)}
                >
                  <Shirt size={18} className="text-gray-600" />
                  <span className="text-gray-800 text-sm">Men Clothing & Fashion</span>
                </Link>
                <Link
                  href="/categories?cat=computer"
                  className="flex items-center gap-3 px-5 py-2.5 hover:bg-white/60 transition-colors"
                  onClick={() => setCatDropdownOpen(false)}
                >
                  <Laptop size={18} className="text-gray-600" />
                  <span className="text-gray-800 text-sm">Computer & Accessories</span>
                </Link>
                <Link
                  href="/categories?cat=kids-toy"
                  className="flex items-center gap-3 px-5 py-2.5 hover:bg-white/60 transition-colors"
                  onClick={() => setCatDropdownOpen(false)}
                >
                  <Baby size={18} className="text-gray-600" />
                  <span className="text-gray-800 text-sm">Kids & toy</span>
                </Link>
                <Link
                  href="/categories?cat=sports"
                  className="flex items-center gap-3 px-5 py-2.5 hover:bg-white/60 transition-colors"
                  onClick={() => setCatDropdownOpen(false)}
                >
                  <Tag size={18} className="text-gray-600" />
                  <span className="text-gray-800 text-sm">Sports & outdoor</span>
                </Link>
                <Link
                  href="/categories?cat=automobile"
                  className="flex items-center gap-3 px-5 py-2.5 hover:bg-white/60 transition-colors"
                  onClick={() => setCatDropdownOpen(false)}
                >
                  <Bike size={18} className="text-gray-600" />
                  <span className="text-gray-800 text-sm">Automobile & Motorcycle</span>
                </Link>
                <Link
                  href="/categories?cat=jewelry"
                  className="flex items-center gap-3 px-5 py-2.5 hover:bg-white/60 transition-colors"
                  onClick={() => setCatDropdownOpen(false)}
                >
                  <Watch size={18} className="text-gray-600" />
                  <span className="text-gray-800 text-sm">Jewelry & Watches</span>
                </Link>
                <Link
                  href="/categories?cat=phone"
                  className="flex items-center gap-3 px-5 py-2.5 hover:bg-white/60 transition-colors"
                  onClick={() => setCatDropdownOpen(false)}
                >
                  <Smartphone size={18} className="text-gray-600" />
                  <span className="text-gray-800 text-sm">Phone accessories</span>
                </Link>
                <Link
                  href="/categories?cat=home-tools"
                  className="flex items-center gap-3 px-5 py-2.5 hover:bg-white/60 transition-colors"
                  onClick={() => setCatDropdownOpen(false)}
                >
                  <Hammer size={18} className="text-gray-600" />
                  <span className="text-gray-800 text-sm">Home Improvement & Tools</span>
                </Link>
                <Link
                  href="/categories?cat=home-decor"
                  className="flex items-center gap-3 px-5 py-2.5 hover:bg-white/60 transition-colors"
                  onClick={() => setCatDropdownOpen(false)}
                >
                  <Sofa size={18} className="text-gray-600" />
                  <span className="text-gray-800 text-sm">Home decoration & Appliance</span>
                </Link>
              </div>
            </div>
          )}

          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex items-center flex-1">
            {/* Search Input */}
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for anything"
              className="flex-1 h-[58px] px-5 text-[15px] bg-[#4a5468] border-y border-[#6a7488] outline-none text-white placeholder:text-gray-300 min-w-0"
            />

            {/* Search Button */}
            <button
              type="submit"
              className="bg-gradient-to-r from-[#6674ea] to-[#7650be] hover:from-[#7280f0] hover:to-[#845dc8] transition-colors text-white h-[58px] min-w-[165px] px-10 rounded-r-md flex items-center justify-center gap-2 font-semibold text-[15px]"
            >
              Search
            </button>
          </form>
        </div>

        {/* Action Icons - Desktop */}
        <div className="hidden lg:flex items-center gap-2">
          <Link
            href="/account/wishlist"
            className="relative p-2.5 text-gray-200 hover:text-white transition-colors"
          >
            <Heart size={22} />
            {mounted && wishlistCount > 0 && (
              <span className="absolute top-0.5 right-0.5 bg-[#f77f00] text-white text-[10px] rounded-full w-[18px] h-[18px] flex items-center justify-center font-bold">
                {wishlistCount}
              </span>
            )}
          </Link>
          <Link
            href="/account"
            className="relative p-2.5 text-gray-200 hover:text-white transition-colors"
          >
            <Bell size={22} />
          </Link>
          <Link
            href="/cart"
            className="relative p-2.5 text-gray-200 hover:text-white transition-colors"
          >
            <ShoppingCart size={22} />
            {mounted && cartCount > 0 && (
              <span className="absolute top-0.5 right-0.5 bg-[#f77f00] text-white text-[10px] rounded-full w-[18px] h-[18px] flex items-center justify-center font-bold">
                {cartCount}
              </span>
            )}
          </Link>
          <div className="ml-1 flex flex-col items-start leading-none">
            <span className="text-white text-[13px] font-medium">Cart</span>
          </div>
        </div>

        {/* Mobile: Search icon + Cart + Hamburger */}
        <div className="flex lg:hidden items-center gap-1.5 sm:gap-2 ml-auto">
          <Link
            href="/cart"
            className="relative p-2 sm:p-2.5 text-gray-200 hover:text-white transition-colors"
          >
            <ShoppingCart size={19} />
            {mounted && cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-[#f77f00] text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-medium">
                {cartCount}
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={() => router.push(`/search${searchQuery.trim() ? `?q=${encodeURIComponent(searchQuery.trim())}` : ""}`)}
            className="relative p-2 sm:p-2.5 text-gray-200 hover:text-white transition-colors"
            aria-label="Open search"
          >
            <Search size={19} />
          </button>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-10 sm:w-10 text-gray-200 hover:text-white hover:bg-[#2a3350]">
                <Menu size={20} />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[88vw] max-w-80 p-0">
              <SheetTitle className="sr-only">Mobile navigation menu</SheetTitle>
              <div className="flex flex-col h-full">
                {/* Sheet header */}
                <div className="flex items-center justify-between p-4 border-b bg-[#1b233a]">
                  <Link
                    href="/"
                    className="text-lg font-bold text-white"
                    onClick={() => setMobileOpen(false)}
                  >
                    Seller Store
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setMobileOpen(false)}
                    className="text-gray-300 hover:text-white hover:bg-[#2a3350]"
                  >
                    <X size={18} />
                  </Button>
                </div>

                {/* Sheet search */}
                <form onSubmit={handleSearch} className="p-4 border-b">
                  <div className="flex">
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search products..."
                      className="flex-1 h-9 px-3 text-sm border border-gray-300 rounded-l outline-none"
                    />
                    <button type="submit" className="bg-[#f77f00] text-white h-9 px-3 rounded-r">
                      <Search size={16} />
                    </button>
                  </div>
                </form>

                {/* Sheet navigation */}
                <nav className="flex-1 overflow-y-auto">
                  <div className="p-2">
                    <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Navigation
                    </p>
                    {[
                      { href: "/", label: "Home", icon: Home },
                      { href: "/flash-deals", label: "Flash Sale", icon: Tag },
                      { href: "/blog", label: "Blogs", icon: BookOpen },
                      { href: "/brands", label: "All Brands", icon: Store },
                    ].map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-md hover:bg-gray-50 transition-colors"
                      >
                        <item.icon size={16} className="text-muted-foreground" />
                        {item.label}
                      </Link>
                    ))}
                  </div>

                  <div className="p-2 border-t">
                    <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Categories
                    </p>
                    {categories.map((cat) => (
                      <Link
                        key={cat.id}
                        href={`/search?q=${encodeURIComponent(cat.name)}`}
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center justify-between px-3 py-2.5 text-sm rounded-md hover:bg-gray-50 transition-colors"
                      >
                        {cat.name}
                        <ChevronRight size={14} className="text-muted-foreground" />
                      </Link>
                    ))}
                  </div>
                </nav>

                {/* Sheet footer */}
                <div className="border-t p-4 space-y-2">
                  <Link href="/users/login" onClick={() => setMobileOpen(false)}>
                    <Button variant="outline" className="w-full">
                      Login
                    </Button>
                  </Link>
                  <Link href="/users/registration" onClick={() => setMobileOpen(false)}>
                    <Button className="w-full">Register</Button>
                  </Link>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
}
