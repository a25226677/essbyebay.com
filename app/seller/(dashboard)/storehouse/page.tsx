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
    if (item?.imported) return; // can't re-select already-imported items
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
            Base Pool: {basePoolTotal.toLocaleString()} &nbsp;|&nbsp; Remaining: {remainingTotal.toLocaleString()}
          </span>
        )}
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
