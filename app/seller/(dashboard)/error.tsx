"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { isChunkLoadError } from "@/lib/chunk-load-error";

export default function SellerDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const chunkError = isChunkLoadError(error);

  const hardRefresh = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("__seller_hard_reload", Date.now().toString());
    window.location.replace(url.toString());
  };

  useEffect(() => {
    console.error("[Seller Dashboard]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
      <div className="size-12 rounded-2xl bg-red-50 flex items-center justify-center">
        <AlertTriangle className="size-6 text-red-500" />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900">Seller dashboard failed to load</h2>
        <p className="text-sm text-gray-500 mt-1 max-w-md">
          {chunkError
            ? "A new version was deployed. Please refresh to load the latest dashboard files."
            : error.message || "An unexpected error occurred."}
        </p>
      </div>

      {error.digest && (
        <p className="text-xs text-gray-400 font-mono">Ref: {error.digest}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
        >
          <RefreshCw className="size-3.5" />
          Try again
        </button>
        <button
          onClick={hardRefresh}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Hard refresh
        </button>
      </div>
    </div>
  );
}
