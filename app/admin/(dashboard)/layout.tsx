"use client";

import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminHeader } from "@/components/admin/header";

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style>{`
        header.site-header,
        footer.site-footer,
        nav.mobile-bottom-nav {
          display: none !important;
        }
      `}</style>
      <div className="flex h-screen overflow-hidden" style={{ background: "#f3f4f6" }}>
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <AdminHeader />
          <main className="flex-1 overflow-y-auto p-5 md:p-6">{children}</main>
        </div>
      </div>
    </>
  );
}
