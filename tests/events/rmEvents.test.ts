import { describe, expect, it, vi } from "vitest";
import { getConcert, getConcerts } from "@/lib/events/rmEvents";
import type { QueryClient } from "@/lib/listen/rmPlaylist";

const client = (impl: QueryClient["query"]): QueryClient => ({ query: impl });
const row = (over: Record<string, unknown> = {}) => ({
  eventId: "e1", title: "Jorja Smith - Ages 18+", artistName: "Jorja Smith", role: "headliner", venue: "Riviera Theatre", city: "Chicago",
  startsAtMs: Date.parse("2026-11-24T02:00:00Z"), ticketUrl: "https://tm.example/e1", imageUrl: null, source: "ticketmaster", dateOnly: false,
  doorsAt: null, genre: "R&B", headliners: ["Jorja Smith"], supports: [], metro: "Chicago", playCount: 3, ...over,
});

describe("concert reads", () => {
  it("maps rows, sorts by date, and falls back to '<artist> live' without a title", async () => {
    const r = await getConcerts(client(vi.fn().mockResolvedValue([row({ eventId: "late", startsAtMs: 9e12 }), row({ title: null })])));
    expect(r.ok && r.value.map((c) => c.id)).toEqual(["e1", "late"]);
    expect(r.ok && r.value[0]).toMatchObject({ title: "Jorja Smith live", artist: "Jorja Smith", metro: "Chicago", playCount: 3, region: null, status: null });
  });
  it("metro and play count are null when rm-playlist hasn't sent them yet", async () => {
    const { metro: _m, playCount: _p, ...old } = row();
    const r = await getConcerts(client(vi.fn().mockResolvedValue([old])));
    expect(r.ok && r.value[0]).toMatchObject({ metro: null, playCount: null });
  });
  it("is unavailable, not an error page, when rm-playlist fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await getConcerts(client(() => Promise.reject(new Error("down"))))).toEqual({ ok: false });
  });
  it("getConcert: null when rm-playlist knows no such event; status and region when it does", async () => {
    expect(await getConcert("x", client(vi.fn().mockResolvedValue(null)))).toEqual({ ok: true, value: null });
    const query = vi.fn().mockResolvedValue(row({ status: "cancelled", region: "IL", metro: undefined, playCount: undefined }));
    const r = await getConcert("e1", client(query));
    expect(query.mock.calls[0][1]).toEqual({ eventId: "e1" });
    expect(r.ok && r.value).toMatchObject({ id: "e1", status: "cancelled", region: "IL" });
  });
});
