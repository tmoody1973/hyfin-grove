import type { Payload } from "payload";

const KEEP_MS = 90 * 86_400_000;

/** Search words are kept 90 days (Tarik, 2026-11-20). */
export const queryLogCutoff = (now: number): string => new Date(now - KEEP_MS).toISOString();

/** One search, logged without anything about the visitor. A failure never affects the search. */
export async function logQuery(payload: Pick<Payload, "create" | "logger">, query: string, results: number, kind: string | null): Promise<void> {
  try {
    await payload.create({ collection: "search-queries", data: { query: query.toLowerCase().slice(0, 100), results, kind: kind ?? "all" } });
  } catch (err) {
    payload.logger.warn(`[search] couldn't log a query: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function pruneQueryLog(payload: Pick<Payload, "delete">, now: number): Promise<{ deleted: number }> {
  const { docs } = await payload.delete({ collection: "search-queries", where: { createdAt: { less_than: queryLogCutoff(now) } } });
  return { deleted: docs.length };
}
