import { describe, expect, it } from "vitest";
import type { Payload } from "payload";
import fixture from "../fixtures/cds/qing-madi.json";
import { runCdsSync } from "@/lib/cds/sync";

type Call = { collection?: string; slug?: string; id?: number; data: Record<string, unknown> & { cds?: { documentId?: string } } };

/** A stand-in for Payload's Local API: records writes, answers reads from `stored`. */
function fakePayload(opts: { stored?: Array<Record<string, unknown>>; slugTaken?: boolean; failCreateFor?: string } = {}) {
  const calls = { create: [] as Call[], update: [] as Call[], updateGlobal: [] as Call[] };
  const payload = {
    logger: { info: () => {}, error: () => {} },
    find: async ({ collection }: { collection: string }) => ({ docs: collection === "posts" ? (opts.stored ?? []) : [] }),
    count: async () => ({ totalDocs: opts.slugTaken ? 1 : 0 }),
    create: async (a: Call) => {
      if (a.collection === "posts" && a.data.cds?.documentId === opts.failCreateFor) throw new Error("duplicate key");
      calls.create.push(a);
      return { id: a.collection === "shows" ? 7 : 99 };
    },
    update: async (a: Call) => (calls.update.push(a), {}),
    updateGlobal: async (a: Call) => (calls.updateGlobal.push(a), {}),
  };
  return { calls, payload: payload as unknown as Payload };
}

/** CDS stand-in: the scoped query returns `docs`; id lookups (bylines, still-present) return nothing. */
const cds = (docs: unknown[]) => (async (url: string | URL) =>
  new Response(JSON.stringify({ resources: String(url).includes("ids=") ? [] : docs }))) as unknown as typeof fetch;

const env = { token: "t", typesafeKey: "k" };
const now = new Date("2026-11-19T12:00:00Z");
const quiet = { now, log: () => {} };

describe("runCdsSync", () => {
  it("creates a Ladies First story as Music under its show, and records a success", async () => {
    const { calls, payload } = fakePayload();
    const counts = await runCdsSync(payload, env, { ...quiet, fetchImpl: cds([fixture]) });
    expect(counts).toMatchObject({ fetched: 1, created: 1, failed: 0 });
    const post = calls.create.find((c) => c.collection === "posts")!.data;
    expect(post).toMatchObject({ category: "music", show: 7, source: "cds", slug: "qing-madi-songs-2026" });
    expect(calls.create.find((c) => c.collection === "shows")!.data).toEqual({ name: "Ladies First", slug: "ladies-first" });
    expect(calls.updateGlobal[0].data.lastSuccessAt).toBe(now.toISOString());
  });

  it("appends the CDS number when another post already has the slug", async () => {
    const { calls, payload } = fakePayload({ slugTaken: true });
    await runCdsSync(payload, env, { ...quiet, fetchImpl: cds([fixture]) });
    expect(calls.create.find((c) => c.collection === "posts")!.data.slug).toBe("qing-madi-songs-2026-17816");
  });

  it("updates an edited story without touching the editor's category, tags, show or slug", async () => {
    const stored = [{ id: 5, cds: { documentId: "g-s921-17816", editorialLastModified: "2026-01-01T00:00:00Z", withdrawnAt: null } }];
    const { calls, payload } = fakePayload({ stored });
    const counts = await runCdsSync(payload, env, { ...quiet, fetchImpl: cds([fixture]) });
    expect(counts).toMatchObject({ updated: 1, created: 0 });
    expect(calls.update[0].id).toBe(5);
    for (const key of ["category", "tags", "show", "slug", "sorting"]) expect(calls.update[0].data).not.toHaveProperty(key);
    expect(calls.update[0].data.title).toBe("Ladies First: Qing Madi");
  });

  it("keeps going when one story fails, and does not record a success", async () => {
    const other = { ...fixture, id: "g-s921-99999", webPages: [] };
    const { calls, payload } = fakePayload({ failCreateFor: "g-s921-17816" });
    const counts = await runCdsSync(payload, env, { ...quiet, fetchImpl: cds([fixture, other]) });
    expect(counts).toMatchObject({ created: 1, failed: 1 });
    expect(calls.updateGlobal[0].data).not.toHaveProperty("lastSuccessAt");
    expect(calls.updateGlobal[0].data.lastError).toMatch(/1 item/);
  });
});
