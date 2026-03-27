"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Eye,
  Edit,
  Trash2,
  Copy,
  ChevronLeft,
  ChevronRight,
  Search,
  Package,
  Download,
  Warehouse,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { WarehouseProductItem } from '@/lib/types';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value || 0);
}

export default function SellerWarehousePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [products, setProducts] = useState<WarehouseProductItem[]>([] as WarehouseProductItem[]);
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
      setCurrentPage(1);

      const params = new URLSearchParams({
        page: "1",
        limit: String(perPage),
        search: searchQuery,
      });

      const response = await fetch(`/api/seller/storehouse?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await response.json();

      if (!active) return;

      if (!response.ok) {
        setError(data.error || "Failed to load warehouse");
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
  }, [searchQuery]);

  const refreshProducts = async (pageNum = currentPage) => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(pageNum),
      limit: String(perPage),
      search: searchQuery,
    });
    const response = await fetch(`/api/seller/storehouse?${params.toString()}`, {
      cache: "no-store",
    });
    const data = await response.json();
    setLoading(false);
    if (response.ok) {
      setProducts(data.items || []);
      setTotalCount(data.total || 0);
    }
  };

  const togglePublished = async (product: WarehouseProductItem, next: boolean) => {
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

  const toggleFeatured = async (product: WarehouseProductItem, next: boolean) => {
    await fetch(`/api/seller/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFeatured: next }),
    });
    setProducts((prev) =>
      prev.map((item) =>
        item.id === product.id ? { ...item, is_featured: next ?? false } : item,
      ),
    );
  };

  const togglePromoted = async (product: WarehouseProductItem, next: boolean) => {
    await fetch(`/api/seller/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPromoted: next }),
    });
    setProducts((prev) =>
      prev.map((item) =>
        item.id === product.id ? { ...item, is_promoted: next ?? false } : item,
      ),
    );
  };

  const deleteProduct = async (id: string) => {
    const confirmed = window.confirm("Delete this product from warehouse?");
    if (!confirmed) return;

    const response = await fetch(`/api/seller/products/${id}`, {
      method: "DELETE",
    });

    if (response.ok) {
      await refreshProducts(currentPage);
    }
  };

  const duplicateProduct = async (id: string) => {
    const response = await fetch(`/api/seller/products/${id}/duplicate`, {
      method: "POST",
    });

    if (response.ok) {
      await refreshProducts(currentPage);
    }
  };

  const exportCSV = () => {
    if (products.length === 0) return;
    const headers = ["#", "Name", "Category", "Stock", "Price", "Published", "Featured", "Status"];
    const rows = products.map((p) => [
      p.index,
      `"${p.title.replace(/"/g, '""')}"`,
      p.categories?.[0]?.name || "-",
      p.stock_count,
      p.price.toFixed(2),
      p.is_active ? "Yes" : "No",
      p.is_featured ? "Yes" : "No",
      p.reason || "Active",
    ]);
    const csv = [headers.join(","),
...rows.map((r) => r.join(",")), ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `warehouse-products-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Warehouse className="size-7 text-purple-600" />
        <h1 className="text-2xl font-bold text-gray-900">Warehouse</h1>
      </div>

      {/* Total Counter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl px-8 py-5 text-center min-w-[200px]">
          <div className="size-10 bg-white/20 rounded-full mx-auto mb-2 flex items-center justify-center">
            <Package className="size-5" />
          </div>
          <p className="text-4xl font-black">{totalCount}</p>
          <p className="text-sm opacity-90 font-medium">Warehouse Items</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Button
            variant="outline"
            className="gap-2 text-sm"
            onClick={exportCSV}
            disabled={products.length === 0}
          >
            <Download className="size-4" />
            Export CSV
          </Button>
          <Link href="/seller/products/new" className="whitespace-nowrap">
            <Button className="gap-2">
              <Package className="size-4" />
              Add Product
            </Button>
          </Link>
        </div>
      </div>

      {/* Warehouse Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800">
            All Warehouse Products
          </h2>
          <div className="relative w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
              }}
              className="pl-11 h-11 text-sm border-gray-200 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500 uppercase tracking-wider text-xs">
                <th className="text-left px-6 py-4 font-semibold w-12">#</th>
                <th className="text-left px-6 py-4 font-semibold">Image</th>
                <th className="text-left px-6 py-4 font-semibold">Product Name</th>
                <th className="text-left px-6 py-4 font-semibold">Category</th>
                <th className="text-left px-6 py-4 font-semibold">Stock</th>
                <th className="text-left px-6 py-4 font-semibold">Price</th>
                <th className="text-center px-6 py-4 font-semibold">Active</th>
                <th className="text-center px-6 py-4 font-semibold">Featured</th>
                <th className="text-center px-6 py-4 font-semibold">Promo</th>
                <th className="text-left px-6 py-4 font-semibold">Status</th>
                <th className="text-right px-6 py-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-6 py-16 text-center text-gray-500 text-lg">
                    <Package className="size-12 mx-auto mb-4 text-gray-300" />
                    Loading warehouse...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={11} className="px-6 py-16 text-center text-red-500">
                    {error}
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-20 text-center text-gray-500">
                    <Package className="size-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium mb-1">No products in warehouse</p>
                    <p className="text-sm">Add your first product to get started.</p>
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-500 font-mono text-sm">{product.index}</td>
                    <td className="px-6 py-4">
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-50 border">
                        <Image
                          src={product.image_url || `/api/placeholder/56/56`}
                          alt={product.title}
                          width={56}
                          height={56}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-md">
                      <p className="font-medium text-gray-900 line-clamp-2 text-sm leading-tight">
                        {product.title}
                      </p>
                      {product.sku && (
                        <p className="text-xs text-gray-500 mt-1">SKU: {product.sku}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-gray-100 text-xs font-medium rounded-full text-gray-700">
                        {product.categories?.[0]?.name || "Uncategorized"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        product.stock_count > 0 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {product.stock_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono font-semibold text-indigo-600 text-sm">
                      {formatCurrency(product.price)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <ToggleSwitch
                        active={product.is_active}
                        onChange={(next) => togglePublished(product, next)}
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <ToggleSwitch 
                        active={Boolean(product.is_featured)} 
                        onChange={(next) => toggleFeatured(product, next)} 
                      />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <ToggleSwitch 
                        active={Boolean(product.is_promoted)} 
                        onChange={(next) => togglePromoted(product, next)} 
                      />
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        product.reason 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {product.reason || "Active"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/product/${product.slug}`}
                          className="size-9 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-600 flex items-center justify-center transition-colors"
                          title="View Live"
                        >
                          <Eye className="size-4" />
                        </Link>
                        <Link
                          href={`/seller/products/${product.id}/edit`}
                          className="size-9 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 flex items-center justify-center transition-colors"
                          title="Edit"
                        >
                          <Edit className="size-4" />
                        </Link>
                        <button
                          onClick={() => duplicateProduct(product.id)}
                          className="size-9 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors"
                          title="Duplicate"
                        >
                          <Copy className="size-4" />
                        </button>
                        <button
                          onClick={() => deleteProduct(product.id)}
                          className="size-9 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="size-4" />
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
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1 p-6 border-t border-gray-100 bg-gray-50">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1 || loading}
              className="size-10 rounded-lg flex items-center justify-center text-gray-500 hover:bg-white disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="size-5" />
            </button>
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              const pageNum = currentPage <= 3 
                ? i + 1 
                : currentPage >= totalPages - 3 
                ? totalPages - 6 + i 
                : currentPage - 3 + i;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  disabled={loading}
                  className={`size-10 rounded-lg font-semibold transition-all ${
                    currentPage === pageNum
                      ? "bg-indigo-600 text-white shadow-md"
                      : "text-gray-600 hover:bg-white hover:shadow-sm"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            {totalPages > 7 && (
              <>
                <span className="px-2 text-gray-400">...</span>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  className="size-10 rounded-lg text-gray-600 hover:bg-white transition-colors"
                >
                  {totalPages}
                </button>
              </>
            )}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages || loading}
              className="size-10 rounded-lg flex items-center justify-center text-gray-500 hover:bg-white disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="size-5" />
            </button>
            <span className="text-sm text-gray-500 ml-4">
              Page {currentPage} of {totalPages}
            </span>
          </div>
        )}
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
      onClick={(e) => {
        e.stopPropagation();
        onChange(!active);
      }}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
        active ? "bg-green-600" : "bg-gray-200"
      }`}
    >
      <span className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
        active ? "translate-x-6" : "translate-x-1"
      }`} />
    </button>
  );
}

