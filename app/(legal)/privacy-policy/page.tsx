import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Privacy Policy",
  description:
    "Read the privacy policy for Ess by Ebay and learn how customer and seller information is collected, used, and protected.",
  path: "/privacy-policy",
});

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <BreadcrumbNav items={[{ label: "Privacy Policy" }]} />
      <h1 className="text-2xl font-bold mb-6">Privacy Policy</h1>
      <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
        <p>
          At eSeller Store Bay, we take your privacy seriously. This Privacy Policy describes how we
          collect, use, and share information about you when you use our services.
        </p>

        <h2 className="text-lg font-semibold text-foreground">Information We Collect</h2>
        <p>
          We collect information you provide directly, such as when you create an account, make a
          purchase, or contact our support team. This includes your name, email address, shipping
          address, and payment information.
        </p>

        <h2 className="text-lg font-semibold text-foreground">How We Use Your Information</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Process and fulfill your orders</li>
          <li>Send order confirmations and shipping updates</li>
          <li>Improve our services and user experience</li>
          <li>Prevent fraud and ensure security</li>
          <li>Communicate promotional offers (with your consent)</li>
        </ul>

        <h2 className="text-lg font-semibold text-foreground">Data Security</h2>
        <p>
          We implement appropriate security measures to protect your personal information against
          unauthorized access, alteration, disclosure, or destruction. All payment transactions are
          encrypted using SSL technology.
        </p>

        <h2 className="text-lg font-semibold text-foreground">Your Rights</h2>
        <p>
          You have the right to access, correct, or delete your personal data. You may also opt out
          of promotional communications at any time by clicking the unsubscribe link in our emails.
        </p>

        <h2 className="text-lg font-semibold text-foreground">Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, please contact us at
          privacy@esellersstorebay.com.
        </p>
      </div>
    </div>
  );
}
