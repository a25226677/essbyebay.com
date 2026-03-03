"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, Heart, Share2, Truck, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { QuantitySelector } from "@/components/quantity-selector";
import { ProductCard } from "@/components/product-card";
import { SectionHeader } from "@/components/section-header";
import { useCartStore, useWishlistStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types";

interface Props {
  product: Product;
  relatedProducts: Product[];
}

export function ProductDetailClient({ product, relatedProducts }: Props) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string | undefined>(
    product.colors[0]?.name
  );
  const [selectedSize, setSelectedSize] = useState<string | undefined>(
    product.sizes[0]
  );
  const [quantity, setQuantity] = useState(1);

  const addToCart = useCartStore((s) => s.addItem);
  const wishlistAdd = useWishlistStore((s) => s.addItem);
  const wishlistRemove = useWishlistStore((s) => s.removeItem);
  const isInWishlist = useWishlistStore((s) => s.isInWishlist(product.id));

  const allImages = [product.image, ...product.images];
  const totalPrice = product.price * quantity;

  const handleAddToCart = () => {
    addToCart(product, quantity, selectedColor, selectedSize);
  };

  const handleBuyNow = () => {
    addToCart(product, quantity, selectedColor, selectedSize);
    window.location.href = "/cart";
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <BreadcrumbNav
        items={[
          { label: product.categoryName, href: `/search?q=${encodeURIComponent(product.categoryName)}` },
          { label: product.title },
        ]}
      />

      {/* Main content: image gallery + details */}
      <div className="flex flex-col md:flex-row gap-8">
        {/* Left: Image gallery */}
        <div className="md:w-1/2">
          {/* Main image */}
          <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-50">
            <Image
              src={allImages[selectedImage]}
              alt={product.title}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          </div>
          {/* Thumbnails */}
          <div className="flex gap-2 mt-4">
            {allImages.map((img, i) => (
              <button
                key={i}
                onClick={() => setSelectedImage(i)}
                className={cn(
                  "w-16 h-16 rounded border-2 overflow-hidden relative",
                  selectedImage === i ? "border-primary" : "border-gray-200"
                )}
              >
                <Image src={img} alt="" fill sizes="64px" className="object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Right: Product info */}
        <div className="md:w-1/2">
          <h1 className="text-xl md:text-2xl font-bold">{product.title}</h1>

          {/* Stars + reviews */}
          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={14}
                  className={
                    star <= Math.round(product.rating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300"
                  }
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              ({product.reviewCount} reviews)
            </span>
          </div>

          {/* Seller + Brand */}
          <div className="mt-3 text-sm text-muted-foreground space-y-1">
            <p>
              Sold by:{" "}
              <Link href={`/shop/${product.seller.slug}`} className="text-primary hover:underline">
                {product.seller.name}
              </Link>
            </p>
            <p>Brand: <span className="font-medium text-foreground">{product.brand}</span></p>
            <p>SKU: {product.sku}</p>
          </div>

          {/* Price */}
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-destructive">
              ${product.price.toFixed(2)}
            </span>
            {product.originalPrice && (
              <span className="text-lg text-muted-foreground line-through">
                ${product.originalPrice.toFixed(2)}
              </span>
            )}
          </div>
        

          {/* Color selector */}
          {product.colors.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">
                Color: <span className="font-normal text-muted-foreground">{selectedColor}</span>
              </p>
              <div className="flex gap-2">
                {product.colors.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setSelectedColor(c.name)}
                    className={cn(
                      "w-8 h-8 rounded-full border-2",
                      selectedColor === c.name
                        ? "ring-2 ring-primary ring-offset-2"
                        : "border-gray-300"
                    )}
                    style={{ backgroundColor: c.hex }}
                    aria-label={c.name}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Size selector */}
          {product.sizes.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Size:</p>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size) => (
                  <Button
                    key={size}
                    variant={selectedSize === size ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedSize(size)}
                  >
                    {size}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity + total */}
          <div className="mt-4 flex items-center gap-4">
            <QuantitySelector
              value={quantity}
              onChange={setQuantity}
              max={product.stockCount}
            />
            <span className="text-sm text-muted-foreground">
              ({product.stockCount} available)
            </span>
          </div>
          <p className="mt-2 text-sm">
            Total Price:{" "}
            <span className="font-bold text-destructive">
              ${totalPrice.toFixed(2)}
            </span>
          </p>

          {/* Action buttons */}
          <div className="mt-6 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={handleAddToCart}>
              Add to Cart
            </Button>
            <Button className="flex-1" onClick={handleBuyNow}>
              BUY NOW
            </Button>
          </div>

          {/* Wishlist + share */}
          <div className="mt-4 flex items-center gap-6 text-sm">
            <button
              onClick={() => (isInWishlist ? wishlistRemove(product.id) : wishlistAdd(product))}
              className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
            >
              <Heart size={16} fill={isInWishlist ? "currentColor" : "none"} className={isInWishlist ? "text-primary" : ""} />
              {isInWishlist ? "In Wishlist" : "Add to Wishlist"}
            </button>
            <button className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
              <Share2 size={16} />
              Share
            </button>
          </div>

          {/* Shipping info */}
          <div className="mt-6 space-y-2 text-sm text-muted-foreground border-t pt-4">
            <div className="flex items-center gap-2">
              <Truck size={16} />
              <span>Free shipping on orders over $100</span>
            </div>
            <div className="flex items-center gap-2">
              <RotateCcw size={16} />
              <Link href="/return-policy" className="hover:text-primary">
                View Return Policy
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs: Description / Reviews / Seller Info */}
      <div className="mt-12">
        <Tabs defaultValue="description">
          <TabsList>
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="reviews">Reviews ({product.reviewCount})</TabsTrigger>
            <TabsTrigger value="seller-info">Seller Info</TabsTrigger>
          </TabsList>
          <TabsContent value="description" className="mt-4">
            <div
              className="prose prose-sm max-w-none text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: product.description }}
            />
          </TabsContent>
          <TabsContent value="reviews" className="mt-4">
            {product.reviewCount === 0 ? (
              <p className="text-muted-foreground text-sm">No reviews yet. Be the first to review this product.</p>
            ) : (
              <div className="space-y-4">
                {[...Array(Math.min(product.reviewCount, 3))].map((_, i) => (
                  <div key={i} className="border-b pb-4">
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={12}
                            className={
                              star <= (5 - i * 0.5)
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300"
                            }
                          />
                        ))}
                      </div>
                      <span className="text-sm font-medium">Customer {i + 1}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(Date.now() - i * 7 * 86400000).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Great product! Exactly as described and fast shipping.
                    </p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          <TabsContent value="seller-info" className="mt-4">
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-100">
                <Image
                  src={product.seller.logo}
                  alt={product.seller.name}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </div>
              <div>
                <Link
                  href={`/shop/${product.seller.slug}`}
                  className="font-semibold hover:text-primary transition-colors"
                >
                  {product.seller.name}
                </Link>
                <div className="flex items-center gap-1 mt-1">
                  <Star size={12} className="fill-yellow-400 text-yellow-400" />
                  <span className="text-sm text-muted-foreground">
                    {product.seller.rating} · {product.seller.productCount} products
                  </span>
                </div>
                <Button variant="outline" size="sm" className="mt-2">
                  Visit Store
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="mt-12">
          <SectionHeader title="Related Products" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
