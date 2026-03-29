"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { isChunkLoadError } from "@/lib/chunk-load-error";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const chunkError = isChunkLoadError(error);

  const hardRefresh = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("__chunk_manual_reload", Date.now().toString());
    window.location.replace(url.toString());
  };

  useEffect(() => {
    // Log to an error reporting service in production
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center gap-4">
      <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
        <AlertTriangle className="size-7 text-red-500" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>
      <p className="text-muted-foreground text-sm max-w-sm">
        {chunkError
          ? "A new version was deployed while this page was open. Please refresh to load latest assets."
          : "An unexpected error occurred. Please try again, or contact support if the problem persists."}
      </p>
      {error.digest && (
        <p className="text-xs text-muted-foreground font-mono">Error ID: {error.digest}</p>
      )}
      <div className="flex gap-3">
        <Button onClick={reset} variant="default">Try Again</Button>
        {chunkError && (
          <Button onClick={hardRefresh} variant="outline">Hard Refresh</Button>
        )}
        <Button asChild variant="outline">
          <Link href="/">Go Home</Link>
        </Button>
      </div>
    </div>
  );
}
