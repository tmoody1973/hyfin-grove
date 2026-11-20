import type { Payload } from "payload";
import type { Result } from "../listen/rmPlaylist";
import { concertDayKey } from "./calendar";
import { todayKey } from "../listen/time";
import type { Concert } from "./rmEvents";

/**
 * rm-playlist concerts -> the Events collection (plan 9, decision 013). Runs every 15 minutes from the cron.
 * Writes only the fields the sync owns; never deletes; a future concert that drops off the list is looked up once
 * so a cancellation reaches its page.
 */

/** Fields the sync owns (read-only to staff on synced events; Global Constraints). */
const OWNED = ["title", "startsAt", "dateOnly", "venue", "city", "metro", "ticketUrl", "imageUrl", "artist", "headliners", "supports", "eventStatus", "playCount"] as const;
type Owned = (typeof OWNED)[number];

export type SyncedEventData = {
  title: string;
  slug: string;
  type: "concert";
  source: "rm-playlist";
  externalId: string;
  _status: "published";
  startsAt: string;
  dateOnly: boolean;
  venue: string | null;
  city: string | null;
  metro: string | null;
  ticketUrl: string | null;
  imageUrl: string | null;
  artist: string | null;
  headliners: string[];
  supports: string[];
  eventStatus: "scheduled" | "cancelled" | "postponed";
  playCount: number | null;
};

/** A stored synced event as `syncEvents` reads it (staff fields may be present; the sync never writes them). */
export type StoredEvent = { id: number } & Partial<SyncedEventData> & Record<string, unknown>;

const statusOf = (s: string | null): SyncedEventData["eventStatus"] => (s === "cancelled" || s === "postponed" ? s : "scheduled");

export const concertToEvent = (c: Concert): SyncedEventData => ({
  title: c.title,
  slug: c.id,
  type: "concert",
  source: "rm-playlist",
  externalId: c.id,
  _status: "published",
  startsAt: new Date(c.startsAtMs).toISOString(),
  dateOnly: c.dateOnly,
  venue: c.venue || null,
  city: c.city || null,
  metro: c.metro,
  ticketUrl: c.ticketUrl,
  imageUrl: c.imageUrl,
  artist: c.artist || null,
  headliners: c.headliners,
  supports: c.supports,
  eventStatus: statusOf(c.status),
  playCount: c.playCount,
});

const norm = (v: unknown): string => JSON.stringify(v === undefined ? null : v);

/** The owned fields whose value differs from what's stored. */
function changes(stored: StoredEvent, next: SyncedEventData): Partial<SyncedEventData> {
  const out: Record<string, unknown> = {};
  for (const k of OWNED) {
    const s = k === "headliners" || k === "supports" ? (stored[k] ?? []) : stored[k];
    if (norm(s) !== norm(next[k as Owned])) out[k] = next[k as Owned];
  }
  return out as Partial<SyncedEventData>;
}

/** Same "over" rule as event pages (lib/events/eventPage.ts): timed shows end 6 hours after they start. */
const SHOW_LENGTH_MS = 6 * 3_600_000;
function isOver(e: StoredEvent, now: number): boolean {
  const startsAtMs = Date.parse(String(e.startsAt));
  if (Number.isNaN(startsAtMs)) return true;
  return e.dateOnly ? concertDayKey({ startsAtMs, dateOnly: true }) < todayKey(now) : now > startsAtMs + SHOW_LENGTH_MS;
}

export type SyncPlan = { create: SyncedEventData[]; update: { id: number; data: Partial<SyncedEventData> }[]; recheck: string[] };

export function planEventSync(stored: StoredEvent[], concerts: Concert[], now: number): SyncPlan {
  const byExt = new Map(stored.filter((s) => s.externalId).map((s) => [String(s.externalId), s]));
  const listed = new Set(concerts.map((c) => c.id));
  const create: SyncedEventData[] = [];
  const update: SyncPlan["update"] = [];
  for (const c of concerts) {
    const next = concertToEvent(c);
    const s = byExt.get(c.id);
    if (!s) {
      create.push(next);
      continue;
    }
    const data = changes(s, next);
    if (Object.keys(data).length) update.push({ id: s.id, data });
  }
  const recheck = stored
    .filter((s) => s.externalId && !listed.has(String(s.externalId)) && (s.eventStatus ?? "scheduled") === "scheduled" && !isOver(s, now))
    .map((s) => String(s.externalId));
  return { create, update, recheck };
}

type SyncDb = Pick<Payload, "find" | "create" | "update">;
export type SyncDeps = {
  list: () => Promise<Result<Concert[]>>;
  lookup: (id: string) => Promise<Result<Concert | null>>;
  now: number;
  log: (line: string) => void;
};
export type SyncCounts = { created: number; updated: number; rechecked: number; failed: number; error?: string };

/** One lookup per dropped concert costs a request to rm-playlist; cap them per run. */
const MAX_RECHECKS = 10;

export async function syncEvents(payload: SyncDb, deps: SyncDeps): Promise<SyncCounts> {
  const counts: SyncCounts = { created: 0, updated: 0, rechecked: 0, failed: 0 };
  const list = await deps.list();
  if (!list.ok) return { ...counts, error: "rm-playlist unavailable" };

  const { docs } = await payload.find({ collection: "events", where: { source: { equals: "rm-playlist" } }, pagination: false, depth: 0 });
  const stored = docs as unknown as StoredEvent[];
  const plan = planEventSync(stored, list.value, deps.now);

  const attempt = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
      return true;
    } catch (err) {
      counts.failed++;
      deps.log(`failed ${label}: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  };

  for (const data of plan.create) if (await attempt(`create ${data.externalId}`, () => payload.create({ collection: "events", data }))) counts.created++;
  for (const { id, data } of plan.update) if (await attempt(`update ${id}`, () => payload.update({ collection: "events", id, data }))) counts.updated++;

  const byExt = new Map(stored.map((s) => [String(s.externalId), s]));
  for (const ext of plan.recheck.slice(0, MAX_RECHECKS)) {
    counts.rechecked++;
    const found = await deps.lookup(ext);
    if (!found.ok) {
      counts.failed++;
      deps.log(`lookup failed ${ext}`);
      continue;
    }
    const s = byExt.get(ext);
    if (!found.value || !s) continue; // gone from rm-playlist entirely: keep what we have
    const data = changes(s, concertToEvent(found.value));
    if (Object.keys(data).length && (await attempt(`update ${s.id}`, () => payload.update({ collection: "events", id: s.id, data })))) counts.updated++;
  }
  return counts;
}
