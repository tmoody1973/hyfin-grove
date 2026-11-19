/**
 * HYFIN's concerts, read live from rm-playlist-v2 (never stored in Payload; spec "Playlist and events"):
 * every upcoming date for artists in HYFIN's last 30 days of rotation, and any single event by id.
 */
import { anyApi } from "convex/server";
import { read, type QueryClient, type Result } from "../listen/rmPlaylist";

export type Concert = {
  id: string;
  title: string;
  artist: string;
  headliners: string[];
  supports: string[];
  venue: string;
  city: string;
  region: string | null;
  metro: string | null;
  startsAtMs: number;
  dateOnly: boolean;
  doorsAt: number | null;
  genre: string | null;
  imageUrl: string | null;
  ticketUrl: string | null;
  playCount: number | null;
  status: string | null;
};

type Row = {
  eventId: string;
  title: string | null;
  artistName: string;
  venue: string;
  city: string;
  startsAtMs: number;
  dateOnly: boolean;
  doorsAt?: number | null;
  genre?: string | null;
  imageUrl?: string | null;
  ticketUrl?: string | null;
  headliners?: string[];
  supports?: string[];
  metro?: string;
  playCount?: number;
  status?: string | null;
  region?: string;
};

export const toConcert = (r: Row): Concert => ({
  id: String(r.eventId),
  title: r.title || `${r.artistName} live`,
  artist: r.artistName,
  headliners: r.headliners ?? [],
  supports: r.supports ?? [],
  venue: r.venue,
  city: r.city,
  region: r.region ?? null,
  metro: r.metro ?? null,
  startsAtMs: r.startsAtMs,
  dateOnly: r.dateOnly,
  doorsAt: r.doorsAt ?? null,
  genre: r.genre ?? null,
  imageUrl: r.imageUrl ?? null,
  ticketUrl: r.ticketUrl ?? null,
  playCount: r.playCount ?? null,
  status: r.status ?? null,
});

export const getConcerts = (client?: QueryClient): Promise<Result<Concert[]>> =>
  read("upcomingByStation", async (c) => {
    const rows = (await c.query(anyApi.concerts.upcomingByStation, { stationSlug: "hyfin" })) as Row[];
    return rows.map(toConcert).sort((a, b) => a.startsAtMs - b.startsAtMs);
  }, client);

export const getConcert = (id: string, client?: QueryClient): Promise<Result<Concert | null>> =>
  read("eventById", async (c) => {
    const row = (await c.query(anyApi.concerts.eventById, { eventId: id })) as Row | null;
    return row ? toConcert(row) : null;
  }, client);
