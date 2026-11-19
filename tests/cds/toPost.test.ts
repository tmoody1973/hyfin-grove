import { describe, expect, it } from "vitest";
import fixture from "../fixtures/cds/qing-madi.json";
import { sanitizeHtml, toPostData, type CdsDocument } from "@/lib/cds/toPost";

const doc = fixture as unknown as CdsDocument;

describe("toPostData", () => {
  const post = toPostData(doc);
  it("carries the story's identity and dates", () => {
    expect(post.cdsId).toBe("g-s921-17816");
    expect(post.title).toBe("Ladies First: Qing Madi");
    expect(post.publishedAt).toBe(doc.publishDateTime);
    expect(post.editorialLastModified).toBe("2026-10-30T08:54:17.703-05:00");
  });
  it("keeps audio as a Dovetail link with its length", () => {
    expect(post.audio?.durationSeconds).toBe(909);
    expect(post.audio?.url.startsWith("https://dovetail.prxu.org/")).toBe(true);
  });
  it("keeps the canonical page for attribution and the series memberships", () => {
    expect(post.canonicalUrl?.startsWith("https://radiomilwaukee.org/show/ladies-first/")).toBe(true);
    expect(post.collectionIds).toContain("g-s921-13049");
    expect(post.premium).toBe(false);
  });
  it("has a hero image and a body without that hero repeated", () => {
    expect(post.imageUrl).toMatch(/^https:\/\/npr\.brightspotcdn\.com\//);
    expect(post.cdsBody.length).toBeGreaterThan(0);
    expect(post.cdsBody.some((b) => b.kind === "image" && b.src === post.imageUrl)).toBe(false);
  });
  it("uses a resolved byline name when one is given", () => {
    const withByline = { ...doc, bylines: [{ href: "#/assets/b1" }], assets: { ...doc.assets, b1: { id: "b1", bylineDocuments: [{ href: "/v1/documents/1192772937" }] } } } as CdsDocument;
    expect(toPostData(withByline, new Map([["1192772937", "Element Everest-Blanks"]])).byline).toBe("Element Everest-Blanks");
    expect(post.byline).toBeNull();
  });
  it("flags premium stories", () => {
    const premium = { ...doc, profiles: [...(doc.profiles ?? []), { href: "/v1/profiles/has-premium-audio" }] } as CdsDocument;
    expect(toPostData(premium).premium).toBe(true);
  });
});

describe("sanitizeHtml", () => {
  it("removes scripts, styles, event handlers and javascript: links", () => {
    const out = sanitizeHtml(`<p onclick="x()" class="a">a</p><script>bad()</script><style>p{}</style><a href="javascript:x">l</a><img src=x onerror=alert(1)>`);
    expect(out).not.toMatch(/onclick|onerror|<script|<style|javascript:/i);
    expect(out).toContain(`<p class="a">a</p>`);
  });
});
