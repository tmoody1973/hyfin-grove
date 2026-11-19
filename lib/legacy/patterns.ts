import type { Payload } from "payload";

/** Pattern rules for old hyfin.org address kinds (plan 7, task 3). */
export async function patternTarget(_path: string, _db: Pick<Payload, "find">): Promise<string | null> {
  return null;
}
