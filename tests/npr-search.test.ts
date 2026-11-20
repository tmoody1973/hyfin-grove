import { describe, expect, it, vi } from "vitest";
import { searchNpr } from "@/lib/npr/search";
import { NPR_OWNER } from "@/lib/npr/accept";

const doc = (id: string, title: string, o: Record<string, unknown> = {}) => ({
  id,
  title,
  teaser: null,
  publishDateTime: "2026-11-20T10:00:00Z",
  profiles: [{ href: "/v1/profiles/story" }],
  webPages: [{ href: `https://www.npr.org/2026/11/20/${id}/x`, rels: ["canonical"] }],
  owners: [{ href: NPR_OWNER }],
  ...o,
});

function cds(resources: unknown[]) {
  const urls: URL[] = [];
  const fetchImpl = vi.fn(async (u: string | URL | Request) => {
    urls.push(new URL(String(u)));
    return new Response(JSON.stringify({ resources }));
  }) as unknown as typeof fetch;
  return { fetchImpl, urls };
}

describe("searchNpr: the Add from NPR box (plan 11, task 3)", () => {
  it("an npr.org link: one exact lookup by path, sent only to CDS", async () => {
    const { fetchImpl, urls } = cds([doc("g-s1-154644", "How Orchestra Noir turned classical music into a cultural moment")]);
    const r = await searchNpr("https://www.npr.org/2026/11/20/g-s1-154644/orchestra-noir", { token: "t", fetchImpl });
    expect(r.map((x) => x.id)).toEqual(["g-s1-154644"]);
    expect(urls).toHaveLength(1);
    expect(urls[0].origin).toBe("https://content.api.npr.org");
    expect(urls[0].searchParams.get("nprWebsitePaths")).toBe("/2026/11/20/g-s1-154644/orchestra-noir");
  });

  it("a non-npr.org link is only keywords: CDS is the one host ever asked", async () => {
    const { fetchImpl, urls } = cds([doc("a", "Story about evil")]);
    await searchNpr("http://169.254.169.254/latest", { token: "t", fetchImpl });
    expect(urls.every((u) => u.origin === "https://content.api.npr.org")).toBe(true);
    expect(urls[0].searchParams.get("ownerHrefs")).toBe(NPR_OWNER);
  });

  it("keywords: only stories whose title or teaser has every word", async () => {
    const { fetchImpl } = cds([doc("a", "Orchestra Noir on tour"), doc("b", "Orchestra news"), doc("c", "Noir film", { teaser: "an orchestra plays" })]);
    expect((await searchNpr("orchestra noir", { token: "t", fetchImpl })).map((x) => x.id)).toEqual(["a", "c"]);
  });

  it("never offers another station's story, a premium one, or one without an npr.org page", async () => {
    const { fetchImpl } = cds([
      doc("ok", "Orchestra"),
      doc("station", "Orchestra", { owners: [{ href: "https://organization.api.npr.org/v4/services/s921" }] }),
      doc("premium", "Orchestra", { profiles: [{ href: "/v1/profiles/story" }, { href: "/v1/profiles/has-premium-audio" }] }),
      doc("nopage", "Orchestra", { webPages: [] }),
    ]);
    expect((await searchNpr("orchestra", { token: "t", fetchImpl })).map((x) => x.id)).toEqual(["ok"]);
  });

  it("an empty box browses NPR Music and Race, newest first, without repeats", async () => {
    const { fetchImpl, urls } = cds([doc("a", "A", { publishDateTime: "2026-11-20T10:00:00Z" }), doc("b", "B", { publishDateTime: "2026-11-21T10:00:00Z" })]);
    const r = await searchNpr("", { token: "t", fetchImpl });
    expect(urls.map((u) => u.searchParams.get("collectionIds")).sort()).toEqual(["1015", "1039"]);
    expect(r.map((x) => x.id)).toEqual(["b", "a"]);
  });

  it("no token, or CDS failing: an empty list, not an error page", async () => {
    expect(await searchNpr("x", { token: undefined, fetchImpl: vi.fn() as never })).toEqual([]);
    expect(await searchNpr("x", { token: "t", fetchImpl: vi.fn(async () => new Response("", { status: 500 })) as never })).toEqual([]);
  });
});
