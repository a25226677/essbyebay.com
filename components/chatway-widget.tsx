"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

const CHATWAY_SCRIPT_SRC = "https://cdn.chatway.app/widget.js?id=UVQVwWM2ByZG";

export function ChatwayWidget() {
  const pathname = usePathname();

  useEffect(() => {
    const MOBILE_MAX_WIDTH = 767;

    const applyOffset = () => {
      if (window.innerWidth > MOBILE_MAX_WIDTH) return;

      const bottomInset =
        Number.parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue("--sat") || "0",
        ) || 0;
      const targetBottom = `${56 + bottomInset + 12}px`;

      const selectors = [
        'iframe[src*="chatway"]',
        '[id*="chatway"] iframe',
        '[class*="chatway"] iframe',
        '[id*="chatway"]',
        '[class*="chatway"]',
      ];

      selectors.forEach((selector) => {
        document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
          el.style.setProperty("bottom", targetBottom, "important");
          el.style.setProperty("z-index", "60", "important");
        });
      });
    };

    const observer = new MutationObserver(applyOffset);
    observer.observe(document.body, { childList: true, subtree: true });

    const resizeHandler = () => applyOffset();
    window.addEventListener("resize", resizeHandler);

    const timer = window.setInterval(applyOffset, 1200);
    applyOffset();

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resizeHandler);
      window.clearInterval(timer);
    };
  }, []);

  if (pathname.startsWith("/admin")) return null;

  return (
    <Script
      id="chatway"
      src={CHATWAY_SCRIPT_SRC}
      strategy="afterInteractive"
    />
  );
}
