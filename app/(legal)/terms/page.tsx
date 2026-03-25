import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Terms and Conditions",
  description:
    "Read the marketplace terms and conditions for using ESS by eBay, including account, pricing, and product policies.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <BreadcrumbNav items={[{ label: "Terms & Conditions" }]} />
      <h1 className="text-2xl font-bold mb-6">Terms & Conditions</h1>
      <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
        <p>
          Welcome to Seller Store. By accessing and using this website, you accept and agree to be
          bound by the terms and provision of this agreement.
        </p>

        <h2 className="text-lg font-semibold text-foreground">1. Use of the Website</h2>
        <p>
          The content of the pages on this website is for your general information and use only. It is
          subject to change without notice. This website uses cookies to monitor browsing preferences.
        </p>

        <h2 className="text-lg font-semibold text-foreground">2. Product Information</h2>
        <p>
          We make every effort to display as accurately as possible the colors, features,
          specifications, and details of the products available on the site. However, we do not
          guarantee that the colors, features, specifications, and details of the products will be
          accurate, complete, reliable, current, or free of other errors.
        </p>

        <h2 className="text-lg font-semibold text-foreground">3. Pricing</h2>
        <p>
          All prices displayed on the site are in US Dollars (USD) unless otherwise stated. We reserve
          the right to amend prices at any time. Special offers and promotions are available for a
          limited period only.
        </p>

        <h2 className="text-lg font-semibold text-foreground">4. Account</h2>
        <p>
          You are responsible for maintaining the confidentiality of your account and password and for
          restricting access to your computer. You agree to accept responsibility for all activities
          that occur under your account.
        </p>

        <h2 className="text-lg font-semibold text-foreground">5. Governing Law</h2>
        <p>
          These terms and conditions are governed by and construed in accordance with the laws of the
          United States, and you irrevocably submit to the exclusive jurisdiction of the courts in that
          location.
        </p>
      </div>
    </div>
  );
}
