import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Return Policy",
  description:
    "Review the ESS by eBay return policy, eligibility rules, shipping terms, and refund process for marketplace purchases.",
  path: "/return-policy",
});

export default function ReturnPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <BreadcrumbNav items={[{ label: "Return Policy" }]} />
      <h1 className="text-2xl font-bold mb-6">Return Policy</h1>
      <div className="prose prose-sm max-w-none text-muted-foreground space-y-4">
        <p>
          At Seller Store, we want you to be completely satisfied with your purchase. If you are not
          satisfied, you may return most items within 14 days of delivery for a full refund.
        </p>

        <h2 className="text-lg font-semibold text-foreground">Eligibility</h2>
        <p>
          To be eligible for a return, your item must be unused and in the same condition that you
          received it. It must also be in the original packaging with all tags attached.
        </p>

        <h2 className="text-lg font-semibold text-foreground">Return Process</h2>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Contact our support team with your order number and reason for return.</li>
          <li>Receive a return authorization and shipping label via email.</li>
          <li>Pack the item securely and ship it using the provided label.</li>
          <li>Once we receive and inspect the item, your refund will be processed within 5-7 business days.</li>
        </ol>

        <h2 className="text-lg font-semibold text-foreground">Non-Returnable Items</h2>
        <p>
          Certain items cannot be returned, including perishable goods, intimate or sanitary goods,
          hazardous materials, and gift cards. Sale items are final and cannot be returned.
        </p>

        <h2 className="text-lg font-semibold text-foreground">Shipping Costs</h2>
        <p>
          Return shipping costs are the responsibility of the buyer unless the item is defective or
          was sent in error.
        </p>
      </div>
    </div>
  );
}
