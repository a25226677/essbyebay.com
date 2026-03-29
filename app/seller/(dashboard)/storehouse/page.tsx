"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Package,
  RefreshCw,
  Search,
  ShoppingBag,
} from "lucide-react";

type CatalogItem = {
  id: string;
  title: string;
  sku: string;
  price: number;
  stock: number;
  image: string | null;
  category: string;
  brand: string;
  imported?: boolean;
};

type FilterOption = { id: string; name: string };

type CatalogResponse = {
  items?: CatalogItem[];
  categories?: FilterOption[];
  brands?: FilterOption[];
  pagination?: {
    page?: number;
    limit?: number;
    total?: number;
    pages?: number;
    baseTotal?: number;
    remainingTotal?: number;
    hasMore?: boolean;
    exact?: boolean;
  };
  error?: string;
};

type ToastState = {
  msg: string;
  tone: "success" | "error" | "info";
  sticky?: boolean;
};

type ImportAllProgressState = {
  startedAt: number;
  elapsedSec: number;
  imported: number;
  skipped: number;
  attempted: number;
  targetTotal: number | null;
  batches: number;
  hasMore: boolean;
  phase: "running" | "done" | "error";
  message: string;
};

const LIMIT = 50;
const SEARCH_DEBOUNCE_MS = 350;
const MAX_IMPORT_ALL_BATCH_REQUESTS = 200;
const CATALOG_REQUEST_TIMEOUT_MS = 15000;
const CATALOG_RETRY_DELAY_MS = 350;
const CATALOG_MAX_ATTEMPTS = 2;

function formatElapsed(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function ProductStorehousePage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<FilterOption[]>([]);
  const [brands, setBrands] = useState<FilterOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importingAll, setImportingAll] = useState(false);
  const [importAllProgress, setImportAllProgress] = useState<ImportAllProgressState | null>(
    null,
  );
  const [toast, setToast] = useState<ToastState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [basePoolTotal, setBasePoolTotal] = useState(0);
  const [remainingTotal, setRemainingTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [exactTotals, setExactTotals] = useState(true);
  const [reloadNonce, setReloadNonce] = useState(0);

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

  const showToast = useCallback(
    (msg: string, tone: ToastState["tone"], sticky?: boolean) => {
      clearToastTimers();
      setToast({ msg, tone, sticky });
      if (!sticky) {
        toastTimeoutRef.current = setTimeout(() => setToast(null), 4000);
      }
    },
    [clearToastTimers],
  );

  const formatImportSummary = (imported: number, skipped: number) => {
    const parts = [];
    if (imported > 0) parts.push(`${imported.toLocaleString()} imported`);
    if (skipped > 0) parts.push(`${skipped.toLocaleString()} skipped`);
    return parts.join(", ") || "No changes";
  };

  const toCatalogError = useCallback((message: string, retryable = false) => {
    const error = new Error(message) as Error & { retryable?: boolean };
    error.retryable = retryable;
    return error;
  }, []);

  const sleepWithSignal = useCallback((ms: number, signal: AbortSignal) => {
    return new Promise<void>((resolve, reject) => {
      if (signal.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }

      const timeout = setTimeout(() => {
        signal.removeEventListener("abort", onAbort);
        resolve();
      }, ms);

      const onAbort = () => {
        clearTimeout(timeout);
        reject(new DOMException("Aborted", "AbortError"));
      };

      signal.addEventListener("abort", onAbort, { once: true });
    });
  }, []);

  const buildCatalogErrorMessage = useCallback((status: number, responseText: string) => {
    const snippet = responseText.replace(/\s+/g, " ").trim().slice(0, 200).toLowerCase();
    if (status === 401 || status === 403) {
      return "Your session has expired or seller access is missing. Please sign in again.";
    }
    if (status === 504 || snippet.includes("request timeout") || snippet.includes("timed out")) {
      return "Catalog request timed out. Please refresh and try again.";
    }
    if (status >= 500) {
      return "Catalog service is temporarily unavailable. Please retry shortly.";
    }
    if (status === 404) {
      return "Catalog endpoint not found. Please contact support.";
    }
    return `Unable to load products (${status}).`;
  }, []);

  const parseCatalogResponse = useCallback(
    async (res: Response) => {
      const contentType = (res.headers.get("content-type") || "").toLowerCase();
      if (contentType.includes("application/json")) {
        const json = (await res.json()) as CatalogResponse;
        if (!res.ok) {
          const message = json.error || `Unable to load products (${res.status})`;
          throw toCatalogError(message, res.status >= 500 || res.status === 429);
        }
        return json;
      }

      const text = await res.text();
      const friendlyMessage = buildCatalogErrorMessage(res.status, text);
      throw toCatalogError(friendlyMessage, res.status >= 500 || res.status === 429);
    },
    [buildCatalogErrorMessage, toCatalogError],
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      const normalized = searchInput.trim();
      setSearch((prev) => {
        if (prev === normalized) return prev;
        setPage(1);
        return normalized;
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  const fetchCatalog = useCallback(
    async (signal: AbortSignal) => {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: String(page),
        limit: String(LIMIT),
      });
      if (search) params.set("search", search);
      if (categoryId) params.set("category_id", categoryId);
      if (brandId) params.set("brand_id", brandId);

      try {
        let json: CatalogResponse | null = null;

        for (let attempt = 1; attempt <= CATALOG_MAX_ATTEMPTS; attempt += 1) {
          const attemptController = new AbortController();
          let timedOut = false;

          const onAbort = () => attemptController.abort();
          if (signal.aborted) return;
          signal.addEventListener("abort", onAbort, { once: true });

          const timeoutId = setTimeout(() => {
            timedOut = true;
            attemptController.abort();
          }, CATALOG_REQUEST_TIMEOUT_MS);

          try {
            const res = await fetch(`/api/seller/catalog?${params.toString()}`, {
              cache: "no-store",
              signal: attemptController.signal,
            });
            json = await parseCatalogResponse(res);
            break;
          } catch (err) {
            if (signal.aborted) return;

            const isAbortError =
              err instanceof DOMException && err.name === "AbortError";
            const retryable =
              timedOut ||
              ((err as { retryable?: boolean }).retryable ?? false) ||
              isAbortError;

            if (attempt < CATALOG_MAX_ATTEMPTS && retryable) {
              await sleepWithSignal(CATALOG_RETRY_DELAY_MS, signal);
              continue;
            }

            if (timedOut) {
              throw new Error("Catalog request timed out. Please refresh and try again.");
            }
            if (isAbortError) {
              throw new Error("Catalog request was interrupted. Please retry.");
            }
            throw err;
          } finally {
            clearTimeout(timeoutId);
            signal.removeEventListener("abort", onAbort);
          }
        }

        if (!json) {
          throw new Error("Empty response from catalog API.");
        }

        const exact = json.pagination?.exact !== false;
        const pageHasMore = Boolean(
          json.pagination?.hasMore ??
            Number(json.pagination?.page ?? page) <
              Number(json.pagination?.pages ?? page),
        );
        const fetchedCount = (json.items ?? []).length;
        const nextTotal = exact
          ? Number(json.pagination?.total ?? 0)
          : Number(
              json.pagination?.total ??
                (page - 1) * LIMIT + fetchedCount + (pageHasMore ? 1 : 0),
            );
        const nextBasePool = exact
          ? Number(json.pagination?.baseTotal ?? nextTotal)
          : Number(json.pagination?.baseTotal ?? nextTotal);
        const nextRemaining = exact
          ? Number(json.pagination?.remainingTotal ?? nextTotal)
          : Number(json.pagination?.remainingTotal ?? nextTotal);
        const nextPages = exact
          ? Number(json.pagination?.pages ?? (nextTotal > 0 ? Math.ceil(nextTotal / LIMIT) : 1))
          : Math.max(page, pageHasMore ? page + 1 : page);

        setItems(json.items ?? []);
        setCategories(json.categories ?? []);
        setBrands(json.brands ?? []);
        setExactTotals(exact);
        setHasMore(pageHasMore);
        setTotalPages(Math.max(nextPages, 1));
        setTotal(Math.max(nextTotal, 0));
        setBasePoolTotal(Math.max(nextBasePool, 0));
        setRemainingTotal(Math.max(nextRemaining, 0));
        setSelected(new Set());
      } catch (err) {
        if (signal.aborted) return;
        const message =
          err instanceof Error ? err.message : "Unable to load warehouse catalog";
        setError(message);
        setItems([]);
        setTotalPages(1);
        setTotal(0);
        setBasePoolTotal(0);
        setRemainingTotal(0);
        setHasMore(false);
        setExactTotals(true);
        setSelected(new Set());
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    },
    [
      page,
      search,
      categoryId,
      brandId,
      parseCatalogResponse,
      sleepWithSignal,
    ],
  );

  useEffect(() => {
    const controller = new AbortController();
    void fetchCatalog(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchCatalog, reloadNonce]);

  useEffect(() => {
    return () => {
      clearToastTimers();
    };
  }, [clearToastTimers]);

  useEffect(() => {
    if (!importAllProgress || importAllProgress.phase !== "running") return;

    const timer = setInterval(() => {
      setImportAllProgress((prev) => {
        if (!prev || prev.phase !== "running") return prev;
        return {
          ...prev,
          elapsedSec: Math.floor((Date.now() - prev.startedAt) / 1000),
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [importAllProgress]);

  useEffect(() => {
    if (!importAllProgress || importAllProgress.phase === "running") return;
    const timeout = setTimeout(() => setImportAllProgress(null), 12000);
    return () => clearTimeout(timeout);
  }, [importAllProgress]);

  const refreshCatalog = useCallback((resetToFirstPage?: boolean) => {
    if (resetToFirstPage) {
      setPage(1);
    }
    setReloadNonce((prev) => prev + 1);
  }, []);

  const selectedCount = selected.size;
  const allVisibleSelected = useMemo(
    () => items.length > 0 && items.every((item) => selected.has(item.id)),
    [items, selected],
  );

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        items.forEach((item) => next.delete(item.id));
      } else {
        items.forEach((item) => next.add(item.id));
      }
      return next;
    });
  };

  const importSelected = async () => {
    if (selectedCount === 0) return;
    setImporting(true);
    showToast("Adding selected products...", "info", true);

    try {
      const res = await fetch("/api/seller/catalog/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_ids: Array.from(selected) }),
      });
      const json = (await res.json()) as {
        error?: string;
        imported?: number;
        skipped?: number;
      };

      if (!res.ok) {
        showToast(json.error || "Add to My Product failed", "error");
        return;
      }

      showToast(
        formatImportSummary(json.imported ?? 0, json.skipped ?? 0),
        (json.imported ?? 0) > 0 ? "success" : "info",
      );
      setSelected(new Set());
      refreshCatalog(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Add to My Product failed";
      showToast(message, "error");
    } finally {
      setImporting(false);
    }
  };

  const importAll = async () => {
    if (remainingTotal === 0 && !hasMore) return;

    const remainingDisplayLabel = exactTotals
      ? remainingTotal.toLocaleString()
      : `${remainingTotal.toLocaleString()}+`;

    const confirmed = window.confirm(
      `Add all ${remainingDisplayLabel} available products${
        search || categoryId || brandId ? " matching current filters" : ""
      } to your shop?\n\nThis may take a moment.`,
    );
    if (!confirmed) return;

    setImportingAll(true);
    showToast("Starting add-all import...", "info", true);
    const startedAt = Date.now();
    setImportAllProgress({
      startedAt,
      elapsedSec: 0,
      imported: 0,
      skipped: 0,
      attempted: 0,
      targetTotal: exactTotals ? remainingTotal : null,
      batches: 0,
      hasMore: true,
      phase: "running",
      message: "Starting import...",
    });

    let totalImported = 0;
    let totalSkipped = 0;
    let requestCount = 0;
    let hasMoreBatches = true;

    try {
      while (hasMoreBatches) {
        requestCount += 1;
        if (requestCount > MAX_IMPORT_ALL_BATCH_REQUESTS) {
          throw new Error("Import stopped after too many batches. Please retry.");
        }

        const res = await fetch("/api/seller/catalog/import-all", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            search,
            category_id: categoryId || null,
            brand_id: brandId || null,
          }),
          cache: "no-store",
        });

        const json = (await res.json()) as {
          error?: string;
          imported?: number;
          skipped?: number;
          attempted?: number;
          hasMore?: boolean;
        };

        if (!res.ok) {
          throw new Error(json.error || "Add all to My Product failed");
        }

        const imported = Number(json.imported ?? 0);
        const skipped = Number(json.skipped ?? 0);
        const attempted = Number(json.attempted ?? imported + skipped);

        totalImported += imported;
        totalSkipped += skipped;

        hasMoreBatches = Boolean(json.hasMore) && attempted > 0;
        const totalAttempted = totalImported + totalSkipped;

        setImportAllProgress((prev) =>
          prev
            ? {
                ...prev,
                imported: totalImported,
                skipped: totalSkipped,
                attempted: totalAttempted,
                batches: requestCount,
                hasMore: hasMoreBatches,
                message: hasMoreBatches
                  ? "Importing products..."
                  : "Finalizing import...",
              }
            : prev,
        );
      }

      const totalMatching = totalImported + totalSkipped;
      setImportAllProgress((prev) =>
        prev
          ? {
              ...prev,
              imported: totalImported,
              skipped: totalSkipped,
              attempted: totalMatching,
              batches: requestCount,
              hasMore: false,
              phase: "done",
              elapsedSec: Math.floor((Date.now() - prev.startedAt) / 1000),
              message: "Import completed",
            }
          : prev,
      );
      showToast(
        `${formatImportSummary(totalImported, totalSkipped)} from ${totalMatching.toLocaleString()} matched`,
        totalImported > 0 ? "success" : "info",
      );
      setSelected(new Set());
      refreshCatalog(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Add all to My Product failed";
      setImportAllProgress((prev) =>
        prev
          ? {
              ...prev,
              attempted: totalImported + totalSkipped,
              imported: totalImported,
              skipped: totalSkipped,
              hasMore: false,
              phase: "error",
              elapsedSec: Math.floor((Date.now() - prev.startedAt) / 1000),
              message,
            }
          : null,
      );
      if (totalImported > 0) {
        showToast(
          `${message}. Partial progress kept: ${formatImportSummary(totalImported, totalSkipped)}.`,
          "error",
        );
        refreshCatalog(true);
      } else {
        showToast(message, "error");
      }
    } finally {
      setImportingAll(false);
    }
  };

  const changePage = (nextPage: number) => {
    if (nextPage < 1 || nextPage === page) return;
    if (exactTotals) {
      if (nextPage > totalPages) return;
    } else {
      if (nextPage > page + 1) return;
      if (nextPage > page && !hasMore) return;
    }
    setPage(nextPage);
  };

  const totalLabel = exactTotals ? total.toLocaleString() : `${total.toLocaleString()}+`;
  const basePoolLabel = exactTotals
    ? basePoolTotal.toLocaleString()
    : `${basePoolTotal.toLocaleString()}+`;
  const remainingLabel = exactTotals
    ? remainingTotal.toLocaleString()
    : `${remainingTotal.toLocaleString()}+`;
  const canPageNext = exactTotals ? page < totalPages : hasMore;
  const shouldShowPager = !loading && (exactTotals ? totalPages > 1 : page > 1 || hasMore);
  const importProgressPercent =
    importAllProgress && importAllProgress.targetTotal && importAllProgress.targetTotal > 0
      ? Math.min(
          100,
          Math.round(
            (importAllProgress.attempted / Math.max(importAllProgress.targetTotal, 1)) * 100,
          ),
        )
      : null;
  const importProgressTotalLabel =
    importAllProgress?.targetTotal != null
      ? importAllProgress.targetTotal.toLocaleString()
      : `${Math.max(importAllProgress?.attempted ?? 0, remainingTotal).toLocaleString()}+`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Product Storehouse</h1>
        <button
          onClick={() => refreshCatalog()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative min-w-[260px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by Product Name/Barcode"
              className="h-11 w-full rounded-lg border border-gray-200 pl-10 pr-3 text-sm text-gray-700 outline-none transition focus:border-sky-400"
            />
          </label>

          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setPage(1);
            }}
            className="h-11 min-w-[170px] rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-sky-400"
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <select
            value={brandId}
            onChange={(e) => {
              setBrandId(e.target.value);
              setPage(1);
            }}
            className="h-11 min-w-[150px] rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none transition focus:border-sky-400"
          >
            <option value="">All brands</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>

          <span className="ml-auto text-xs text-gray-500">
            Base Pool: {basePoolLabel} | Remaining: {remainingLabel}
            {!exactTotals ? " (estimating)" : ""}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-gray-700">
                Available products ({totalLabel})
              </p>
              {!loading && items.length > 0 && (
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    className="size-4 rounded border-gray-300 accent-sky-600"
                  />
                  Select page
                </label>
              )}
            </div>
          </div>

          <div className="min-h-[500px]">
            {loading ? (
              <div className="flex h-[500px] flex-col items-center justify-center gap-3 text-gray-500">
                <Loader2 className="size-8 animate-spin text-sky-600" />
                <p className="text-sm">Loading products...</p>
              </div>
            ) : error ? (
              <div className="flex h-[500px] flex-col items-center justify-center gap-3 px-6 text-center">
                <Package className="size-12 text-red-300" />
                <p className="text-base font-medium text-gray-800">Unable to load products</p>
                <p className="max-w-md text-sm text-gray-500">{error}</p>
                <button
                  onClick={() => refreshCatalog()}
                  className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
                >
                  Retry
                </button>
              </div>
            ) : items.length === 0 ? (
              <div className="flex h-[500px] flex-col items-center justify-center gap-3 text-gray-500">
                <Package className="size-14 text-gray-300" />
                <p className="text-lg font-medium text-gray-700">No products found</p>
                <p className="text-sm text-gray-500">
                  Try adjusting your search or filters.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {items.map((item) => {
                  const isSelected = selected.has(item.id);

                  return (
                    <div
                      key={item.id}
                      className={`grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition ${
                        isSelected ? "bg-sky-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(item.id)}
                        className="size-4 rounded border-gray-300 accent-sky-600"
                      />

                      <div className="relative h-12 w-12 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.title}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Package className="size-4 text-gray-300" />
                          </div>
                        )}
                        {isSelected && (
                          <span className="absolute bottom-1 right-1 inline-flex size-4 items-center justify-center rounded-full bg-sky-600 text-white">
                            <Check className="size-2.5" />
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900">{item.title}</p>
                        <p className="truncate text-xs text-gray-500">
                          SKU: {item.sku || "N/A"} | {item.category}
                          {item.brand ? ` | ${item.brand}` : ""}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          ${item.price.toFixed(2)}
                        </p>
                        <p
                          className={`text-xs ${
                            item.stock > 0 ? "text-emerald-600" : "text-red-500"
                          }`}
                        >
                          Stock: {item.stock}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <aside className="rounded-xl border border-gray-200 bg-white p-3">
          <div className="space-y-3">
            <button
              onClick={importAll}
              disabled={loading || importingAll || (remainingTotal === 0 && !hasMore)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {importingAll ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Processing...
                </span>
              ) : (
                "Add all to My Product"
              )}
            </button>

            <button
              onClick={importSelected}
              disabled={loading || importing || selectedCount === 0}
              className="w-full rounded-lg bg-gray-700 px-3 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {importing ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Processing...
                </span>
              ) : (
                "Add to My Product"
              )}
            </button>

            {importAllProgress && (
              <div
                className={`rounded-lg border p-2.5 text-xs ${
                  importAllProgress.phase === "done"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : importAllProgress.phase === "error"
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-sky-200 bg-sky-50 text-sky-700"
                }`}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="font-semibold">
                    {importAllProgress.phase === "running"
                      ? "Add-all in progress"
                      : importAllProgress.phase === "done"
                        ? "Add-all completed"
                        : "Add-all stopped"}
                  </p>
                  {importAllProgress.phase === "running" && (
                    <Loader2 className="size-3.5 animate-spin" />
                  )}
                </div>

                <div className="space-y-1">
                  <p>
                    Processed: {importAllProgress.attempted.toLocaleString()} out of{" "}
                    {importProgressTotalLabel}
                  </p>
                  <p>
                    Imported: {importAllProgress.imported.toLocaleString()} | Skipped:{" "}
                    {importAllProgress.skipped.toLocaleString()}
                  </p>
                  <p>
                    Batches: {importAllProgress.batches.toLocaleString()} | Elapsed:{" "}
                    {formatElapsed(importAllProgress.elapsedSec)}
                  </p>
                </div>

                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/80">
                  {importProgressPercent !== null ? (
                    <div
                      className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 transition-all duration-500"
                      style={{ width: `${importProgressPercent}%` }}
                    />
                  ) : (
                    <div className="h-full w-2/3 animate-pulse bg-gradient-to-r from-sky-500 via-cyan-400 to-sky-500" />
                  )}
                </div>
                <p className="mt-1 text-[11px] opacity-90">{importAllProgress.message}</p>
              </div>
            )}

            <div className="rounded-lg bg-gray-50 p-2.5 text-xs text-gray-600">
              <p>Selected: {selectedCount.toLocaleString()}</p>
              <p>
                Page: {page.toLocaleString()} /{" "}
                {exactTotals ? totalPages.toLocaleString() : "estimating"}
              </p>
              <p>
                Remaining: {remainingLabel}
                {!exactTotals ? " (estimating)" : ""}
              </p>
            </div>
          </div>
        </aside>
      </div>

      {shouldShowPager && (
        <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
          <span className="text-xs text-gray-500">
            {exactTotals ? (
              <>
                Showing {(page - 1) * LIMIT + 1} -{" "}
                {Math.min(page * LIMIT, total).toLocaleString()} of {totalLabel}
              </>
            ) : (
              <>Page {page.toLocaleString()} (totals estimating)</>
            )}
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => changePage(page - 1)}
              disabled={page <= 1}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-gray-200 px-2 text-xs text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="size-3.5" />
              Prev
            </button>

            {exactTotals &&
              Array.from({ length: Math.min(totalPages, 7) }, (_, index) => {
                let pageNumber: number;
                if (totalPages <= 7) {
                  pageNumber = index + 1;
                } else if (page <= 4) {
                  pageNumber = index + 1;
                } else if (page >= totalPages - 3) {
                  pageNumber = totalPages - 6 + index;
                } else {
                  pageNumber = page - 3 + index;
                }

                return (
                  <button
                    key={pageNumber}
                    onClick={() => changePage(pageNumber)}
                    className={`size-8 rounded-md text-xs font-medium ${
                      pageNumber === page
                        ? "bg-sky-600 text-white"
                        : "border border-gray-200 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}

            <button
              onClick={() => changePage(page + 1)}
              disabled={!canPageNext}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-gray-200 px-2 text-xs text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-lg ${
            toast.tone === "success"
              ? "bg-emerald-600"
              : toast.tone === "error"
                ? "bg-red-600"
                : "bg-gray-800"
          }`}
        >
          <span className="inline-flex items-center gap-2">
            {toast.sticky && <ShoppingBag className="size-4" />}
            {toast.msg}
          </span>
        </div>
      )}
    </div>
  );
}
