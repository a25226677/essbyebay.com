"use client";

import Link from "next/link";
import Image from "next/image";
import { useCartStore } from "@/lib/store";
import { QuantitySelector } from "@/components/quantity-selector";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { Button } from "@/components/ui/button";
import { Trash2, ShoppingBag } from "lucide-react";

export default function CartPage() {
  const { items, removeItem, updateQuantity, totalPrice } = useCartStore();

  if (items.length === 0) {
    return (
      <div className="store-page-bg">
        <div className="store-page-container py-8 max-w-5xl">
          <BreadcrumbNav items={[{ label: "Shopping Cart" }]} />
          <div className="store-surface flex flex-col items-center justify-center min-h-[40vh] text-center p-6">
            <ShoppingBag size={64} className="text-muted-foreground/40 mb-4" />
            <h2 className="text-xl font-bold mb-2">Your Cart is Empty</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Looks like you haven&apos;t added any items yet.
            </p>
            <Button asChild>
              <Link href="/">Continue Shopping</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="store-page-bg">
      <div className="store-page-container py-8 max-w-6xl">
        <BreadcrumbNav items={[{ label: "Shopping Cart" }]} />
        <h1 className="text-2xl font-bold mb-6">Shopping Cart ({items.length})</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart items */}
        <div className="lg:col-span-2 space-y-4">
          {/* Desktop table header */}
          <div className="hidden md:grid grid-cols-12 text-xs font-medium text-muted-foreground uppercase border-b pb-2">
            <span className="col-span-6">Product</span>
            <span className="col-span-2 text-center">Price</span>
            <span className="col-span-2 text-center">Quantity</span>
            <span className="col-span-2 text-right">Total</span>
          </div>

          {items.map((item) => (
            <div
              key={`${item.product.id}-${item.selectedColor || ""}-${item.selectedSize || ""}`}
              className="store-surface p-4"
            >
              {/* Desktop row */}
              <div className="hidden md:grid grid-cols-12 items-center gap-4">
                <div className="col-span-6 flex items-center gap-4">
                  <div className="relative w-16 h-16 bg-muted/60 rounded overflow-hidden flex-shrink-0">
                    <Image
                      src={item.product.image}
                      alt={item.product.title}
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/product/${item.product.slug}`}
                      className="text-sm font-medium hover:text-primary line-clamp-2"
                    >
                      {item.product.title}
                    </Link>
                    {(item.selectedColor || item.selectedSize) && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.selectedColor && `Color: ${item.selectedColor}`}
                        {item.selectedColor && item.selectedSize && " · "}
                        {item.selectedSize && `Size: ${item.selectedSize}`}
                      </p>
                    )}
                  </div>
                </div>
                <div className="col-span-2 text-center text-sm font-medium">
                  ${item.product.price.toFixed(2)}
                </div>
                <div className="col-span-2 flex justify-center">
                  <QuantitySelector
                    value={item.quantity}
                    onChange={(v) => updateQuantity(item.product.id, v)}
                    min={1}
                    max={10}
                  />
                </div>
                <div className="col-span-2 flex items-center justify-end gap-3">
                  <span className="text-sm font-semibold">
                    ${(item.product.price * item.quantity).toFixed(2)}
                  </span>
                  <button
                    onClick={() => removeItem(item.product.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    aria-label="Remove item"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Mobile card */}
              <div className="md:hidden flex gap-4">
                <div className="relative w-20 h-20 bg-muted/60 rounded overflow-hidden flex-shrink-0">
                  <Image
                    src={item.product.image}
                    alt={item.product.title}
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/product/${item.product.slug}`}
                    className="text-sm font-medium hover:text-primary line-clamp-2"
                  >
                    {item.product.title}
                  </Link>
                  {(item.selectedColor || item.selectedSize) && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.selectedColor && `Color: ${item.selectedColor}`}
                      {item.selectedColor && item.selectedSize && " · "}
                      {item.selectedSize && `Size: ${item.selectedSize}`}
                    </p>
                  )}
                  <p className="text-sm font-semibold text-primary mt-1">
                    ${item.product.price.toFixed(2)}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <QuantitySelector
                      value={item.quantity}
                      onChange={(v) => updateQuantity(item.product.id, v)}
                      min={1}
                      max={10}
                    />
                    <button
                      onClick={() => removeItem(item.product.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      aria-label="Remove item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order summary */}
        <div className="lg:col-span-1">
          <div className="store-surface shadow-sm p-6 sticky top-24">
            <h2 className="font-bold text-lg mb-4">Order Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} items)
                </span>
                <span>${totalPrice().toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="text-primary font-medium">Free</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>${(totalPrice() * 0.08).toFixed(2)}</span>
              </div>
            </div>
            <div className="border-t mt-4 pt-4 flex justify-between font-bold text-base">
              <span>Total</span>
              <span>${(totalPrice() * 1.08).toFixed(2)}</span>
            </div>
            <Button className="w-full mt-4" size="lg" asChild>
              <Link href="/checkout">Proceed to Checkout</Link>
            </Button>
            <Button variant="outline" className="w-full mt-2" asChild>
              <Link href="/">Continue Shopping</Link>
            </Button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
