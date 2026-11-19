/**
 * Server-side reads of rm-playlist-v2's public Convex queries for HYFIN. Nothing here is stored:
 * playlist and schedule are read live (spec: "Playlist and events", "Program schedule").
 * Every failure becomes { ok: false } so a page can say "unavailable" instead of erroring.
 */
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";

const STATION = "hyfin";
const MAX_PLAYS = 500; // searchByStation's own cap

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
  try {
    return { ok: true, value: await run(client ?? defaultClient()) };
  } catch (err) {
    console.error(`rm-playlist ${label} failed:`, err instanceof Error ? err.message : err);
    return { ok: false };
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

export const getPlays = (opts: { afterMs?: number; beforeMs?: number; q?: string; limit?: number }, client?: QueryClient) =>
  read("searchByStation", async (c) => {
    const args = { stationSlug: STATION, ...opts, limit: Math.min(opts.limit ?? 100, MAX_PLAYS) };
    return ((await c.query(anyApi.plays.searchByStation, args)) as PublicPlay[]).map(toPlay);
  }, client);

export const getCurrentPlay = (client?: QueryClient) =>
  read("currentByStation", async (c) => {
    const p = (await c.query(anyApi.plays.currentByStation, { stationSlug: STATION })) as PublicPlay | null;
    return p ? toPlay(p) : null;
  }, client);
