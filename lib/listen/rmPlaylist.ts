/**
 * Server-side reads of rm-playlist-v2's public Convex queries for HYFIN. Nothing here is stored:
 * playlist and schedule are read live (spec: "Playlist and events", "Program schedule").
 * Every failure becomes { ok: false } so a page can say "unavailable" instead of erroring.
 */
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";

const STATION = "hyfin";
/** Text search: rm-playlist returns at most this many. */
const MAX_SEARCH = 500;
/**
 * Date-range reads: rm-playlist scans at most ~200 rows per call and drops ignored ones, so one call over
 * a whole day silently loses the morning (~140 of ~375 plays). Four hours is ~70 plays, safely under it.
 */
const WINDOW_MS = 4 * 3_600_000;
const WINDOW_LIMIT = 200;
/** A hung rm-playlist must not hold the page until the platform times out. */
export const READ_TIMEOUT_MS = 4000;

export type Airing = {
  name: string;
  hosts: string[];
  description: string | null;
  link: string | null;
  imageUrl: string | null;
  startsAt: number;
  endsAt: number;
};

export type LiveEvent = { venue: string; city: string; startsAtMs: number; dateOnly: boolean; ticketUrl: string | null };

export type Play = {
  id: string;
  playedAt: number;
  artist: string;
  title: string;
  album: string | null;
  artworkUrl: string | null;
  spotifyTrackId: string | null;
  appleMusicSongId: string | null;
  liveEvent: LiveEvent | null;
};

export type Result<T> = { ok: true; value: T } | { ok: false };

export type QueryClient = { query: (fn: unknown, args: Record<string, unknown>) => Promise<unknown> };

type PublicPlay = Omit<Play, "id" | "liveEvent"> & { _id: string; liveEvent: (LiveEvent & Record<string, unknown>) | null };

let shared: QueryClient | null = null;
function defaultClient(): QueryClient {
  const url = process.env.NEXT_PUBLIC_RM_PLAYLIST_CONVEX_URL;
  if (!url) throw new Error("NEXT_PUBLIC_RM_PLAYLIST_CONVEX_URL is not set");
  shared ??= new ConvexHttpClient(url) as unknown as QueryClient;
  return shared;
}

async function read<T>(label: string, run: (c: QueryClient) => Promise<T>, client?: QueryClient): Promise<Result<T>> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`timed out after ${READ_TIMEOUT_MS} ms`)), READ_TIMEOUT_MS);
    });
    return { ok: true, value: await Promise.race([run(client ?? defaultClient()), timeout]) };
  } catch (err) {
    console.error(`rm-playlist ${label} failed:`, err instanceof Error ? err.message : err);
    return { ok: false };
  } finally {
    clearTimeout(timer);
  }
}

export const getAirings = (fromMs: number, toMs: number, client?: QueryClient) =>
  read("stationAirings", (c) => c.query(anyApi.alexa.stationAirings, { station: STATION, fromMs, toMs }) as Promise<{ refreshedAt: number | null; airings: Airing[] }>, client);

export function toPlay(p: PublicPlay): Play {
  const e = p.liveEvent;
  return {
    id: p._id,
    playedAt: p.playedAt,
    artist: p.artist,
    title: p.title,
    album: p.album,
    artworkUrl: p.artworkUrl,
    spotifyTrackId: p.spotifyTrackId,
    appleMusicSongId: p.appleMusicSongId,
    liveEvent: e ? { venue: e.venue, city: e.city, startsAtMs: e.startsAtMs, dateOnly: e.dateOnly, ticketUrl: e.ticketUrl } : null,
  };
}

/**
 * Plays newest first. A date range without search text is read in four-hour windows (see WINDOW_MS), so
 * `limit` only applies to text search.
 */
export const getPlays = (opts: { afterMs?: number; beforeMs?: number; q?: string; limit?: number }, client?: QueryClient) =>
  read("searchByStation", async (c) => {
    const call = async (args: Record<string, unknown>) => ((await c.query(anyApi.plays.searchByStation, { stationSlug: STATION, ...args })) as PublicPlay[]).map(toPlay);
    const { afterMs, beforeMs, q } = opts;
    if (q || afterMs === undefined || beforeMs === undefined) return call({ ...opts, limit: Math.min(opts.limit ?? 100, MAX_SEARCH) });
    const windows: Array<[number, number]> = [];
    for (let from = afterMs; from < beforeMs; from += WINDOW_MS) windows.push([from, Math.min(from + WINDOW_MS, beforeMs)]);
    const pages = await Promise.all(windows.map(([from, to]) => call({ afterMs: from, beforeMs: to, limit: WINDOW_LIMIT })));
    const byId = new Map(pages.flat().map((p) => [p.id, p]));
    return [...byId.values()].sort((a, b) => b.playedAt - a.playedAt);
  }, client);

export const getCurrentPlay = (client?: QueryClient) =>
  read("currentByStation", async (c) => {
    const p = (await c.query(anyApi.plays.currentByStation, { stationSlug: STATION })) as PublicPlay | null;
    return p ? toPlay(p) : null;
  }, client);
