"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

const CHATWAY_SCRIPT_SRC = "https://cdn.chatway.app/widget.js?id=UVQVwWM2ByZG";

export function ChatwayWidget() {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) return null;

  return (
    <Script
      id="chatway"
      src={CHATWAY_SCRIPT_SRC}
      strategy="afterInteractive"
    />
  );
}
