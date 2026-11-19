import { describe, expect, it } from "vitest";
import { getNprTopic, toNprItems } from "@/lib/npr/topic";

// Made-up stories: NPR's terms say display only, don't store, and this repo is public.
const doc = (id: string, canonical: string | null, over: Record<string, unknown> = {}) => ({
  id,
  title: `Story ${id} & "more"`,
  teaser: `Teaser ${id}`,
  publishDateTime: "2026-11-13T10:00:00Z",
  webPages: canonical ? [{ href: canonical, rels: ["canonical"] }] : [],
  ...over,
});
const response = { resources: [doc("a", "https://www.npr.org/2026/11/13/a/story-a"), doc("b", null), doc("c", "https://evil.example/c"), doc("d", "https://www.npr.org/2026/11/12/d/story-d")] };
const okFetch = (async () => new Response(JSON.stringify(response), { status: 200 })) as unknown as typeof fetch;

describe("toNprItems", () => {
  it("keeps stories that link to npr.org and drops the rest", () => {
    const items = toNprItems(response.resources as never);
    expect(items.map((i) => i.id)).toEqual(["a", "d"]);
    expect(items[0]).toMatchObject({ title: 'Story a & "more"', url: "https://www.npr.org/2026/11/13/a/story-a", teaser: "Teaser a", publishedAt: "2026-11-13T10:00:00Z" });
  });
});

describe("getNprTopic", () => {
  it("reads the topic and caps the count", async () => {
    expect((await getNprTopic("1015", 1, okFetch, "token")).map((i) => i.id)).toEqual(["a"]);
  });
  it("returns [] when CDS fails, times out or there is no token", async () => {
    const fail = (async () => new Response("no", { status: 503 })) as unknown as typeof fetch;
    const boom = (async () => { throw new Error("timeout"); }) as unknown as typeof fetch;
    expect(await getNprTopic("1015", 4, fail, "token")).toEqual([]);
    expect(await getNprTopic("1015", 4, boom, "token")).toEqual([]);
    expect(await getNprTopic("1015", 4, okFetch, undefined)).toEqual([]);
  });
});


describe("mixing NPR stories into story lists", async () => {
  const { mergeByDate } = await import("@/lib/stories");
  const { nprCard } = await import("@/lib/npr/topic");
  const card = (id: number, publishedAt: string | null) => ({ id, title: `t${id}`, href: `/culture/${id}`, excerpt: null, byline: null, publishedAt, imageUrl: null, imageAlt: "", label: null });

  it("sorts everything newest first and can cap the count", () => {
    const ours = [card(1, "2025-10-30T00:00:00Z"), card(2, "2025-10-01T00:00:00Z")];
    const npr = [card(-1, "2026-11-13T00:00:00Z"), card(-2, "2025-10-15T00:00:00Z")];
    expect(mergeByDate(ours, npr).map((c) => c.id)).toEqual([-1, 1, -2, 2]);
    expect(mergeByDate(ours, npr, 3).map((c) => c.id)).toEqual([-1, 1, -2]);
  });
  it("puts undated cards last", () => {
    expect(mergeByDate([card(1, null)], [card(2, "2026-01-01T00:00:00Z")]).map((c) => c.id)).toEqual([2, 1]);
  });
  it("turns an NPR item into a card labelled NPR that opens on HYFIN, with a key that can't clash with post ids", () => {
    const [item] = toNprItems(response.resources as never);
    const c = nprCard(item, 0);
    expect(c).toMatchObject({ label: "NPR", href: "/npr/a", title: 'Story a & "more"' });
    expect(c.id).toBeLessThan(0);
  });
});

describe("getNprStory (an NPR story shown on HYFIN, never stored)", async () => {
  const { getNprStory } = await import("@/lib/npr/topic");
  const S1 = "https://organization.api.npr.org/v4/services/s1";
  const story = (over: Record<string, unknown> = {}) => ({
    ...doc("nx-s1-1", "https://www.npr.org/2026/11/13/nx-s1-1/story"),
    owners: [{ href: S1 }],
    layout: [{ href: "#/assets/p1" }],
    assets: { p1: { id: "p1", profiles: [{ href: "/v1/profiles/text" }], text: "<p>Body text</p><script>x</script>" } },
    ...over,
  });
  const answer = (resource: unknown) => (async () => new Response(JSON.stringify({ resources: resource ? [resource] : [] }), { status: 200 })) as unknown as typeof fetch;

  it("returns the story with sanitized body and its npr.org address", async () => {
    const s = await getNprStory("nx-s1-1", answer(story()), "token");
    expect(s).toMatchObject({ id: "nx-s1-1", canonicalUrl: "https://www.npr.org/2026/11/13/nx-s1-1/story", title: 'Story nx-s1-1 & "more"' });
    expect(JSON.stringify(s?.body)).toContain("Body text");
    expect(JSON.stringify(s?.body)).not.toContain("<script");
  });
  it("refuses other stations' stories, premium audio, missing npr.org links and malformed ids", async () => {
    expect(await getNprStory("nx-s1-1", answer(story({ owners: [{ href: "https://organization.api.npr.org/v4/services/s921" }] })), "token")).toBeNull();
    expect(await getNprStory("nx-s1-1", answer(story({ profiles: [{ href: "/v1/profiles/has-premium-audio" }] })), "token")).toBeNull();
    expect(await getNprStory("nx-s1-1", answer(story({ webPages: [] })), "token")).toBeNull();
    expect(await getNprStory("../etc", answer(story()), "token")).toBeNull();
    expect(await getNprStory("nx-s1-1", answer(null), "token")).toBeNull();
  });
  it("is null when CDS fails", async () => {
    const boom = (async () => { throw new Error("down"); }) as unknown as typeof fetch;
    expect(await getNprStory("nx-s1-1", boom, "token")).toBeNull();
  });
});
