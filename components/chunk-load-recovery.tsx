"use client";

import { useEffect } from "react";
import { isChunkLoadError } from "@/lib/chunk-load-error";

const RETRY_META_KEY = "__chunk_reload_meta_v1";
const RETRY_TTL_MS = 5 * 60 * 1000;

function getNow() {
  return Date.now();
}

function parseRetryMeta(raw: string | null) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { ts?: number } | null;
    if (!parsed || typeof parsed.ts !== "number") return null;
    return { ts: parsed.ts };
  } catch {
    return null;
  }
}

function canRetryOnce() {
  const meta = parseRetryMeta(sessionStorage.getItem(RETRY_META_KEY));
  if (!meta) return true;
  return getNow() - meta.ts > RETRY_TTL_MS;
}

function markRetry() {
  sessionStorage.setItem(RETRY_META_KEY, JSON.stringify({ ts: getNow() }));
}

function cleanupRetryQueryParams() {
  const url = new URL(window.location.href);
  let changed = false;
  if (url.searchParams.has("__chunk_retry")) {
    url.searchParams.delete("__chunk_retry");
    changed = true;
  }
  if (url.searchParams.has("__chunk_retry_ts")) {
    url.searchParams.delete("__chunk_retry_ts");
    changed = true;
  }
  if (changed) {
    window.history.replaceState({}, "", url.toString());
  }
}

function hardReloadForChunkError() {
  if (!canRetryOnce()) return;
  markRetry();
  const url = new URL(window.location.href);
  url.searchParams.set("__chunk_retry", "1");
  url.searchParams.set("__chunk_retry_ts", String(getNow()));
  window.location.replace(url.toString());
}

export function ChunkLoadRecovery() {
  useEffect(() => {
    cleanupRetryQueryParams();

    const onWindowError = (event: ErrorEvent) => {
      if (isChunkLoadError(event.error ?? event.message)) {
        hardReloadForChunkError();
      }
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isChunkLoadError(event.reason)) {
        hardReloadForChunkError();
      }
    };

    window.addEventListener("error", onWindowError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onWindowError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
