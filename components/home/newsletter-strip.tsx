"use client";

import { useState } from "react";

export function NewsletterStrip() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitted(true);
  };

  return (
    <div className="bg-gradient-to-r from-[#f77f00] to-[#e67300]">
      <div className="max-w-[1340px] mx-auto px-4 py-8 sm:py-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">

          {/* Text */}
          <div className="text-center sm:text-left">
            <h3 className="text-white font-extrabold text-lg sm:text-xl mb-1">
              📧 Get Exclusive Deals in Your Inbox
            </h3>
            <p className="text-orange-100 text-sm">
              Join 50,000+ subscribers · Unsubscribe anytime
            </p>
          </div>

          {/* Form */}
          {submitted ? (
            <div className="bg-white/20 border border-white/30 rounded-lg px-6 py-3 text-white font-semibold text-sm">
              ✓ You&apos;re subscribed! Thanks.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex w-full sm:w-auto gap-0">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address..."
                required
                className="flex-1 sm:w-64 h-11 px-4 text-sm bg-white text-gray-800 placeholder:text-gray-400 rounded-l-lg outline-none focus:ring-2 focus:ring-white/50 border-0"
              />
              <button
                type="submit"
                className="h-11 px-5 bg-[#1b233a] hover:bg-[#263348] text-white font-bold text-sm rounded-r-lg transition-colors whitespace-nowrap"
              >
                Subscribe Now
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
