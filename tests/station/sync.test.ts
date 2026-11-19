import { describe, expect, it } from "vitest";
import { syncStation, type StationCopy } from "@/lib/station/sync";
import type { FeedEpisode } from "@/lib/station/feed";

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
/** In-memory Payload: equals filters on dotted paths, create, update. */
function fakePayload() {
  const tables: Record<string, Row[]> = { posts: [], shows: [] };
  let nextId = 1;
  const get = (row: Row, path: string) => path.split(".").reduce((v, k) => v?.[k], row);
  const matches = (row: Row, where: Row = {}): boolean =>
    Object.entries(where).every(([k, cond]) => (k === "and" ? (cond as Row[]).every((w) => matches(row, w)) : get(row, k) === (cond as Row).equals));
  return {
    tables,
    find: async ({ collection, where }: Row) => ({ docs: tables[collection].filter((r) => matches(r, where)) }),
    count: async ({ collection, where }: Row) => ({ totalDocs: tables[collection].filter((r) => matches(r, where)).length }),
    create: async ({ collection, data }: Row) => { const row = { id: nextId++, ...data }; tables[collection].push(row); return row; },
    update: async ({ collection, id, data }: Row) => { const row = tables[collection].find((r) => r.id === id)!; Object.assign(row, data); return row; },
  };
}

const ep = (over: Partial<FeedEpisode> = {}): FeedEpisode => ({
  url: "https://radiomilwaukee.org/podcast/uniquely-milwaukee/2026-11-13/kasi-lemmons-movies-eves-bayou",
  title: "A conversation with Kasi Lemmons",
  summary: "The celebrated director & more.",
  author: "Kim Shine",
  imageUrl: "https://npr.brightspotcdn.com/a.jpg",
  publishedAt: "2026-11-13T17:00:00.000Z",
  ...over,
});
const copy: StationCopy = { id: "fis-718414860-51d3", html: "<p>Full description</p><script>x</script>", audioUrl: "https://dts.podtrac.com/a.mp3", durationSeconds: 813 };

const run = (payload: ReturnType<typeof fakePayload>, episodes: FeedEpisode[], found: StationCopy | null | "throw" = copy) =>
  syncStation(payload as never, { fetchFeed: async () => episodes, findCopy: async () => { if (found === "throw") throw new Error("CDS down"); return found; } });

describe("syncStation", () => {
  it("imports a new episode as a Milwaukee story on the Uniquely Milwaukee show, with text and audio from its CDS copy", async () => {
    const db = fakePayload();
    expect(await run(db, [ep()])).toMatchObject({ created: 1, updated: 0, unchanged: 0, withoutAudio: 0 });
    const [post] = db.tables.posts;
    expect(post).toMatchObject({ source: "station", category: "milwaukee", title: "A conversation with Kasi Lemmons", byline: "Kim Shine", excerpt: "The celebrated director & more.", slug: "kasi-lemmons-movies-eves-bayou" });
    expect(post.station).toEqual({ url: ep().url, cdsCopyId: copy.id });
    expect(post.cds).toEqual({ imageUrl: ep().imageUrl });
    expect(post.audio).toEqual({ url: copy.audioUrl, durationSeconds: 813 });
    expect(post.cdsBody[0].html).toContain("Full description");
    expect(post.cdsBody[0].html).not.toContain("<script");
    expect(db.tables.shows).toMatchObject([{ slug: "uniquely-milwaukee", name: "Uniquely Milwaukee" }]);
    expect(post.show).toBe(db.tables.shows[0].id);
  });
  it("is idempotent: a second run changes nothing and creates no duplicate", async () => {
    const db = fakePayload();
    await run(db, [ep()]);
    expect(await run(db, [ep()])).toMatchObject({ created: 0, updated: 0, unchanged: 1 });
    expect(db.tables.posts).toHaveLength(1);
    expect(db.tables.shows).toHaveLength(1);
  });
  it("updates the same post when the title changes upstream, keeping the editor's category", async () => {
    const db = fakePayload();
    await run(db, [ep()]);
    db.tables.posts[0].category = "culture";
    expect(await run(db, [ep({ title: "New title" })])).toMatchObject({ updated: 1, created: 0 });
    expect(db.tables.posts[0]).toMatchObject({ title: "New title", category: "culture" });
  });
  it("imports without audio when the CDS copy is missing or CDS is down, and fills audio in later", async () => {
    const db = fakePayload();
    expect(await run(db, [ep()], null)).toMatchObject({ created: 1, withoutAudio: 1 });
    expect(db.tables.posts[0].audio).toBeUndefined();
    expect(db.tables.posts[0].cdsBody[0].html).toContain("The celebrated director &amp; more.");
    expect(await run(db, [ep()], "throw")).toMatchObject({ unchanged: 1, withoutAudio: 1 });
    expect(await run(db, [ep()])).toMatchObject({ updated: 1, withoutAudio: 0 });
    expect(db.tables.posts[0].audio.url).toBe(copy.audioUrl);
  });
  it("gives a clashing slug a suffix instead of failing", async () => {
    const db = fakePayload();
    db.tables.posts.push({ id: 99, slug: "kasi-lemmons-movies-eves-bayou" });
    await run(db, [ep()]);
    expect(db.tables.posts[1].slug).toBe("kasi-lemmons-movies-eves-bayou-um");
  });
  it("stays unchanged when the database returns groups with extra empty fields (as Payload does)", async () => {
    const db = fakePayload();
    await run(db, [ep()]);
    const row = db.tables.posts[0];
    row.cds = { documentId: null, canonicalUrl: null, imageUrl: row.cds.imageUrl, withdrawnAt: null };
    row.station = { ...row.station, extra: null };
    expect(await run(db, [ep()])).toMatchObject({ unchanged: 1, updated: 0 });
  });
});
