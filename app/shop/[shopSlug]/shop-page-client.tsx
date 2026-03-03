"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Star, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";
import { ProductCard } from "@/components/product-card";
import type { Shop, Product } from "@/lib/types";

interface Props {
  shop: Shop;
  products: Product[];
}

export function ShopPageClient({ shop, products }: Props) {
  const [sort, setSort] = useState("newest");
  const [priceRange, setPriceRange] = useState([0, 5000]);

  const sorted = useMemo(() => {
    const filtered = products.filter(
      (p) => p.price >= priceRange[0] && p.price <= priceRange[1]
    );

    switch (sort) {
      case "price-asc":
        return filtered.sort((a, b) => a.price - b.price);
      case "price-desc":
        return filtered.sort((a, b) => b.price - a.price);
      case "rating":
        return filtered.sort((a, b) => b.rating - a.rating);
      default:
        return filtered;
    }
  }, [products, sort, priceRange]);

  const FilterSidebar = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-3">Price Range</h3>
        <Slider
          value={priceRange}
          onValueChange={setPriceRange}
          min={0}
          max={5000}
          step={50}
          className="mb-2"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>${priceRange[0]}</span>
          <span>${priceRange[1]}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <BreadcrumbNav
        items={[
          { label: "Shop", href: "/search" },
          { label: shop.name },
        ]}
      />

      

      {/* Shop info */}
      <div className="flex items-center gap-4 mb-8">
        <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-100 border-2 border-white shadow-sm flex-shrink-0">
          <Image src={shop.logo} alt={shop.name} fill sizes="64px" className="object-cover" />
        </div>
        <div>
          <h1 className="text-xl font-bold">{shop.name}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            <Star size={14} className="fill-yellow-400 text-yellow-400" />
            <span>{shop.rating}</span>
            <span>·</span>
            <span>{shop.productCount} products</span>
            <span>·</span>
            <span>Member since {new Date(shop.memberSince).getFullYear()}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2 max-w-2xl">
            {shop.description}
          </p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar — desktop */}
        <aside className="hidden md:block w-64 flex-shrink-0">
          <FilterSidebar />
        </aside>

        {/* Product grid */}
        <div className="flex-1 min-w-0">
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-4">
            <div className="md:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter size={14} className="mr-1" /> Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-6">
                  <h2 className="text-lg font-semibold mb-4">Filters</h2>
                  <FilterSidebar />
                </SheetContent>
              </Sheet>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {sorted.length} products
              </span>
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger className="w-44 h-9">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="price-asc">Price: Low to High</SelectItem>
                  <SelectItem value="price-desc">Price: High to Low</SelectItem>
                  <SelectItem value="rating">Best Rating</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Grid */}
          {sorted.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {sorted.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-muted-foreground">No products found matching your filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
