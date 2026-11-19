import { describe, expect, it } from "vitest";
import type { Post } from "@/payload-types";
import { getLead, getPostPage, toCard } from "@/lib/stories";

const post = (over: Partial<Post> = {}): Post =>
  ({
    id: 1,
    title: "A story",
    slug: "a-story",
    category: "music",
    publishedAt: "2026-11-19T14:00:00.000Z",
    source: "cds",
    updatedAt: "",
    createdAt: "",
    ...over,
  }) as Post;

describe("toCard", () => {
  it("prefers the uploaded hero image, then the CDS image, then none", () => {
    const hero = { id: 3, url: "https://x.public.blob.vercel-storage.com/a.jpg", alt: "Alt", updatedAt: "", createdAt: "" };
    expect(toCard(post({ heroImage: hero, cds: { imageUrl: "https://npr.brightspotcdn.com/b.jpg" } })).imageUrl).toBe(hero.url);
    expect(toCard(post({ heroImage: hero })).imageAlt).toBe("Alt");
    expect(toCard(post({ heroImage: 3, cds: { imageUrl: "https://npr.brightspotcdn.com/b.jpg" } })).imageUrl).toBe("https://npr.brightspotcdn.com/b.jpg");
    expect(toCard(post({ cds: { imageUrl: "" } })).imageUrl).toBeNull();
    expect(toCard(post()).imageUrl).toBeNull();
  });
  it("labels with the show name, else the first tag, else nothing", () => {
    const show = { id: 9, name: "Ladies First" } as never;
    const tags = [{ id: 2, name: "Interviews" }, { id: 3, name: "Arts" }] as never;
    expect(toCard(post({ show, tags })).label).toBe("Ladies First");
    expect(toCard(post({ tags })).label).toBe("Interviews");
    expect(toCard(post({ tags: [2, 3] })).label).toBeNull();
    expect(toCard(post()).label).toBeNull();
  });
  it("links to /<category>/<slug> and keeps empty fields null", () => {
    const c = toCard(post({ category: "culture", slug: "x y", excerpt: "", byline: "  " }));
    expect(c.href).toBe("/culture/x%20y");
    expect(c.excerpt).toBeNull();
    expect(c.byline).toBeNull();
  });
});

/** A fake Payload: `posts` are the visible stories, newest first; withdrawn ones are left out like visible() would. */
function fakeDb(posts: Post[]) {
  const calls: unknown[] = [];
  return {
    calls,
    find: async (args: { where: unknown; page?: number; limit?: number }) => {
      calls.push(args);
      const text = JSON.stringify(args.where);
      const pin = /"id":\{"equals":(\d+)\}/.exec(text);
      const notIn = /"id":\{"not_in":\[([\d,]*)\]\}/.exec(text);
      const skip = new Set((notIn?.[1] ?? "").split(",").filter(Boolean).map(Number));
      const docs = (pin ? posts.filter((p) => p.id === Number(pin[1])) : posts).filter((p) => !skip.has(p.id));
      const limit = args.limit ?? 10;
      return { docs: docs.slice(0, limit), page: args.page ?? 1, totalPages: Math.max(1, Math.ceil(docs.length / limit)) };
    },
  };
}

describe("getLead", () => {
  const newest = post({ id: 5, title: "Newest with image", cds: { imageUrl: "https://npr.brightspotcdn.com/n.jpg" } });
  const pinned = post({ id: 7, title: "Pinned" });

  it("returns the pinned story when it is still on the site", async () => {
    const db = fakeDb([newest, pinned]);
    expect((await getLead(db as never, 7, "music"))?.title).toBe("Pinned");
    expect((await getLead(db as never, pinned, "music"))?.title).toBe("Pinned");
  });
  it("falls back to the newest story with an image when the pin was withdrawn or deleted", async () => {
    const db = fakeDb([newest]);
    expect((await getLead(db as never, 7, "music"))?.title).toBe("Newest with image");
  });
  it("falls back when nothing is pinned, and returns null when there are no stories", async () => {
    expect((await getLead(fakeDb([newest]) as never, null, "music"))?.title).toBe("Newest with image");
    expect(await getLead(fakeDb([]) as never, undefined)).toBeNull();
  });
  it("skips stories already used elsewhere on the page when falling back, but honours an explicit pin", async () => {
    const other = post({ id: 8, title: "Next with image", cds: { imageUrl: "https://npr.brightspotcdn.com/o.jpg" } });
    expect((await getLead(fakeDb([newest, other]) as never, null, "milwaukee", [5]))?.title).toBe("Next with image");
    expect((await getLead(fakeDb([newest, other]) as never, 5, "milwaukee", [5]))?.title).toBe("Newest with image");
  });
  it("asks only for card fields for the lead too", async () => {
    const db = fakeDb([newest]);
    await getLead(db as never, null);
    expect((db.calls[0] as { select?: object }).select).not.toHaveProperty("body");
  });
  it("only ever asks for visible stories", async () => {
    const db = fakeDb([newest]);
    await getLead(db as never, 7, "music");
    for (const c of db.calls) expect(JSON.stringify(c)).toContain('"cds.withdrawnAt":{"exists":false}');
  });
});

describe("getPostPage", () => {
  it("returns cards with the page and total pages, filtered by category and tag", async () => {
    const db = fakeDb([post({ id: 1 }), post({ id: 2 })]);
    const r = await getPostPage(db as never, { category: "music", tagSlug: "interviews", page: 2, perPage: 1 });
    expect(r).toMatchObject({ page: 2, totalPages: 2 });
    expect(r.cards[0].href).toBe("/music/a-story");
    const where = JSON.stringify(db.calls[0]);
    expect(where).toContain('"category":{"equals":"music"}');
    expect(where).toContain('"tags.slug":{"equals":"interviews"}');
    expect(where).toContain('"cds.withdrawnAt":{"exists":false}');
  });
  it("can leave out leads so they aren't listed twice", async () => {
    const db = fakeDb([post()]);
    await getPostPage(db as never, { category: "music", excludeIds: [7, 9], page: 1, perPage: 24 });
    expect(JSON.stringify(db.calls[0])).toContain('"id":{"not_in":[7,9]}');
  });
  it("asks only for the fields a card needs (no story bodies)", async () => {
    const db = fakeDb([post()]);
    await getPostPage(db as never, { page: 1, perPage: 8 });
    const call = db.calls[0] as { select?: Record<string, unknown>; populate?: Record<string, unknown> };
    expect(call.select).toMatchObject({ title: true, slug: true, heroImage: true, show: true, tags: true, cds: { imageUrl: true } });
    expect(call.select).not.toHaveProperty("body");
    expect(call.select).not.toHaveProperty("cdsBody");
    expect(call.populate).toMatchObject({ shows: { name: true }, tags: { name: true }, media: { url: true, alt: true } });
    // Payload computes an upload's url from its filename: without filename, url comes back null (seen on the homepage).
    expect(call.populate).toMatchObject({ media: { filename: true } });
  });
});
