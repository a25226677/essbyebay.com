import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Users, DollarSign, TrendingUp, Gift } from "lucide-react";

export const metadata = { title: "Affiliate Program" };

export default function AffiliatePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <BreadcrumbNav items={[{ label: "Affiliate Program" }]} />
      <h1 className="text-2xl font-bold mb-2">Affiliate Program</h1>
      <p className="text-muted-foreground mb-8">
        Earn commissions by promoting Seller Store products. Join our affiliate
        program and start earning today.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
        {[
          {
            icon: DollarSign,
            title: "Competitive Commissions",
            desc: "Earn up to 10% commission on every sale made through your unique referral link.",
          },
          {
            icon: Users,
            title: "No Limit on Referrals",
            desc: "There is no cap on the number of referrals you can make. The more you share, the more you earn.",
          },
          {
            icon: TrendingUp,
            title: "Real-Time Dashboard",
            desc: "Track your clicks, conversions, and earnings in real-time through your affiliate dashboard.",
          },
          {
            icon: Gift,
            title: "Exclusive Promotions",
            desc: "Get access to exclusive promo codes and creative assets to boost your conversion rates.",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="border border-gray-100 rounded-lg p-6 flex gap-4"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <item.icon size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">{item.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <h2 className="text-xl font-bold mb-2">Ready to Get Started?</h2>
        <p className="text-muted-foreground text-sm mb-4">
          Sign up for our affiliate program and start earning commissions today.
        </p>
        <Button size="lg" asChild>
          <Link href="/shop/create">Join Now</Link>
        </Button>
      </div>
    </div>
  );
}
