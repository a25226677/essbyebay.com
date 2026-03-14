export function makeOrderCode(createdAt: string | null | undefined, explicitCode?: string | null): string {
  if (explicitCode && explicitCode.trim()) return explicitCode.trim();

  const fallback = "UNKNOWN-ORDER";
  if (!createdAt) return fallback;

  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return fallback;

  const day = date.toISOString().slice(0, 10).replace(/-/g, "");
  const time =
    date.toISOString().slice(11, 19).replace(/:/g, "") +
    String(date.getMilliseconds()).padStart(3, "0").slice(0, 2);

  return `${day}-${time}`;
}