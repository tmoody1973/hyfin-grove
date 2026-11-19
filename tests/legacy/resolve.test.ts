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
});
