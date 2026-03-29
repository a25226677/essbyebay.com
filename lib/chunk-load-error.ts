export function getErrorMessage(input: unknown) {
  if (!input) return "";
  if (typeof input === "string") return input;
  if (input instanceof Error) return input.message || "";
  if (
    typeof input === "object" &&
    "message" in input &&
    typeof (input as { message?: unknown }).message === "string"
  ) {
    return (input as { message: string }).message;
  }
  return "";
}

export function isChunkLoadError(input: unknown) {
  const message = getErrorMessage(input).toLowerCase();
  const name =
    typeof input === "object" &&
    input &&
    "name" in input &&
    typeof (input as { name?: unknown }).name === "string"
      ? (input as { name: string }).name.toLowerCase()
      : "";

  if (name.includes("chunkloaderror")) return true;
  if (message.includes("chunkloaderror")) return true;
  if (message.includes("failed to load chunk")) return true;
  if (message.includes("/_next/static/chunks/")) return true;
  if (message.includes("loading chunk") && message.includes("failed")) return true;
  return false;
}
