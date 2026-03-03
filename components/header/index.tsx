"use client";

import { useEffect, useState } from "react";
import { TopBar } from "./top-bar";
import { MainHeader } from "./main-header";
import { NavBar } from "./nav-bar";

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
