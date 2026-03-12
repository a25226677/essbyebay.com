/**
 * Shared PostgREST / Supabase query helpers.
 *
 * PostgREST encodes .in() filters as URL query-string parameters.
 * When the ID array is large the URL exceeds the server limit and
 * PostgREST returns "400 Bad Request".
 *
 * Use `queryInBatches` for any .in() that receives an array whose
 * size is unbounded (i.e. derived from database results, not user input).
 */

export function sanitizeUuids(arr: unknown[]): string[] {
  return arr.filter(
    (v): v is string =>
      typeof v === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
  );
}

const IN_CHUNK_SIZE = 100;

export type DbResult<T> = { data: T[] | null; error: { message: string } | null };

export async function queryInBatches<T>(
  fetcher: (chunk: string[]) => PromiseLike<DbResult<T>>,
  ids: string[],
): Promise<{ data: T[]; error: { message: string } | null }> {
  if (ids.length === 0) return { data: [], error: null };
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += IN_CHUNK_SIZE) {
    chunks.push(ids.slice(i, i + IN_CHUNK_SIZE));
  }
  const results = await Promise.all(
    chunks.map((c) => Promise.resolve(fetcher(c))),
  );
  const failed = results.find((r) => r.error);
  if (failed) return { data: [], error: failed.error };
  return { data: results.flatMap((r) => r.data ?? []), error: null };
}
