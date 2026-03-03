"use client";

import { SellerSidebar } from "@/components/seller/sidebar";
import { SellerHeader } from "@/components/seller/seller-header";
import { useState } from "react";
import { Toaster } from "sonner";

export default function SellerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <>
      {/* Hide the main site header/footer for the seller panel */}
      <style>{`
        body > main > div > header,
        body > main > div > footer,
        header.site-header,
        footer.site-footer,
        nav.mobile-bottom-nav,
        .mobile-bottom-nav,
        body > main > header,
        body > main + footer,
        body > footer,
        body > div > header,
        body > div > footer {
          display: none !important;
        }
        body > main {
          padding-bottom: 0 !important;
          min-height: auto !important;
        }
      `}</style>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <Toaster position="top-right" richColors />

        {/* Sidebar */}
        <div
          className={`fixed inset-y-0 left-0 z-50 lg:static lg:z-auto transition-all duration-200 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:-translate-x-full lg:w-0 lg:overflow-hidden"
          }`}
        >
          <SellerSidebar />
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <SellerHeader onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} sidebarOpen={sidebarOpen} />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            {children}
          </main>
          <footer className="h-10 border-t border-gray-200 bg-white flex items-center justify-center">
            <p className="text-xs text-gray-500">© Ess by Ebay</p>
          </footer>
        </div>
      </div>
    </>
  );
}
