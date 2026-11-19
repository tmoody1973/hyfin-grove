/** Tests for the CodeRabbit findings on PR #2 that were judged real. */
import { describe, expect, it } from "vitest";
import fixture from "./fixtures/wp-post-sza.json";
import type { WpPost } from "@/lib/wordpress/types";
import { toPostDraft } from "@/lib/wordpress/transform";
import { fetchAllPosts } from "@/lib/wordpress/client";
import { canonicalSlug, parseLegacyPath, routeSlug } from "@/lib/legacy";
import { internalLinkHref } from "@/lib/postPath";
import { Posts } from "@/collections/Posts";
import { playerReducer } from "@/components/player/playerState";
import { buildSortQuestions, interpretSort } from "@/lib/sorting/sortPost";
import { heroUrlToStrip } from "@/lib/wordpress/importPost.pure";

const post = fixture[0] as unknown as WpPost;

describe("CR1 links between stories", () => {
  it("point at the linked post's address", () => {
    expect(internalLinkHref({ relationTo: "posts", value: { category: "culture", slug: "abc" } })).toBe("/culture/abc");
  });
  it("fall back to # when the linked doc wasn't loaded", () => {
    expect(internalLinkHref({ relationTo: "posts", value: 12 })).toBe("#");
  });
});

describe("CR2 slugs typed in the admin", () => {
  it("are saved in canonical form", () => {
    expect(canonicalSlug("  SZA-Lyrics ")).toBe("sza-lyrics");
    expect(canonicalSlug("wu‑tang")).toBe("wu‑tang");
    const field = Posts.fields.find((f) => "name" in f && f.name === "slug") as { hooks?: { beforeValidate?: Array<(a: { value: unknown }) => unknown> } };
    expect(field.hooks?.beforeValidate?.[0]({ value: "SZA" })).toBe("sza");
  });
});

describe("CR4 a late 'playing' event after pause", () => {
  it("does not flip a paused player back to playing", () => {
    const paused = { source: { kind: "live" as const }, status: "paused" as const, error: null };
    expect(playerReducer(paused, { type: "started" }).status).toBe("paused");
  });
});

describe("CR6 route slugs with a literal %", () => {
  it("are taken as-is when they can't be decoded again", () => {
    expect(routeSlug("100%-live")).toBe("100%-live");
    expect(routeSlug("wu%e2%80%91tang")).toBe("wu‑tang");
    expect(parseLegacyPath({ year: "2024", month: "04", day: "07", slug: "100%-live" })).toEqual({ wpSlug: "100%-live" });
  });
});

describe("CR7 a tag named 'category'", () => {
  it("can't overwrite the category question", () => {
    const q = buildSortQuestions([{ slug: "category", name: "Category" }]) as Record<string, { type: string }>;
    expect(q.category.type).toBe("choice");
    expect(q["tag:category"].type).toBe("noul");
    const r = interpretSort({ model: "x", usage: { input_tokens: 0, output_tokens: 0 }, answers: { category: { choice: "music", confidence: 0.9 }, "tag:category": { noul: 0.8 } } }, ["category"]);
    expect(r.tagSlugs).toEqual(["category"]);
  });
});

describe("CR8 a WordPress page that won't load", () => {
  it("stops the walk with an error instead of returning partial totals", async () => {
    let call = 0;
    const fake = (async () => {
      call++;
      return call === 1 ? new Response("[]", { headers: { "x-wp-totalpages": "2" } }) : new Response("no", { status: 403 });
    }) as unknown as typeof fetch;
    await expect((async () => { for await (const _ of fetchAllPosts(fake)) void _; })()).rejects.toThrow(/page 2/);
  });
});

describe("CR9 body copy of the hero", () => {
  it("is only stripped when the hero actually uploaded", () => {
    expect(heroUrlToStrip("https://hyfin.org/a.jpg", null)).toBeNull();
    expect(heroUrlToStrip("https://hyfin.org/a.jpg", 5)).toBe("https://hyfin.org/a.jpg");
    expect(heroUrlToStrip(undefined, 5)).toBeNull();
  });
});

describe("CR11 a post with no UTC date", () => {
  it("fails loudly instead of storing 'nullZ'", () => {
    expect(() => toPostDraft({ ...post, date_gmt: null })).toThrow(/no UTC publish date/);
  });
});
