import { describe, expect, it } from "vitest";
import { resolveLegacy, safeTarget } from "@/lib/legacy/resolve";

type Row = { from: string; to: { type: "custom" | "reference"; url?: string; reference?: { relationTo: "posts"; value: unknown } } };
const fakeDb = (rows: Row[]) => ({
  find: async ({ collection, where }: { collection: string; where: { from?: { in: string[] } } }) => ({
    docs: collection === "redirects" ? rows.filter((r) => where.from?.in.includes(r.from)) : [],
  }),
});

describe("safeTarget", () => {
  it("allows our own paths and Radio Milwaukee", () => {
    expect(safeTarget("/listen/playlist")).toBe("/listen/playlist");
    expect(safeTarget("https://radiomilwaukee.org/donate")).toBe("https://radiomilwaukee.org/donate");
  });
  it("allows our own Blob file storage (old /wp-content/uploads/ images), nothing that only looks like it", () => {
    expect(safeTarget("https://bvqe7etkv8phdxgr.public.blob.vercel-storage.com/a.jpg")).toBe("https://bvqe7etkv8phdxgr.public.blob.vercel-storage.com/a.jpg");
    expect(safeTarget("https://evil.com/.public.blob.vercel-storage.com/a.jpg")).toBeNull();
    expect(safeTarget("https://x.public.blob.vercel-storage.com.evil.com/a.jpg")).toBeNull();
  });
  it.each(["//evil.com", "/\\evil.com", "\\\\evil.com", "https://evil.com/x", "https://radiomilwaukee.org.evil.com/", "http://radiomilwaukee.org/x", "javascript:alert(1)", ""])("rejects %s", (to) => {
    expect(safeTarget(to)).toBeNull();
  });
});

describe("resolveLegacy", () => {
  it("uses a Redirects row, with or without the trailing slash", async () => {
    const db = fakeDb([{ from: "/playlist-2/", to: { type: "custom", url: "/listen/playlist" } }]);
    expect(await resolveLegacy("/playlist-2", db as never)).toBe("/listen/playlist");
    expect(await resolveLegacy("/playlist-2/", db as never)).toBe("/listen/playlist");
  });
  it("keeps image paths' capitals (file names are case-sensitive)", async () => {
    const seen: string[] = [];
    const db = { find: async ({ where }: { where: { from?: { in: string[] } } }) => { if (where.from) seen.push(...where.from.in); return { docs: [] }; } };
    await resolveLegacy("/wp-content/uploads/2024/04/IMG_9206.jpg", db as never);
    expect(seen).toContain("/wp-content/uploads/2024/04/img_9206.jpg");
  });
  it("ignores capital letters in the old address", async () => {
    const db = fakeDb([{ from: "/harlem/", to: { type: "custom", url: "/harlem-nights" } }]);
    expect(await resolveLegacy("/Harlem/", db as never)).toBe("/harlem-nights");
  });
  it("resolves an old paginated address like its parent", async () => {
    const db = fakeDb([{ from: "/hyfin-event-calendar/", to: { type: "custom", url: "/events" } }]);
    expect(await resolveLegacy("/hyfin-event-calendar/page/2/", db as never)).toBe("/events");
  });
  it("follows a row that points at a post", async () => {
    const db = fakeDb([{ from: "/x", to: { type: "reference", reference: { relationTo: "posts", value: { category: "music", slug: "a-b" } } } }]);
    expect(await resolveLegacy("/x", db as never)).toBe("/music/a-b");
  });
  it("ignores rows that point off-site or back at themselves", async () => {
    expect(await resolveLegacy("/x", fakeDb([{ from: "/x", to: { type: "custom", url: "https://evil.com" } }]) as never)).toBeNull();
    expect(await resolveLegacy("/x", fakeDb([{ from: "/x", to: { type: "custom", url: "/x/" } }]) as never)).toBeNull();
  });
  it("returns null for an unknown address and for malformed encoding", async () => {
    expect(await resolveLegacy("/nothing-here", fakeDb([]) as never)).toBeNull();
    expect(await resolveLegacy("/%E0%A4%A", fakeDb([]) as never)).toBeNull();
  });
  it("strips any number of /page/N at once, with a bounded number of queries", async () => {
    let queries = 0;
    const db = { find: async () => { queries++; return { docs: [] }; } };
    await resolveLegacy("/zzz" + "/page/1".repeat(1000), db as never);
    expect(queries).toBeLessThanOrEqual(6);
  });
  it("returns null (a 404) for control characters such as %00, without querying", async () => {
    let queries = 0;
    const db = { find: async () => { queries++; return { docs: [] }; } };
    expect(await resolveLegacy("/foo%00", db as never)).toBeNull();
    expect(await resolveLegacy("/tag/x%0A", db as never)).toBeNull();
    expect(queries).toBe(0);
  });
  it("follows a chain of rows to its end in one hop, and returns null for a loop", async () => {
    const chain = fakeDb([
      { from: "/a", to: { type: "custom", url: "/b" } },
      { from: "/b", to: { type: "custom", url: "/listen/playlist" } },
    ]);
    expect(await resolveLegacy("/a", chain as never)).toBe("/listen/playlist");
    const loop = fakeDb([
      { from: "/a", to: { type: "custom", url: "/b" } },
      { from: "/b", to: { type: "custom", url: "/a" } },
    ]);
    expect(await resolveLegacy("/a", loop as never)).toBeNull();
  });
});

describe("safeTarget, hostile targets", () => {
  it.each(["/\t/evil.com", "/\n/x", "/ok\u0000", "/ /evil.com"])("rejects whitespace/control characters: %j", (t) => {
    expect(safeTarget(t)).toBeNull();
  });
  it("only allows our own Blob store, not any Vercel customer's", () => {
    expect(safeTarget("https://someoneelse123.public.blob.vercel-storage.com/x.jpg")).toBeNull();
  });
});
