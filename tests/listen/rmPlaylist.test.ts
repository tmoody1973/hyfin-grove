import { describe, expect, it, vi } from "vitest";
import { getAirings, getPlays, toPlay, type QueryClient } from "@/lib/listen/rmPlaylist";

const client = (impl: QueryClient["query"]): QueryClient => ({ query: impl });

describe("rm-playlist reads", () => {
  it("getAirings returns ok:false on network error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await getAirings(0, 1, client(() => Promise.reject(new Error("fetch failed"))));
    expect(r).toEqual({ ok: false });
  });
  it("getAirings passes the station and range through", async () => {
    const query = vi.fn().mockResolvedValue({ refreshedAt: null, airings: [] });
    const r = await getAirings(10, 20, client(query));
    expect(query.mock.calls[0][1]).toEqual({ station: "hyfin", fromMs: 10, toMs: 20 });
    expect(r).toEqual({ ok: true, value: { refreshedAt: null, airings: [] } });
  });
  it("getPlays maps PublicPlay to Play", async () => {
    const raw = {
      _id: "p1", playedAt: 5, artist: "6LACK", title: "Umi Says", album: null, artworkUrl: null, spotifyTrackId: "s1", appleMusicSongId: null,
      artistRaw: "6LACK", titleRaw: "Umi Says", albumRaw: undefined, label: null, durationSec: null, previewUrl: null,
      liveEvent: { eventId: "e", title: null, artistName: "6LACK", role: "headliner", venue: "The Rave", city: "Milwaukee", startsAtMs: 9, ticketUrl: null, imageUrl: null, source: "axs", dateOnly: false, doorsAt: null, genre: null, headliners: [], supports: [] },
    };
    const query = vi.fn().mockResolvedValue([raw]);
    const r = await getPlays({ afterMs: 1, beforeMs: 2, limit: 900 }, client(query));
    expect(query.mock.calls[0][1]).toEqual({ stationSlug: "hyfin", afterMs: 1, beforeMs: 2, limit: 200 }); // one window, per-window cap
    expect(r).toEqual({ ok: true, value: [{
      id: "p1", playedAt: 5, artist: "6LACK", title: "Umi Says", album: null, artworkUrl: null, spotifyTrackId: "s1", appleMusicSongId: null, previewUrl: null,
      liveEvent: { eventId: "e", title: null, venue: "The Rave", city: "Milwaukee", startsAtMs: 9, dateOnly: false, ticketUrl: null, imageUrl: null },
    }] });
  });
  it("getPlays splits a day into windows so the server's per-call cap can't drop songs", async () => {
    const STEP = 120_000; // a song every 2 minutes: 720 in a day
    const query = vi.fn(async (_fn: unknown, args: Record<string, unknown>) => {
      const from = args.afterMs as number;
      const to = args.beforeMs as number;
      const rows = [];
      for (let t = to - STEP; t >= from; t -= STEP) rows.push({ _id: `p${t}`, playedAt: t, artist: "A", title: "T", album: null, artworkUrl: null, spotifyTrackId: null, appleMusicSongId: null, previewUrl: null, liveEvent: null });
      return rows.slice(0, 140); // rm-playlist reads ~140 rows per date-range call
    });
    const r = await getPlays({ afterMs: 0, beforeMs: 24 * 3_600_000, limit: 500 }, client(query));
    expect(r.ok && r.value.length).toBe(720);
    expect(r.ok && new Set(r.value.map((p) => p.id)).size).toBe(720);
    expect(r.ok && r.value[0].playedAt > r.value[719].playedAt).toBe(true); // newest first
  });
  it("a search is one call", async () => {
    const query = vi.fn().mockResolvedValue([]);
    await getPlays({ q: "Jorja", limit: 900 }, client(query));
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][1]).toEqual({ stationSlug: "hyfin", q: "Jorja", limit: 500 }); // search keeps rm-playlist's cap
  });
  it("a read that never answers gives up instead of hanging the page", async () => {
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const pending = getAirings(0, 1, client(() => new Promise(() => {})));
    await vi.advanceTimersByTimeAsync(10_000);
    expect(await pending).toEqual({ ok: false });
    vi.useRealTimers();
  });
  it("fills in Apple's artwork size template, encoded or not", () => {
    const raw = (artworkUrl: string) => toPlay({ _id: "p", playedAt: 1, artist: "A", title: "T", album: null, artworkUrl, spotifyTrackId: null, appleMusicSongId: null, previewUrl: null, liveEvent: null });
    expect(raw("https://is1-ssl.mzstatic.com/image/thumb/x/5050580779341.jpg/%7Bw%7Dx%7Bh%7Dbb.jpg").artworkUrl).toBe("https://is1-ssl.mzstatic.com/image/thumb/x/5050580779341.jpg/300x300bb.jpg");
    expect(raw("https://is1-ssl.mzstatic.com/image/thumb/x/a.jpg/{w}x{h}bb.jpg").artworkUrl).toBe("https://is1-ssl.mzstatic.com/image/thumb/x/a.jpg/300x300bb.jpg");
    expect(raw("https://rm-playlist-v2-embed.pages.dev/logos/hyfin.png").artworkUrl).toBe("https://rm-playlist-v2-embed.pages.dev/logos/hyfin.png");
  });
});
