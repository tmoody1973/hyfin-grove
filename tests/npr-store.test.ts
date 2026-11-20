import { describe, expect, it } from "vitest";
import { acceptNprDoc, NPR_OWNER } from "@/lib/npr/accept";
import { planNprSync, type StoredNpr } from "@/lib/npr/plan";
import { matchesKeywords, parseNprQuery } from "@/lib/npr/query";
import { toCard } from "@/lib/stories";
import type { CdsDocument, CdsPostData } from "@/lib/cds/toPost";

const doc = (o: Partial<CdsDocument> & { owners?: { href: string }[] } = {}): CdsDocument =>
  ({
    id: "g-s1-154644",
    title: "How Orchestra Noir turned classical music into a cultural moment",
    teaser: "An Atlanta orchestra on tour.",
    publishDateTime: "2026-11-20T10:00:00-05:00",
    editorialLastModifiedDateTime: "2026-11-20T11:00:00-05:00",
    profiles: [{ href: "/v1/profiles/story" }],
    webPages: [{ href: "https://www.npr.org/2026/11/20/g-s1-154644/orchestra-noir", rels: ["canonical"] }],
    owners: [{ href: NPR_OWNER }],
    ...o,
  }) as CdsDocument;

describe("acceptNprDoc: which CDS stories HYFIN may copy (plan 11)", () => {
  it("accepts NPR's own, non-premium stories with an npr.org address", () => {
    expect(acceptNprDoc(doc())).toMatchObject({ cdsId: "g-s1-154644", canonicalUrl: "https://www.npr.org/2026/11/20/g-s1-154644/orchestra-noir" });
  });
  it("refuses other stations' stories, premium stories, and anything without an npr.org address", () => {
    expect(acceptNprDoc(doc({ owners: [{ href: "https://organization.api.npr.org/v4/services/s921" }] }))).toBeNull();
    expect(acceptNprDoc(doc({ profiles: [{ href: "/v1/profiles/story" }, { href: "/v1/profiles/has-premium-audio" }] }))).toBeNull();
    expect(acceptNprDoc(doc({ webPages: [{ href: "https://example.com/x", rels: ["canonical"] }] } as Partial<CdsDocument>))).toBeNull();
    expect(acceptNprDoc(doc({ webPages: [] }))).toBeNull();
  });
});

const DAY = 86_400_000;
const now = new Date("2026-11-20T20:00:00Z");
const data = (id: string, o: Partial<CdsPostData> = {}): CdsPostData =>
  ({ cdsId: id, title: id, excerpt: null, publishedAt: "2026-11-19T00:00:00Z", byline: null, audio: null, imageUrl: null, imageCaption: null, imageCredit: null, imageAlt: null, canonicalUrl: `https://www.npr.org/x/${id}`, editorialLastModified: "2026-11-19T00:00:00Z", cdsBody: [], collectionIds: [], premium: false, ...o }) as CdsPostData;
const stored = (id: string, o: Partial<StoredNpr> = {}): StoredNpr => ({ postId: Number(id.replace(/\D/g, "")) || 1, cdsId: id, origin: "race", publishedAt: "2026-11-19T00:00:00Z", editorialLastModified: "2026-11-19T00:00:00Z", withdrawnAt: null, ...o });

describe("planNprSync: keeping NPR copies current (plan 11, task 2)", () => {
  it("creates Race stories HYFIN doesn't have yet", () => {
    const plan = planNprSync({ race: [data("a1"), data("b2")], stored: [stored("a1")], current: new Map([["a1", data("a1")]]), now });
    expect(plan.create.map((d) => d.cdsId)).toEqual(["b2"]);
  });
  it("updates a copy NPR edited, leaves an unchanged one alone", () => {
    const edited = data("a1", { editorialLastModified: "2026-11-20T00:00:00Z" });
    expect(planNprSync({ race: [], stored: [stored("a1")], current: new Map([["a1", edited]]), now }).update).toEqual([{ postId: 1, data: edited }]);
    expect(planNprSync({ race: [], stored: [stored("a1")], current: new Map([["a1", data("a1")]]), now }).update).toEqual([]);
  });
  it("withdraws a copy NPR no longer serves (gone, premium, or no longer NPR's), and restores one that comes back", () => {
    expect(planNprSync({ race: [], stored: [stored("a1")], current: new Map([["a1", null]]), now }).withdraw).toEqual([1]);
    const back = planNprSync({ race: [], stored: [stored("a1", { withdrawnAt: "2026-11-19T00:00:00Z" })], current: new Map([["a1", data("a1")]]), now });
    expect(back.restore).toEqual([{ postId: 1, data: data("a1") }]);
    expect(back.withdraw).toEqual([]);
  });
  it("Race copies expire 30 days after publishing, unless still in Race or picked by staff", () => {
    const old = "2026-10-01T00:00:00Z";
    expect(planNprSync({ race: [], stored: [stored("a1", { publishedAt: old })], current: new Map([["a1", data("a1", { publishedAt: old })]]), now }).expire).toEqual([1]);
    expect(planNprSync({ race: [data("a1", { publishedAt: old })], stored: [stored("a1", { publishedAt: old })], current: new Map([["a1", data("a1", { publishedAt: old })]]), now }).expire).toEqual([]);
    expect(planNprSync({ race: [], stored: [stored("a1", { publishedAt: old, origin: "picked" })], current: new Map([["a1", data("a1")]]), now }).expire).toEqual([]);
    expect(now.getTime() - Date.parse(old)).toBeGreaterThan(30 * DAY);
  });
  it("never creates a Race copy of a story staff already picked", () => {
    expect(planNprSync({ race: [data("a1")], stored: [stored("a1", { origin: "picked" })], current: new Map([["a1", data("a1")]]), now }).create).toEqual([]);
  });
  it("a stored copy CDS didn't answer for (left out of `current`) is left as it is", () => {
    const plan = planNprSync({ race: [], stored: [stored("a1")], current: new Map(), now });
    expect(plan).toEqual({ create: [], update: [], withdraw: [], restore: [], expire: [] });
  });
});

describe("parseNprQuery: what the Add from NPR box was given", () => {
  it("an npr.org link becomes an exact lookup by its path", () => {
    expect(parseNprQuery("https://www.npr.org/2026/11/20/g-s1-154644/orchestra-noir-black-musical-tour-classical-music?utm=x")).toEqual({ kind: "path", path: "/2026/11/20/g-s1-154644/orchestra-noir-black-musical-tour-classical-music" });
    expect(parseNprQuery("npr.org/2026/11/20/g-s1-154644/orchestra-noir")).toEqual({ kind: "path", path: "/2026/11/20/g-s1-154644/orchestra-noir" });
  });
  it("a story id becomes a lookup by id", () => {
    expect(parseNprQuery(" g-s1-154644 ")).toEqual({ kind: "id", id: "g-s1-154644" });
    expect(parseNprQuery("1234567890")).toEqual({ kind: "id", id: "1234567890" });
  });
  it("anything that isn't npr.org is plain keywords, never a fetch", () => {
    expect(parseNprQuery("https://evil.example/npr.org/2026/x")).toEqual({ kind: "keywords", words: ["https", "evil", "example", "npr", "org", "2026", "x"] });
    expect(parseNprQuery("http://169.254.169.254/latest")).toMatchObject({ kind: "keywords" });
    expect(parseNprQuery("https://www.npr.org.evil.example/2026/11/20/x")).toMatchObject({ kind: "keywords" });
    expect(parseNprQuery("Orchestra  Noir")).toEqual({ kind: "keywords", words: ["orchestra", "noir"] });
  });
  it("an empty box browses", () => {
    expect(parseNprQuery("   ")).toEqual({ kind: "browse" });
  });
});

describe("matchesKeywords", () => {
  it("needs every word, in the title or the teaser, ignoring case and accents", () => {
    expect(matchesKeywords({ title: "How Orchestra Noir turned classical music", teaser: null }, ["orchestra", "noir"])).toBe(true);
    expect(matchesKeywords({ title: "Orchestra news", teaser: "A Noir story" }, ["orchestra", "noir"])).toBe(true);
    expect(matchesKeywords({ title: "Orchestra news", teaser: null }, ["orchestra", "noir"])).toBe(false);
    expect(matchesKeywords({ title: "Beyoncé live", teaser: null }, ["beyonce"])).toBe(true);
  });
});

describe("toCard: NPR copies open on HYFIN's /npr page", () => {
  it("links an NPR copy to /npr/<id> and labels it NPR", () => {
    const card = toCard({ id: 9, title: "T", slug: "npr-g-s1-1", category: "culture", tags: [], show: null, byline: null, publishedAt: "2026-11-20", excerpt: null, heroImage: null, source: "npr", cds: { documentId: "g-s1-1", imageUrl: null } } as never);
    expect(card).toMatchObject({ href: "/npr/g-s1-1", label: "NPR", imageUrl: "/npr/npr-network-logo-white.svg", imageAlt: "NPR" });
  });
  it("leaves other posts as they were", () => {
    expect(toCard({ id: 9, title: "T", slug: "s", category: "music", tags: [], show: null, byline: null, publishedAt: "2026-11-20", excerpt: null, heroImage: null, source: "cds", cds: { imageUrl: null } } as never).href).toBe("/music/s");
  });
});
