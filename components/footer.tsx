"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

const quickLinks = [
  { label: "Terms & conditions", href: "/terms" },
  { label: "return policy", href: "/return-policy" },
  { label: "Support Policy", href: "/support-policy" },
  { label: "privacy policy", href: "/privacy-policy" },
];

const accountLinks = [
  { label: "Login", href: "/users/login" },
  { label: "Order History", href: "/account" },
  { label: "My Wishlist", href: "/account" },
  { label: "Track Order", href: "/track-your-order" },
];

export function Footer() {
  const [email, setEmail] = useState("");

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle newsletter subscription
    console.log("Subscribe:", email);
  };

  return (
    <footer className="site-footer bg-[#2d3548] text-gray-300">
      {/* Main footer */}
      <div className="max-w-[1340px] mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Column 1 — About + Newsletter + Mobile Apps */}
          <div className="lg:col-span-1">
            <div className="mb-4">
              <Image
                src="/logo.png"
                alt="Ess by Ebay"
                width={140}
                height={44}
                className="object-contain brightness-110"
              />
            </div>
            <p className="text-sm text-gray-400 leading-relaxed mb-6">
              <strong className="text-white">Ess by Ebay</strong> is a modern multi-vendor eCommerce marketplace
              connecting customers with trusted sellers in one seamless shopping destination. We curate a diverse range of
              products across multiple categories, offering quality, convenience, and choice.
            </p>
           

            {/* Newsletter */}
            <div className="mb-8">
              <h4 className="text-white font-bold uppercase text-sm mb-4 tracking-wide">
                NEWSLETTER
              </h4>
              <form onSubmit={handleSubscribe} className="flex">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your Email Address"
                  className="flex-1 bg-[#3d4a5e] border border-[#4a5868] text-white placeholder:text-gray-500 h-11 text-sm px-4 outline-none focus:border-[#5a6878] transition-colors"
                  required
                />
                <button
                  type="submit"
                  className="bg-[#ff0000] hover:bg-[#dd0000] text-white text-sm font-semibold px-6 h-11 transition-colors whitespace-nowrap"
                >
                  Subscribe
                </button>
              </form>
            </div>

            {/* Mobile Apps */}
            <div>
              <h4 className="text-white font-bold uppercase text-sm mb-4 tracking-wide">
                MOBILE APPS
              </h4>
              <div className="flex gap-3">
                <span
                className="block transition-opacity hover:opacity-80"
              >
                <Image
                  src="/play.png"
                  alt="Get it on Google Play"
                  width={135}
                  height={40}
                  className="rounded object-contain"
                />
              </span>
                <span
                className="block transition-opacity hover:opacity-80"
              >
                <Image
                  src="/app.png"
                  alt="Available on the App Store"
                  width={135}
                  height={40}
                  className="rounded object-contain"
                />
              </span>
              </div>
            </div>
          </div>

          {/* Column 2 — Quick Links */}
          <div>
            <h4 className="text-white font-bold uppercase text-sm mb-5 tracking-wide">
              QUICK LINKS
            </h4>
            <ul className="space-y-3">
              {quickLinks.map((link, index) => (
                <li key={`quick-${index}-${link.href}`}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3 — Contacts */}
          <div>
            <h4 className="text-white font-bold uppercase text-sm mb-5 tracking-wide">
              CONTACTS
            </h4>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-gray-500 mb-1">Address:</p>
                <p className="text-gray-400">
                  San Jose, California, USA (2025 Hamilton Avenue)
                </p>
              </div>
              <div>
                <p className="text-gray-500 mb-1">Email:</p>
                <p className="text-gray-400">info@esellersstorebay.com</p>
              </div>
            </div>
          </div>

          {/* Column 4 — My Account */}
          <div>
            <h4 className="text-white font-bold uppercase text-sm mb-5 tracking-wide">
              MY ACCOUNT
            </h4>
            <ul className="space-y-3">
              {accountLinks.map((link, index) => (
                <li key={`account-${index}-${link.href}`}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-white transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 5 — Seller Zone */}
          <div>
            <h4 className="text-white font-bold uppercase text-sm mb-5 tracking-wide">
              SELLER ZONE
            </h4>
            <ul className="space-y-3">
              <li>
                <div className="flex flex-col gap-2">
                  <span className="text-gray-400 text-sm">Become A Seller</span>
                  <Link
                    href="/shop/create"
                    className="bg-[#ff0000] hover:bg-[#dd0000] text-white text-sm font-semibold px-5 py-2 transition-colors inline-block text-center rounded"
                  >
                    Apply Now
                  </Link>
                </div>
              </li>
              <li>
                <Link
                  href="/seller/login"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Login to Seller Panel
                </Link>
              </li>
              <li>
                <Link
                  href="/affiliate"
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  Be an affiliate partner
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-[#1e2735]">
        <div className="max-w-[1340px] mx-auto px-4 py-5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-400">
            Copyright &copy; {new Date().getFullYear()} eSeller Store Bay. All Rights Reserved.
          </p>
          <div className="flex items-center gap-1.5 flex-wrap justify-center">
            {([
              { src: "/union.png",          alt: "UnionPay" },
              { src: "/visa.png",           alt: "Visa" },
              { src: "/americanexpress.png",alt: "American Express" },
              { src: "/paypal.png",         alt: "PayPal" },
              { src: "/amex.png",           alt: "Amex" },
              { src: "/discover.png",       alt: "Discover" },
              { src: "/jcb.png",            alt: "JCB" },
              { src: "/mastercard.png",     alt: "MasterCard" },
              { src: "/dinersclub.png",     alt: "Diners Club" },
            ] as { src: string; alt: string }[]).map(({ src, alt }) => (
              <div
                key={alt}
                className="w-[52px] h-[33px] relative rounded overflow-hidden bg-white/95 border border-white/20 shadow-sm flex items-center justify-center p-1 hover:scale-105 transition-transform duration-200"
              >
                <Image
                  src={src}
                  alt={alt}
                  fill
                  sizes="52px"
                  className="object-contain p-0.5"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
