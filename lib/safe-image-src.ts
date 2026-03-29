const INVALID_LITERAL_VALUES = new Set(["null", "undefined", "nan", ""]);

export function safeImageSrc(value: string | null | undefined, fallback: string) {
  const raw = (value ?? "").trim();
  const normalized = raw.toLowerCase();

  if (INVALID_LITERAL_VALUES.has(normalized)) return fallback;

  if (
    raw.startsWith("/") ||
    raw.startsWith("http://") ||
    raw.startsWith("https://")
  ) {
    return raw;
  }

  return fallback;
}
