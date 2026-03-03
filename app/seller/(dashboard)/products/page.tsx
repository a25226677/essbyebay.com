"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  PlusCircle,
  Eye,
  Edit,
  Trash2,
  Copy,
  ChevronLeft,
  ChevronRight,
  Search,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ProductItem = {
  id: string;
  title: string;
  slug: string;
  price: number;
  stock_count: number;
  is_active: boolean;
  is_featured: boolean;
  image_url: string | null;
  categories?: { name: string } | null;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value || 0);
}

export default function SellerProductsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const perPage = 10;

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalCount / perPage)),
    [totalCount],
  );

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(perPage),
        search: searchQuery,
      });

      const response = await fetch(`/api/seller/products?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await response.json();

      if (!active) return;

      if (!response.ok) {
        setError(data.error || "Failed to load products");
        setProducts([]);
        setTotalCount(0);
      } else {
        setProducts(data.items || []);
        setTotalCount(data.total || 0);
      }

      setLoading(false);
    }

    loadProducts();

    return () => {
      active = false;
    };
  }, [currentPage, perPage, searchQuery]);

  const refreshProducts = async () => {
    const params = new URLSearchParams({
      page: String(currentPage),
      limit: String(perPage),
      search: searchQuery,
    });
    const response = await fetch(`/api/seller/products?${params.toString()}`, {
      cache: "no-store",
    });
    const data = await response.json();
    if (response.ok) {
      setProducts(data.items || []);
      setTotalCount(data.total || 0);
    }
  };

  const togglePublished = async (product: ProductItem, next: boolean) => {
    await fetch(`/api/seller/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: next }),
    });
    setProducts((prev) =>
      prev.map((item) =>
        item.id === product.id ? { ...item, is_active: next } : item,
      ),
    );
  };

  const toggleFeatured = async (product: ProductItem, next: boolean) => {
    await fetch(`/api/seller/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFeatured: next }),
    });
    setProducts((prev) =>
      prev.map((item) =>
        item.id === product.id ? { ...item, is_featured: next } : item,
      ),
    );
  };

  const deleteProduct = async (id: string) => {
    const confirmed = window.confirm("Delete this product?");
    if (!confirmed) return;

    const response = await fetch(`/api/seller/products/${id}`, {
      method: "DELETE",
    });

    if (response.ok) {
      await refreshProducts();
    }
  };

  const duplicateProduct = async (id: string) => {
    const response = await fetch(`/api/seller/products/${id}/duplicate`, {
      method: "POST",
    });

    if (response.ok) {
      await refreshProducts();
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-800">Products</h1>

      {/* Upload Counter + Add Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl px-8 py-5 text-center min-w-[200px]">
          <div className="size-8 bg-white/20 rounded-full mx-auto mb-1 flex items-center justify-center">
            <Package className="size-4 text-white" />
          </div>
          <p className="text-3xl font-bold">{totalCount}</p>
          <p className="text-sm opacity-90">Total Products</p>
        </div>

        <Link href="/seller/products/new">
          <Button
            variant="ghost"
            className="flex flex-col items-center gap-1 h-auto py-3"
          >
            <PlusCircle className="size-10 text-gray-400" />
            <span className="text-xs text-sky-600 font-medium">
              Add New Product
            </span>
          </Button>
        </Link>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">
            All products
          </h2>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <Input
              placeholder="Search product"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500">
                <th className="text-left px-4 py-3 font-medium w-10">#</th>
                <th className="text-left px-4 py-3 font-medium">
                  Thumbnail Image
                </th>
                <th className="text-left px-4 py-3 font-medium">Name</th>
                <th className="text-left px-4 py-3 font-medium">Category</th>
                <th className="text-left px-4 py-3 font-medium">
                  Current Qty
                </th>
                <th className="text-left px-4 py-3 font-medium">
                  Base Price
                </th>
                <th className="text-center px-4 py-3 font-medium">
                  Published
                </th>
                <th className="text-center px-4 py-3 font-medium">
                  Featured
                </th>
                <th className="text-center px-4 py-3 font-medium">
                  Promotions
                </th>
                <th className="text-right px-4 py-3 font-medium">Options</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-gray-500">
                    Loading products...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-red-500">
                    {error}
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-gray-500">
                    No products found
                  </td>
                </tr>
              ) : (
                products.map((product, idx) => (
                  <tr
                    key={product.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-3 text-gray-500">
                      {(currentPage - 1) * perPage + idx + 1}
                    </td>
                    <td className="px-4 py-3">
                      <div className="size-14 rounded-lg bg-gray-100 overflow-hidden">
                        <Image
                          src={
                            product.image_url ||
                            `/images/placeholders/product-${(idx % 6) + 1}.svg`
                          }
                          alt={product.title}
                          width={56}
                          height={56}
                          className="size-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56' fill='%23e5e7eb'%3E%3Crect width='56' height='56'/%3E%3C/svg%3E";
                          }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="text-gray-800 line-clamp-2 text-sm">
                        {product.title}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-sm">
                      {product.categories?.name || "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{product.stock_count}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatCurrency(product.price)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ToggleSwitch
                        active={product.is_active}
                        onChange={(next) => togglePublished(product, next)}
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ToggleSwitch active={product.is_featured || false} onChange={(next) => toggleFeatured(product, next)} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ToggleSwitch active={false} onChange={() => {}} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/product/${product.slug}`}
                          className="size-7 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center hover:bg-sky-100"
                        >
                          <Eye className="size-3.5" />
                        </Link>
                        <button className="size-7 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center hover:bg-amber-100"
                          onClick={() => window.location.href = `/seller/products/${product.id}/edit`}
                        >
                          <Edit className="size-3.5" />
                        </button>
                        <button
                          onClick={() => duplicateProduct(product.id)}
                          className="size-7 rounded-full bg-green-50 text-green-600 flex items-center justify-center hover:bg-green-100"
                        >
                          <Copy className="size-3.5" />
                        </button>
                        <button
                          onClick={() => deleteProduct(product.id)}
                          className="size-7 rounded-full bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-center gap-1 p-4">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="size-8 rounded-md flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30"
          >
            <ChevronLeft className="size-4" />
          </button>
          {Array.from({ length: Math.min(10, totalPages) }, (_, i) => i + 1).map(
            (page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`size-8 rounded-md text-sm font-medium flex items-center justify-center ${
                  currentPage === page
                    ? "bg-sky-500 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {page}
              </button>
            )
          )}
          {totalPages > 10 && (
            <>
              <span className="px-1 text-gray-400">...</span>
              <button
                onClick={() => setCurrentPage(totalPages)}
                className={`size-8 rounded-md text-sm font-medium flex items-center justify-center text-gray-600 hover:bg-gray-100`}
              >
                {totalPages}
              </button>
            </>
          )}
          <button
            onClick={() =>
              setCurrentPage(Math.min(totalPages, currentPage + 1))
            }
            disabled={currentPage === totalPages}
            className="size-8 rounded-md flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ToggleSwitch({
  active,
  onChange,
}: {
  active: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!active)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        active ? "bg-green-500" : "bg-gray-300"
      }`}
    >
      <span
        className={`inline-block size-3.5 rounded-full bg-white transition-transform ${
          active ? "translate-x-4.5" : "translate-x-1"
        }`}
      />
    </button>
  );
}
