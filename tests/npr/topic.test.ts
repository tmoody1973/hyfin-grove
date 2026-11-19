import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { getNprTopic, toNprItems } from "@/lib/npr/topic";
import { FromNpr } from "@/components/stories/FromNpr";

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

describe("FromNpr", () => {
  it("renders nothing without stories", () => {
    expect(renderToStaticMarkup(createElement("i", null, FromNpr({ items: [], topic: "Race" })))).toBe("<i></i>");
  });
  it("credits NPR and links each story to npr.org", () => {
    const html = renderToStaticMarkup(FromNpr({ items: toNprItems(response.resources as never), topic: "Race" })!);
    expect(html).toContain("From NPR");
    expect(html).toContain('href="https://www.npr.org/2026/11/13/a/story-a"');
    expect(html).toContain("NPR");
    expect(html).not.toContain("evil.example");
  });
});
