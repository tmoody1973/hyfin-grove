import { describe, expect, it, vi } from "vitest";
import { getAirings, getPlays, type QueryClient } from "@/lib/listen/rmPlaylist";

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
    expect(query.mock.calls[0][1]).toEqual({ stationSlug: "hyfin", afterMs: 1, beforeMs: 2, limit: 500 });
    expect(r).toEqual({ ok: true, value: [{
      id: "p1", playedAt: 5, artist: "6LACK", title: "Umi Says", album: null, artworkUrl: null, spotifyTrackId: "s1", appleMusicSongId: null,
      liveEvent: { venue: "The Rave", city: "Milwaukee", startsAtMs: 9, dateOnly: false, ticketUrl: null },
    }] });
  });
});
