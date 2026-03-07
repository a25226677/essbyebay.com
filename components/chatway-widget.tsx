"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";

const DEFAULT_CHATWAY_SCRIPT_URL = "https://cdn.chatway.app/widget.js";

export function ChatwayWidget() {
  const pathname = usePathname();
  const widgetId = process.env.NEXT_PUBLIC_CHATWAY_WIDGET_ID;
  const scriptUrl =
    process.env.NEXT_PUBLIC_CHATWAY_SCRIPT_URL || DEFAULT_CHATWAY_SCRIPT_URL;

  if (!widgetId) return null;
  if (pathname.startsWith("/admin")) return null;

  return (
    <Script
      id="chatway-widget-script"
      src={`${scriptUrl}?id=${encodeURIComponent(widgetId)}`}
      strategy="afterInteractive"
    />
  );
}
