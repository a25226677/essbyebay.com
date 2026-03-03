"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useCartStore } from "@/lib/store";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, ShoppingBag, CheckCircle } from "lucide-react";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, totalPrice, clearCart } = useCartStore();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "US",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);

  const subtotal = totalPrice();
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  const setField = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shipping_address: {
            first_name: form.firstName,
            last_name: form.lastName,
            email: form.email,
            phone: form.phone,
            address: form.address,
            city: form.city,
            state: form.state,
            zip: form.zip,
            country: form.country,
          },
          tax,
          items: items.map((i) => ({
            product_id: i.product.id,
            title: i.product.title,
            quantity: i.quantity,
            unit_price: i.product.price,
          })),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          router.push(`/users/login?next=/checkout`);
          return;
        }
        setError(json.error || "Failed to place order. Please try again.");
      } else {
        clearCart();
        setOrderId(json.orderId);
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (orderId) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="size-8 text-emerald-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Order Placed!</h1>
        <p className="text-muted-foreground mb-1 text-sm">
          Thank you for your purchase. Your order has been received.
        </p>
        <p className="text-xs text-muted-foreground font-mono mb-8">
          Order ID: {orderId}
        </p>
        <div className="flex gap-3 justify-center">
          <Button asChild>
            <Link href="/track-your-order">Track Order</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">Continue Shopping</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <ShoppingBag size={56} className="mx-auto text-muted-foreground/30 mb-4" />
        <h1 className="text-xl font-bold mb-2">Your cart is empty</h1>
        <p className="text-muted-foreground text-sm mb-6">Add some items before checking out.</p>
        <Button asChild><Link href="/">Shop Now</Link></Button>
      </div>
    );
  }

  return (
    <div className="store-page-bg">
      <div className="store-page-container py-8 max-w-6xl">
        <BreadcrumbNav items={[{ label: "Cart", href: "/cart" }, { label: "Checkout" }]} />
        <h1 className="text-2xl font-bold mb-6">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Shipping form */}
          <form onSubmit={handleSubmit} className="lg:col-span-3 space-y-5">
            <div className="store-surface p-6">
              <h2 className="font-bold text-base mb-4">Shipping Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" value={form.firstName} onChange={(e) => setField("firstName", e.target.value)} required placeholder="John" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" value={form.lastName} onChange={(e) => setField("lastName", e.target.value)} required placeholder="Doe" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} required placeholder="john@example.com" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" type="tel" value={form.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="+1 234 567 8900" />
                </div>
              </div>
              <div className="mt-4 space-y-1.5">
                <Label htmlFor="address">Street Address</Label>
                <Input id="address" value={form.address} onChange={(e) => setField("address", e.target.value)} required placeholder="123 Main St" />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" value={form.city} onChange={(e) => setField("city", e.target.value)} required placeholder="New York" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="state">State / Region</Label>
                  <Input id="state" value={form.state} onChange={(e) => setField("state", e.target.value)} placeholder="NY" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="zip">ZIP / Postal Code</Label>
                  <Input id="zip" value={form.zip} onChange={(e) => setField("zip", e.target.value)} required placeholder="10001" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" value={form.country} onChange={(e) => setField("country", e.target.value)} required placeholder="US" />
                </div>
              </div>
            </div>

            {/* Payment notice */}
            <div className="store-surface p-6">
              <h2 className="font-bold text-base mb-3">Payment</h2>
              <div className="border border-dashed border-gray-200 rounded-lg p-4 text-sm text-muted-foreground text-center">
                💳 Online payment is not yet configured. Your order will be placed as &quot;Pending&quot; and our team will contact you for payment.
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? (
                <><RefreshCw size={16} className="animate-spin mr-2" /> Placing Order…</>
              ) : (
                `Place Order · $${total.toFixed(2)}`
              )}
            </Button>
          </form>

          {/* Order summary */}
          <div className="lg:col-span-2">
            <div className="store-surface p-5 sticky top-24">
              <h2 className="font-bold text-base mb-4">Order Summary ({items.length} items)</h2>
              <div className="space-y-3 mb-4 max-h-72 overflow-y-auto">
                {items.map((item) => (
                  <div key={`${item.product.id}-${item.selectedColor}-${item.selectedSize}`} className="flex gap-3">
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      <Image src={item.product.image} alt={item.product.title} fill className="object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium line-clamp-2 text-gray-800">{item.product.title}</p>
                      {item.selectedColor && <p className="text-[11px] text-muted-foreground">Color: {item.selectedColor}</p>}
                      {item.selectedSize && <p className="text-[11px] text-muted-foreground">Size: {item.selectedSize}</p>}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-bold">${(item.product.price * item.quantity).toFixed(2)}</p>
                      <p className="text-[11px] text-muted-foreground">×{item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t pt-3 space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Shipping</span><span className="text-emerald-600 font-medium">Free</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Tax (8%)</span><span>${tax.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold text-base border-t pt-2 mt-1"><span>Total</span><span>${total.toFixed(2)}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
