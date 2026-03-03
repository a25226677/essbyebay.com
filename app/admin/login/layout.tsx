export default function AdminLoginLayout({
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
      {children}
    </>
  );
}
