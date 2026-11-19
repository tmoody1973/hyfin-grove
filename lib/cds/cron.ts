import { createHash, timingSafeEqual } from "node:crypto";

const digest = (s: string) => createHash("sha256").update(s).digest();

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Constant-time compare; no secret configured = nobody gets in. */
export function isAuthorizedCron(header: string | null, secret: string | undefined): boolean {
  if (!secret || !header) return false;
  return timingSafeEqual(digest(header), digest(`Bearer ${secret}`));
}

/** The sync runs every 15 minutes; an hour without a success means it has stopped. */
export const STALE_AFTER_MS = 60 * 60 * 1000;

export function healthOf(status: { lastSuccessAt?: string | null; lastError?: string | null }, now: Date) {
  const lastSuccessAt = status.lastSuccessAt ?? null;
  const ok = lastSuccessAt !== null && now.getTime() - Date.parse(lastSuccessAt) < STALE_AFTER_MS;
  return { ok, lastSuccessAt, lastError: status.lastError ? status.lastError.slice(0, 200) : null };
}
