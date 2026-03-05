"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Settings2 } from "lucide-react";

export default function POSConfigurationPage() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load current setting
  useEffect(() => {
    fetch("/api/admin/pos/config")
      .then((r) => r.json())
      .then((j) => setEnabled(Boolean(j.enabled)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = async () => {
    const next = !enabled;
    setEnabled(next);
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/admin/pos/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_) {
      // revert on error
      setEnabled(!next);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page title */}
      <div className="flex items-center gap-3">
        <Settings2 className="size-5 text-gray-500" />
        <h1 className="text-xl font-bold text-gray-800">POS Activation for Salesman</h1>
      </div>

      {/* Config card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 w-full max-w-lg">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-800">POS Activation for Salesman</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {enabled ? "Salesman POS access is currently enabled." : "Salesman POS access is currently disabled."}
            </p>
          </div>

          {/* Toggle */}
          {loading ? (
            <div className="w-12 h-6 rounded-full bg-gray-200 animate-pulse shrink-0" />
          ) : (
            <button
              onClick={toggle}
              disabled={saving}
              className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 ${
                enabled ? "bg-emerald-500" : "bg-gray-300"
              } ${saving ? "opacity-60 cursor-not-allowed" : ""}`}
              role="switch"
              aria-checked={enabled}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                  enabled ? "translate-x-6" : "translate-x-0.5"
                }`}
              />
              {saving && (
                <RefreshCw className="absolute right-[-20px] size-3 animate-spin text-gray-400" />
              )}
            </button>
          )}
        </div>

        {/* Saved feedback */}
        {saved && (
          <p className="mt-3 text-xs font-medium text-emerald-600 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Settings saved successfully.
          </p>
        )}
      </div>
    </div>
  );
}
