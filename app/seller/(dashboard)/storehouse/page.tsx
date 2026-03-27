"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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

type ToastState = {
  msg: string;
  tone: "success" | "error" | "info";
  sticky?: boolean;
};

const LIMIT = 50;

export default function ProductStorehousePage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<FilterOption[]>([]);
  const [brands, setBrands] = useState<FilterOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [basePoolTotal, setBasePoolTotal] = useState(0);
  const [remainingTotal, setRemainingTotal] = useState(0);
  const [importingAll, setImportingAll] = useState(false);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longRunningToastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearToastTimers = useCallback(() => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = null;
    }
    if (longRunningToastRef.current) {
      clearTimeout(longRunningToastRef.current);
      longRunningToastRef.current = null;
    }
  }, []);

  const showToast = useCallback((msg: string, tone: ToastState["tone"], sticky?: boolean) => {
    clearToastTimers();
    setToast({ msg, tone, sticky });
    if (!sticky) {
      toastTimeoutRef.current = setTimeout(() => setToast(null), 4000);
    }
  }, [clearToastTimers]);

  const formatImportSummary = (imported: number, skipped: number) => {
    const parts = [];
    if (imported > 0) parts.push(`${imported.toLocaleString()} imported`);
    if (skipped > 0) parts.push(`${skipped.toLocaleString()} skipped`);
    return parts.join(", ") || "No changes";
  };

  const fetchCatalog = useCallback(async (pageNum: number = 1) => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(pageNum),
      limit: String(LIMIT),
      search,
      category_id: categoryId,
      brand_id: brandId,
    });
    const res = await fetch(`/api/seller/catalog?${params.toString()}`, { cache: "no-store" });
    const json = await res.json();
    if (res.ok) {
      setItems(json.items ?? []);
      setCategories(json.categories ?? []);
      setBrands(json.brands ?? []);
      setTotalPages(json.pagination?.pages ?? 1);
      setTotal(json.pagination?.total ?? 0);
      setBasePoolTotal(json.pagination?.baseTotal ?? json.pagination?.total ?? 0);
      setRemainingTotal(json.pagination?.remainingTotal ?? json.pagination?.total ?? 0);
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
    if (item?.imported) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const importSelected = async () => {
    if (selected.size === 0) return;
    setImporting(true);
    showToast("Importing selected items...", "info", true);

    try {
      const res = await fetch("/api/seller/catalog/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      const json = await res.json();

      if (!res.ok) {
        showToast(json.error || "Import failed", "error");
      } else {
        showToast(
          formatImportSummary(json.imported ?? 0, json.skipped ?? 0),
          (json.imported ?? 0) > 0 ? "success" : "info",
        );
        fetchCatalog(page);
      }
    } finally {
      setImporting(false);
    }
  };

  const importAll = async () => {
    const confirmed = window.confirm(
      `Import all ${total.toLocaleString()} products${
        search || categoryId || brandId ? " matching current filters" : ""
      } to your shop?\n\nThis may take a moment.`,
    );
    if (!confirmed) return;

    setImportingAll(true);
    showToast("Starting import...", "info", true);

    let currentPage = 0;
    let totalImported = 0;
    let totalSkipped = 0;

    try {
      while (true) {
        const res = await fetch("/api/seller/catalog/import-all", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            search,
            category_id: categoryId,
            brand_id: brandId,
            page: currentPage,
          }),
        });
        const json = await res.json();

        if (!res.ok) {
          showToast(json.error || "Import failed", "error");
          return;
        }

        totalImported += json.imported ?? 0;
        totalSkipped += json.skipped ?? 0;

        if (json.hasMore) {
          setToast({
            msg: `Importing... ${(totalImported + totalSkipped).toLocaleString()} processed, ${totalImported.toLocaleString()} added.`,
            tone: "info",
            sticky: true,
          });
          currentPage = json.nextPage;
        } else {
          break;
        }
      }

      showToast(
        formatImportSummary(totalImported, totalSkipped),
        totalImported > 0 ? "success" : "info",
      );
      fetchCatalog(page);
    } finally {
      setImportingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Package className="size-7 text-purple-600" />
        <h1 className="text-2xl font-bold text-gray-900">Warehouse</h1>
      </div>

      {/* Total Counter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl px-8 py-5 text-center min-w-[200px]">
          <div className="size-10 bg-white/20 rounded-full mx-auto mb-2 flex items-center justify-center">
            <Package className="size-5" />
          </div>
          <p className="text-4xl font-black">{total}</p>
          <p className="text-sm opacity-90 font-medium">Warehouse Items</p>
        </div>
      </div>

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
            Base Pool: {basePoolTotal.toLocaleString()} &nbsp;|&nbsp; Remaining: {remainingTotal.toLocaleString()}
          </span>
        )}
      </div>

      {/* Import Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={importSelected}
          disabled={selected.size === 0 || importing}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {importing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Plus className="size-4" />
          )}
          Import Selected ({selected.size})
        </button>
        <button
          onClick={importAll}
          disabled={importingAll || total === 0}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {importingAll ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ShoppingBag className="size-4" />
          )}
          Import All ({total.toLocaleString()})
        </button>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
            toast.tone === "success"
              ? "bg-green-600 text-white"
              : toast.tone === "error"
              ? "bg-red-600 text-white"
              : "bg-gray-800 text-white"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Warehouse Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800">
            All Warehouse Products
          </h2>
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
                <th className="text-center px-6 py-4 font-semibold">Status</th>
                <th className="text-right px-6 py-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-gray-500 text-lg">
                    <Package className="size-12 mx-auto mb-4 text-gray-300" />
                    Loading warehouse...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center text-gray-500">
                    <Package className="size-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium mb-1">No products in warehouse</p>
                    <p className="text-sm">Add your first product to get started.</p>
                  </td>
                </tr>
              ) : (
                items.map((item, index) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-500 font-mono text-sm">{(page - 1) * LIMIT + index + 1}</td>
                    <td className="px-6 py-4">
                      <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-50 border">
                        <Image
                          src={item.image || `/api/placeholder/56/56`}
                          alt={item.title}
                          width={56}
                          height={56}
                          className="w-full h-full object-cover"
                        />
                        {item.imported && (
                          <div className="absolute top-1 right-1 z-10 flex items-center gap-0.5 bg-blue-600 text-white text-[10px] font-semibold px-1 py-0.5 rounded">
                            <ShoppingBag className="size-2" />
                          </div>
                        )}
                        {selected.has(item.id) && !item.imported && (
                          <div className="absolute top-1 right-1 z-10 w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center">
                            <Check className="size-3 text-white" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900 line-clamp-2">{item.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">SKU: {item.sku}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{item.category}</td>
                    <td className="px-6 py-4 text-gray-600">{item.stock}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">${item.price.toFixed(2)}</td>
                    <td className="px-6 py-4 text-center">
                      {item.imported ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                          <ShoppingBag className="size-3" />
                          In Shop
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                          Available
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!item.imported && (
                        <button
                          onClick={() => toggleSelect(item.id)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                            selected.has(item.id)
                              ? "bg-purple-600 text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-purple-100 hover:text-purple-700"
                          }`}
                        >
                          {selected.has(item.id) ? "Selected" : "Select"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 bg-gray-50">
            <span className="text-xs text-gray-500">
              Page {page} of {totalPages} &nbsp;·&nbsp; Base Pool {basePoolTotal.toLocaleString()} &nbsp;·&nbsp; Remaining {remainingTotal.toLocaleString()}
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
    </div>
  );
}
