"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { Plus, Package, Loader2, Check, ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";

type CatalogItem = {
  id: string;
  title: string;
  sku: string;
  price: number;
  stock: number;
  image: string | null;
  category: string;
  brand: string;
  imported: boolean;
};

type FilterOption = { id: string; name: string };

const LIMIT = 50;

export default function ProductStorehousePage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<FilterOption[]>([]);
  const [brands, setBrands] = useState<FilterOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchCatalog = useCallback(async (currentPage: number) => {
    setLoading(true);
    const params = new URLSearchParams({
      search,
      category_id: categoryId,
      brand_id: brandId,
      page: String(currentPage),
      limit: String(LIMIT),
    });
    const res = await fetch(`/api/seller/catalog?${params.toString()}`, { cache: "no-store" });
    const json = await res.json();
    if (res.ok) {
      setItems(json.items ?? []);
      setCategories(json.categories ?? []);
      setBrands(json.brands ?? []);
      setTotalPages(json.pagination?.pages ?? 1);
      setTotal(json.pagination?.total ?? 0);
    }
    setSelected(new Set());
    setLoading(false);
  }, [search, categoryId, brandId]);

  useEffect(() => {
    setPage(1);
    fetchCatalog(1);
  }, [fetchCatalog]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchCatalog(newPage);
  };

  const toggleSelect = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (item?.imported) return; // can't re-select already-imported items
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const importProducts = async (ids: string[]) => {
    const filteredIds = ids.filter((id) => !items.find((i) => i.id === id)?.imported);
    if (filteredIds.length === 0) {
      showToast("All selected products are already in your shop", false);
      return;
    }
    setImporting(true);
    const res = await fetch("/api/seller/catalog/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_ids: filteredIds }),
    });
    const json = await res.json();
    setImporting(false);
    if (res.ok) {
      showToast(
        json.skipped > 0
          ? `Imported ${json.imported} product(s). ${json.skipped} already in your shop.`
          : `Successfully imported ${json.imported} product(s) to your shop!`,
      );
      setSelected(new Set());
      fetchCatalog(page); // refresh to update imported badges
    } else {
      showToast(json.error || "Import failed", false);
    }
  };

  const availableItems = items.filter((i) => !i.imported);
  const importedCount = items.filter((i) => i.imported).length;

  return (
    <div className="space-y-5 relative">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-lg shadow-lg text-sm text-white transition-all ${
            toast.ok ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search by Product Name/Barcode"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[220px] text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400 text-gray-700"
        />
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 min-w-[150px]"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={brandId}
          onChange={(e) => setBrandId(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 min-w-[140px]"
        >
          <option value="">All Brands</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        {!loading && (
          <span className="text-xs text-gray-400 ml-auto">
            {total} product{total !== 1 ? "s" : ""} total
            {importedCount > 0 && ` · ${importedCount} already in shop on this page`}
          </span>
        )}
      </div>

      {/* Product Grid + Action Buttons Layout */}
      <div className="flex gap-4">
        {/* Scrollable product grid */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="h-[calc(100vh-310px)] overflow-y-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="size-8 animate-spin text-purple-400" />
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                <Package className="size-12 mb-3" />
                <p className="text-sm">No products found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
                {items.map((item) => {
                  const isSelected = selected.has(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleSelect(item.id)}
                      className={`group relative rounded-lg border overflow-hidden transition-all ${
                        item.imported
                          ? "border-gray-200 opacity-60 cursor-not-allowed"
                          : "cursor-pointer border-gray-200 hover:border-purple-400 hover:shadow-md"
                      }`}
                    >
                      {/* Stock badge */}
                      <div className="absolute top-2 left-2 z-10">
                        <span className="bg-green-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
                          In stock : {item.stock.toLocaleString()}
                        </span>
                      </div>

                      {/* Already imported badge */}
                      {item.imported && (
                        <div className="absolute top-2 right-2 z-10 flex items-center gap-0.5 bg-blue-600 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded">
                          <ShoppingBag className="size-2.5" />
                          <span>In Shop</span>
                        </div>
                      )}

                      {/* Selected checkmark */}
                      {isSelected && !item.imported && (
                        <div className="absolute top-2 right-2 z-10 w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center">
                          <Check className="size-3 text-white" />
                        </div>
                      )}

                      {/* Image */}
                      <div className="relative w-full aspect-square bg-gray-100">
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.title}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                            className="object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Package className="size-10 text-gray-300" />
                          </div>
                        )}
                        {/* Hover/selected overlay with + icon */}
                        {!item.imported && (
                          <div
                            className={`absolute inset-0 flex items-center justify-center transition-opacity ${
                              isSelected
                                ? "bg-purple-600/20 opacity-100"
                                : "bg-black/25 opacity-0 group-hover:opacity-100"
                            }`}
                          >
                            {!isSelected && (
                              <div className="w-10 h-10 rounded-full border-2 border-white flex items-center justify-center">
                                <Plus className="size-5 text-white" />
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-2">
                        <p className="text-xs font-medium text-gray-800 line-clamp-2 leading-tight">
                          {item.title}
                        </p>
                        <p className="text-sm font-semibold text-gray-900 mt-1">
                          ${item.price.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 bg-gray-50">
              <span className="text-xs text-gray-500">
                Page {page} of {totalPages} &nbsp;·&nbsp; {total} total products
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="size-3.5" /> Prev
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let p: number;
                  if (totalPages <= 7) {
                    p = i + 1;
                  } else if (page <= 4) {
                    p = i + 1;
                  } else if (page >= totalPages - 3) {
                    p = totalPages - 6 + i;
                  } else {
                    p = page - 3 + i;
                  }
                  return (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p)}
                      className={`w-7 h-7 text-xs rounded-lg font-medium transition-colors ${
                        p === page
                          ? "bg-purple-600 text-white"
                          : "border border-gray-200 text-gray-600 hover:bg-white"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next <ChevronRight className="size-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons Panel */}
        <div className="flex flex-col justify-end gap-3 pb-2 shrink-0">
          <button
            onClick={() => importProducts(availableItems.map((i) => i.id))}
            disabled={importing || loading || availableItems.length === 0}
            className="px-5 py-2.5 text-sm font-medium border-2 border-gray-700 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {importing ? <Loader2 className="size-4 animate-spin inline mr-1" /> : null}
            Add all to My Product
            {availableItems.length > 0 && (
              <span className="ml-1.5 text-xs text-gray-400">({availableItems.length})</span>
            )}
          </button>
          <button
            onClick={() => importProducts(Array.from(selected))}
            disabled={importing || selected.size === 0}
            className="px-5 py-2.5 text-sm font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {importing ? <Loader2 className="size-4 animate-spin inline mr-1" /> : null}
            Add to My Product
            {selected.size > 0 && (
              <span className="ml-1.5 bg-white text-gray-900 text-xs font-bold rounded-full px-1.5 py-0.5">
                {selected.size}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
