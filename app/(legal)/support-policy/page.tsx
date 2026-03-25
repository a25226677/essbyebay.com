import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Support Policy",
  description:
    "Learn how ESS by eBay handles customer support, response times, dispute resolution, and support contact channels.",
  path: "/support-policy",
});

export default function SupportPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <BreadcrumbNav items={[{ label: "Support Policy" }]} />
      <h1 className="text-2xl font-bold mb-6">Support Policy</h1>
      <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
        <p>
          Our support team is here to help you with any questions or concerns regarding your orders,
          account, or any other matter related to eSeller Store Bay.
        </p>

        <h2 className="text-lg font-semibold text-foreground">Support Hours</h2>
        <p>
          Our customer support team is available Monday through Friday, 9:00 AM to 6:00 PM (PST).
          We aim to respond to all inquiries within 24 hours.
        </p>

        <h2 className="text-lg font-semibold text-foreground">Contact Methods</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Email:</strong> support@esellersstorebay.com</li>
          <li><strong>Phone:</strong> +1 (408) 555-0123</li>
          <li><strong>Live Chat:</strong> Available on our website during business hours</li>
        </ul>

        <h2 className="text-lg font-semibold text-foreground">Dispute Resolution</h2>
        <p>
          If you have a dispute with a seller, please contact our support team. We will mediate
          between you and the seller to resolve the issue fairly and promptly.
        </p>

        <h2 className="text-lg font-semibold text-foreground">Response Times</h2>
        <p>
          General inquiries: Within 24 hours. Order-related issues: Within 12 hours.
          Urgent matters: Within 4 hours during business hours.
        </p>
      </div>
    </div>
  );
}
