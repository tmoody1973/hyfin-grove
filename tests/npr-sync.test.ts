import { describe, expect, it, vi } from "vitest";
import { runNprSync } from "@/lib/npr/sync";
import { NPR_OWNER } from "@/lib/npr/accept";

const now = new Date("2026-11-20T20:00:00Z");
const story = (id: string, published = "2026-11-19T12:00:00Z") => ({
  id,
  title: `Story ${id}`,
  publishDateTime: published,
  editorialLastModifiedDateTime: published,
  profiles: [{ href: "/v1/profiles/story" }],
  webPages: [{ href: `https://www.npr.org/2026/11/19/${id}/x`, rels: ["canonical"] }],
  owners: [{ href: NPR_OWNER }],
});

/** A fake CDS: Race returns `race`; an ids query returns whichever of `byId` it asks for. */
function cds(race: unknown[], byId: Record<string, unknown>) {
  return vi.fn(async (url: string | URL | Request) => {
    const p = new URL(String(url)).searchParams;
    const ids = p.get("ids");
    const resources = ids ? ids.split(",").flatMap((id) => (byId[id] ? [byId[id]] : [])) : p.get("collectionIds") ? race : [];
    return new Response(JSON.stringify({ resources }));
  }) as unknown as typeof fetch;
}

/** A fake Payload holding stored NPR copies. */
function db(stored: Array<{ id: number; cdsId: string; origin?: string; publishedAt?: string; lastCheckedAt?: string | null; withdrawnAt?: string | null }>) {
  return {
    logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
    find: vi.fn(async () => ({
      docs: stored.map((s) => ({ id: s.id, publishedAt: s.publishedAt ?? "2026-11-19T12:00:00Z", npr: { origin: s.origin ?? "race" }, cds: { documentId: s.cdsId, editorialLastModified: s.publishedAt ?? "2026-11-19T12:00:00Z", withdrawnAt: s.withdrawnAt ?? null, lastCheckedAt: s.lastCheckedAt ?? "2026-11-20T19:45:00Z" } })),
    })),
    create: vi.fn(async () => ({})),
    update: vi.fn(async () => ({})),
    delete: vi.fn(async () => ({})),
  };
}

describe("runNprSync (plan 11, task 2)", () => {
  it("first run: copies the newest Race stories into Culture as read-only NPR posts", async () => {
    const payload = db([]);
    const counts = await runNprSync(payload as never, { token: "t", now, fetchImpl: cds([story("g-s1-1"), story("g-s1-2")], {}) });
    expect(counts).toMatchObject({ race: 2, created: 2, failed: 0 });
    expect((payload.create.mock.calls[0] as unknown[])[0]).toMatchObject({ collection: "posts", data: { source: "npr", category: "culture", slug: "npr-g-s1-1", npr: { origin: "race" }, cds: { documentId: "g-s1-1" } } });
  });

  it("withdraws a copy NPR stopped serving, and clears its text", async () => {
    const payload = db([{ id: 7, cdsId: "g-s1-7" }]);
    const counts = await runNprSync(payload as never, { token: "t", now, fetchImpl: cds([], {}) });
    expect(counts.withdrawn).toBe(1);
    expect(payload.update).toHaveBeenCalledWith({ collection: "posts", id: 7, data: expect.objectContaining({ cdsBody: [], cds: { withdrawnAt: now.toISOString() } }) });
  });

  it("deletes an unpicked Race copy 30 days after NPR published it", async () => {
    const payload = db([{ id: 8, cdsId: "g-s1-8", publishedAt: "2026-10-01T00:00:00Z" }]);
    const counts = await runNprSync(payload as never, { token: "t", now, fetchImpl: cds([], { "g-s1-8": story("g-s1-8", "2026-10-01T00:00:00Z") }) });
    expect(counts.expired).toBe(1);
    expect(payload.delete).toHaveBeenCalledWith({ collection: "posts", id: 8 });
  });

  it("CDS down: leaves everything alone except hiding copies nobody could confirm for 24 hours", async () => {
    const payload = db([
      { id: 1, cdsId: "g-s1-1", lastCheckedAt: "2026-11-20T19:45:00Z" },
      { id: 2, cdsId: "g-s1-2", lastCheckedAt: "2026-11-19T10:00:00Z" },
    ]);
    const down = vi.fn(async () => new Response("", { status: 503 })) as unknown as typeof fetch;
    const counts = await runNprSync(payload as never, { token: "t", now, fetchImpl: down });
    expect(counts).toMatchObject({ error: "CDS 503", staleHidden: 1, created: 0 });
    expect(payload.update).toHaveBeenCalledTimes(1);
    expect(payload.update).toHaveBeenCalledWith({ collection: "posts", id: 2, data: { cds: { withdrawnAt: now.toISOString() } } });
    expect(payload.delete).not.toHaveBeenCalled();
  });

  it("confirms the copies CDS still serves unchanged, in one write", async () => {
    const payload = db([{ id: 3, cdsId: "g-s1-3" }]);
    const counts = await runNprSync(payload as never, { token: "t", now, fetchImpl: cds([], { "g-s1-3": story("g-s1-3") }) });
    expect(counts.checked).toBe(1);
    expect(payload.update).toHaveBeenCalledWith({ collection: "posts", where: { id: { in: [3] } }, data: { cds: { lastCheckedAt: now.toISOString() } } });
  });
});
