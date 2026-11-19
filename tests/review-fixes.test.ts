/** Tests for the final-review findings on plan 1 (one describe per finding). */
import { describe, expect, it } from "vitest";
import fixture from "./fixtures/wp-post-sza.json";
import type { WpPost } from "@/lib/wordpress/types";
import { imagesIn, toPostDraft } from "@/lib/wordpress/transform";
import { fetchMedia } from "@/lib/wordpress/client";
import { normalizeSlug, parseLegacyPath } from "@/lib/legacy";
import { askJev } from "@/lib/sorting/jev";
import { reviewedFieldsToKeep } from "@/lib/wordpress/importPost.pure";
import { isRealPlayFailure, needsSrcReset } from "@/components/player/playerState";

const post = fixture[0] as unknown as WpPost;
const hang = ((_: string, init?: RequestInit) =>
  new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(init.signal!.reason)))) as unknown as typeof fetch;

describe("1. URL-encoded WordPress slugs", () => {
  const encoded = "wu%e2%80%91tang-clan-returns-to-gaming-after-25-years";
  it("store and look up the same decoded slug", () => {
    const d = toPostDraft({ ...post, slug: encoded });
    const parsed = parseLegacyPath({ year: "2025", month: "06", day: "11", slug: encoded });
    expect(d.legacy.wpSlug).toBe("wu‑tang-clan-returns-to-gaming-after-25-years");
    expect(parsed?.wpSlug).toBe(d.legacy.wpSlug);
    expect(d.slug).toBe(d.legacy.wpSlug);
  });
  it("normalizeSlug accepts already-decoded or encoded params alike", () => {
    expect(normalizeSlug("wu%e2%80%91tang")).toBe("wu‑tang");
    expect(normalizeSlug("wu‑tang")).toBe("wu‑tang");
    expect(normalizeSlug("%E0%A4%A")).toBeNull();
  });
});

describe("2. publish dates are UTC", () => {
  it("uses date_gmt with an explicit Z, not the site's local time", () => {
    const d = toPostDraft(post);
    expect(d.publishedAt).toBe("2024-04-07T21:34:27Z");
    expect(d.legacy.wpDate).toBe("2024-04-07T21:34:27Z");
  });
});

describe("3. a rerun keeps Tarik's review", () => {
  it("keeps category, tags, show and sorting once a post was reviewed", () => {
    const existing = { category: "milwaukee", tags: [4], show: 2, sorting: { reviewedAt: "2026-11-20T10:00:00Z", needsReview: false, categoryConfidence: 0.33 } };
    expect(reviewedFieldsToKeep(existing)).toEqual({ category: "milwaukee", tags: [4], show: 2, sorting: existing.sorting });
  });
  it("keeps nothing for an unreviewed or new post", () => {
    expect(reviewedFieldsToKeep({ category: "culture", tags: [], show: null, sorting: { reviewedAt: null } })).toBeNull();
    expect(reviewedFieldsToKeep(null)).toBeNull();
  });
});

describe("4. requests time out instead of hanging", () => {
  it("askJev gives up after its timeout", async () => {
    await expect(askJev("s", {}, "k", hang, 20)).rejects.toThrow(/timed out|abort/i);
  });
  it("fetchMedia gives up after its timeout", async () => {
    await expect(fetchMedia(1, hang, 20)).rejects.toThrow(/timed out|abort/i);
  });
});

describe("5. a cancelled play() is not an error", () => {
  it("ignores AbortError (pause or source switch while buffering)", () => {
    expect(isRealPlayFailure(new DOMException("interrupted", "AbortError"))).toBe(false);
    expect(isRealPlayFailure(new DOMException("no source", "NotSupportedError"))).toBe(true);
    expect(isRealPlayFailure(new Error("x"))).toBe(true);
  });
});

describe("6. inline images keep their alt text", () => {
  it("returns each image's original URL with its alt", () => {
    expect(imagesIn('<img src="https://hyfin.org/a-300x200.jpg" data-orig-file="https://hyfin.org/a.jpg" alt="DJ at the board">')).toEqual([
      { url: "https://hyfin.org/a.jpg", alt: "DJ at the board" },
    ]);
  });
});

describe("7. a featured image we can't read doesn't sink the post", () => {
  it("fetchMedia returns null on 401/403, like 404", async () => {
    const status = (s: number) => (async () => new Response("no", { status: s })) as unknown as typeof fetch;
    expect(await fetchMedia(1, status(401))).toBeNull();
    expect(await fetchMedia(1, status(403))).toBeNull();
  });
});

describe("8. retrying a failed story reloads it", () => {
  it("resets the source after an error, for live, or for a new URL", () => {
    expect(needsSrcReset({ kind: "story", currentSrc: "u", url: "u", hasError: true })).toBe(true);
    expect(needsSrcReset({ kind: "story", currentSrc: "u", url: "u", hasError: false })).toBe(false);
    expect(needsSrcReset({ kind: "story", currentSrc: "a", url: "b", hasError: false })).toBe(true);
    expect(needsSrcReset({ kind: "live", currentSrc: "u", url: "u", hasError: false })).toBe(true);
  });
});

describe("9. images that failed to upload are dropped, not left to break the body", () => {
  it("removes an img (and its figure) that has no uploaded Media doc", async () => {
    const { prepareBodyHtml } = await import("@/lib/wordpress/transform");
    const html = '<p>a</p><figure><img src="https://hyfin.org/gone.jpg"><figcaption>c</figcaption></figure><figure><img src="https://hyfin.org/ok.jpg"></figure>';
    const out = prepareBodyHtml(html, new Map([["https://hyfin.org/ok.jpg", 3]]));
    expect(out).not.toContain("gone.jpg");
    expect(out).toContain('data-lexical-upload-id="3"');
    expect(out).toContain("<p>a</p>");
  });
});

describe("10. links Payload would reject", () => {
  it("keep their words but lose the link when the address isn't real", async () => {
    const { prepareBodyHtml } = await import("@/lib/wordpress/transform");
    const html = '<p><a href="http://This feature follows our previous story">story</a> and <a name="fn1">1</a> and <a href="Giannis: The Marvelous Journey">Giannis</a> and <a href="">x</a></p>';
    const out = prepareBodyHtml(html, new Map());
    expect(out).toBe("<p>story and 1 and Giannis and x</p>");
  });
  it("keeps real links, and makes relative hyfin.org links absolute", async () => {
    const { prepareBodyHtml } = await import("@/lib/wordpress/transform");
    const out = prepareBodyHtml('<p><a href="https://npr.org/x">a</a> <a href="mailto:hi@hyfin.org">b</a> <a href="/2024/04/07/sza/">c</a></p>', new Map());
    expect(out).toContain('href="https://npr.org/x"');
    expect(out).toContain('href="mailto:hi@hyfin.org"');
    expect(out).toContain('href="https://hyfin.org/2024/04/07/sza/"');
  });
});
