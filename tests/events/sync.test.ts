import { describe, expect, it } from "vitest";
import type { Concert } from "@/lib/events/rmEvents";
import { concertToEvent, planEventSync, syncEvents, type StoredEvent } from "@/lib/events/sync";

const NOW = Date.parse("2026-11-20T18:00:00Z");
const DAY = 86_400_000;

const concert = (over: Partial<Concert> = {}): Concert => ({
  id: "ev1",
  title: "Tems live",
  artist: "Tems",
  headliners: ["Tems"],
  supports: [],
  venue: "The Rave",
  city: "Milwaukee",
  region: "WI",
  metro: "Milwaukee",
  startsAtMs: NOW + 3 * DAY,
  dateOnly: false,
  doorsAt: null,
  genre: null,
  imageUrl: "https://img/tems.jpg",
  ticketUrl: "https://tickets/tems",
  playCount: 12,
  status: null,
  ...over,
});

const stored = (c: Concert, over: Partial<StoredEvent> = {}): StoredEvent => ({ id: 7, ...concertToEvent(c), ...over });

describe("concertToEvent", () => {
  it("files a concert under its rm-playlist id, published, as a concert", () => {
    const e = concertToEvent(concert());
    expect(e).toMatchObject({ slug: "ev1", externalId: "ev1", type: "concert", source: "rm-playlist", _status: "published", eventStatus: "scheduled", startsAt: new Date(NOW + 3 * DAY).toISOString() });
    expect(concertToEvent(concert({ status: "cancelled" })).eventStatus).toBe("cancelled");
    expect(concertToEvent(concert({ status: "postponed" })).eventStatus).toBe("postponed");
  });
  it("never carries staff-owned fields", () => {
    const keys = Object.keys(concertToEvent(concert()));
    for (const k of ["hidden", "featured", "image", "description", "recap", "gallery", "relatedPosts", "priceText", "address", "endsAt"]) expect(keys).not.toContain(k);
  });
});

describe("planEventSync", () => {
  it("creates a concert it hasn't seen", () => {
    const plan = planEventSync([], [concert()], NOW);
    expect(plan.create.map((e) => e.externalId)).toEqual(["ev1"]);
    expect(plan.update).toEqual([]);
  });
  it("does nothing when nothing changed", () => {
    expect(planEventSync([stored(concert())], [concert()], NOW)).toEqual({ create: [], update: [], recheck: [] });
  });
  it("updates only the fields that changed", () => {
    const plan = planEventSync([stored(concert())], [concert({ venue: "Turner Hall" })], NOW);
    expect(plan.update).toEqual([{ id: 7, data: { venue: "Turner Hall" } }]);
  });
  it("leaves staff edits alone: recap, hidden and a swapped image never appear in an update", () => {
    const s = { ...stored(concert()), hidden: true, recap: { root: {} }, image: 3 } as StoredEvent;
    const plan = planEventSync([s], [concert({ playCount: 13 })], NOW);
    expect(plan.update).toEqual([{ id: 7, data: { playCount: 13 } }]);
  });
  it("rechecks a future concert that dropped off the list, but never a past one, and never deletes", () => {
    const future = stored(concert({ id: "f1" }), { id: 1 });
    const past = stored(concert({ id: "p1", startsAtMs: NOW - 2 * DAY }), { id: 2 });
    const plan = planEventSync([future, past], [], NOW);
    expect(plan.recheck).toEqual(["f1"]);
    expect(plan.create).toEqual([]);
  });
  it("doesn't recheck one already marked cancelled", () => {
    const s = stored(concert({ status: "cancelled" }));
    expect(planEventSync([s], [], NOW).recheck).toEqual([]);
  });
});

describe("syncEvents", () => {
  function fakePayload(rows: StoredEvent[], drafts: number[] = []) {
    const writes: Array<{ op: string; id?: number; data: Record<string, unknown> }> = [];
    return {
      writes,
      payload: {
        find: async () => ({ docs: rows }),
        findByID: async ({ id }: { id: number }) => ({ id, _status: drafts.includes(id) ? "draft" : "published" }),
        create: async ({ data }: { data: Record<string, unknown> }) => (writes.push({ op: "create", data }), data),
        update: async ({ id, data }: { id: number; data: Record<string, unknown> }) => (writes.push({ op: "update", id, data }), data),
      },
    };
  }
  const deps = (over = {}) => ({ list: async () => ({ ok: true as const, value: [concert()] }), lookup: async () => ({ ok: true as const, value: null }), now: NOW, log: () => {}, ...over });

  it("writes nothing and reports an error when rm-playlist is down", async () => {
    const f = fakePayload([]);
    const r = await syncEvents(f.payload as never, deps({ list: async () => ({ ok: false as const }) }));
    expect(r.error).toBeTruthy();
    expect(f.writes).toEqual([]);
  });
  it("creates new concerts", async () => {
    const f = fakePayload([]);
    const r = await syncEvents(f.payload as never, deps());
    expect(r).toMatchObject({ created: 1, updated: 0, failed: 0 });
    expect(f.writes[0]).toMatchObject({ op: "create", data: { externalId: "ev1" } });
  });
  it("marks a dropped concert cancelled when the lookup says so", async () => {
    const f = fakePayload([stored(concert({ id: "x" }), { id: 9 })]);
    const r = await syncEvents(f.payload as never, deps({ list: async () => ({ ok: true as const, value: [] }), lookup: async () => ({ ok: true as const, value: concert({ id: "x", status: "cancelled" }) }) }));
    expect(r).toMatchObject({ rechecked: 1, updated: 1 });
    expect(f.writes).toEqual([{ op: "update", id: 9, data: { eventStatus: "cancelled" } }]);
  });
  it("keeps HYFIN's own view (the act it plays, metro, plays) when a lookup refreshes a dropped concert", async () => {
    const s0 = stored(concert({ id: "x", artist: "Opener", metro: "Milwaukee", playCount: 9 }), { id: 9 });
    const f = fakePayload([s0]);
    const headlinerView = concert({ id: "x", artist: "Headliner", metro: null, playCount: null, status: "cancelled" });
    await syncEvents(f.payload as never, deps({ list: async () => ({ ok: true as const, value: [] }), lookup: async () => ({ ok: true as const, value: headlinerView }) }));
    expect(f.writes).toEqual([{ op: "update", id: 9, data: { eventStatus: "cancelled" } }]);
  });
  it("rechecks a different window of dropped concerts each run, soonest first, so none starve", async () => {
    const rows = Array.from({ length: 15 }, (_, i) => stored(concert({ id: `d${i}`, startsAtMs: NOW + (15 - i) * DAY }), { id: i + 1 }));
    const seen = async (now: number) => {
      const asked: string[] = [];
      await syncEvents(fakePayload(rows).payload as never, deps({ now, list: async () => ({ ok: true as const, value: [] }), lookup: async (id: string) => (asked.push(id), { ok: true as const, value: null }) }));
      return asked;
    };
    const run1 = await seen(NOW);
    const run2 = await seen(NOW + 15 * 60_000);
    expect(run1).toHaveLength(10);
    expect(new Set([...run1, ...run2]).size).toBe(15);
  });
  it("leaves a synced event alone while staff have an unpublished draft of it", async () => {
    const f = fakePayload([stored(concert(), { id: 7 })], [7]);
    const r = await syncEvents(f.payload as never, deps({ list: async () => ({ ok: true as const, value: [concert({ playCount: 99 })] }) }));
    expect(f.writes).toEqual([]);
    expect(r.updated).toBe(0);
  });
  it("counts a failed lookup and changes nothing", async () => {
    const f = fakePayload([stored(concert({ id: "x" }), { id: 9 })]);
    const r = await syncEvents(f.payload as never, deps({ list: async () => ({ ok: true as const, value: [] }), lookup: async () => ({ ok: false as const }) }));
    expect(r.failed).toBe(1);
    expect(f.writes).toEqual([]);
  });
});
