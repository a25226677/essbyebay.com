"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Admin]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center">
      <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center">
        <AlertTriangle className="size-6 text-red-500" />
      </div>
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-1">Failed to load page</h2>
        <p className="text-sm text-gray-500 max-w-xs">{error.message || "An unexpected error occurred."}</p>
      </div>
      {error.digest && (
        <p className="text-xs text-gray-400 font-mono">Ref: {error.digest}</p>
      )}
      <button
        onClick={reset}
        className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
      >
        <RefreshCw className="size-3.5" /> Try again
      </button>
    </div>
  );
}
