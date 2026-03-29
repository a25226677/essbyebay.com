"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { TopBar } from "./top-bar";
import { MainHeader } from "./main-header";
import { NavBar } from "./nav-bar";

export function Header() {
  const pathname = usePathname() || "";
  const [isScrolled, setIsScrolled] = useState(false);

  const hideSiteHeader =
    pathname.startsWith("/seller") || pathname.startsWith("/admin");

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (hideSiteHeader) return null;

  return (
    <header className={`site-header sticky top-0 z-50 transition-shadow duration-300 ${
      isScrolled ? "shadow-lg" : ""
    }`}>
      <TopBar />
      <MainHeader />
      <NavBar />
    </header>
  );
}
