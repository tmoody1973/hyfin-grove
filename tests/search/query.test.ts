import { describe, expect, it } from "vitest";
import { normalizeQuery, renderSnippet, HL_START, HL_END } from "@/lib/search/query";

describe("normalizeQuery: what's worth searching (plan 12, Review Focus 1, 4, 5)", () => {
  it("trims, collapses spaces, caps at 100 characters", () => {
    expect(normalizeQuery("  tems   live  ")).toBe("tems live");
    expect(normalizeQuery("x".repeat(250))?.length).toBe(100);
  });
  it("Postgres-special characters pass through as text (websearch_to_tsquery never throws on them)", () => {
    expect(normalizeQuery("rock & roll: the 'best'! :*")).toBe("rock & roll: the 'best'! :*");
  });
  it("empty, one letter, only stopwords, or not text: nothing to search", () => {
    for (const q of ["", " ", "a", "the", "the and of", "&&", null, undefined, 42, ["tems"]]) expect(normalizeQuery(q as never)).toBeNull();
  });
  it("accents and case are left to the database (it folds both)", () => {
    expect(normalizeQuery("BEYONCÉ")).toBe("BEYONCÉ");
  });
});

describe("renderSnippet: highlighted, and nothing else from the text becomes HTML", () => {
  it("turns the database's markers into <mark> and escapes everything else", () => {
    expect(renderSnippet(`<script>alert(1)</script> ${HL_START}Tems${HL_END} & friends "live"`)).toBe("&lt;script&gt;alert(1)&lt;/script&gt; <mark>Tems</mark> &amp; friends &quot;live&quot;");
  });
  it("an unmatched marker can't leave an open tag", () => {
    expect(renderSnippet(`${HL_START}Tems`)).toBe("Tems");
    expect(renderSnippet(null)).toBe("");
  });
});

describe("queryLogCutoff: search words are kept 90 days", async () => {
  const { queryLogCutoff } = await import("@/lib/search/log");
  it("is 90 days before now", () => {
    expect(queryLogCutoff(Date.parse("2026-11-20T00:00:00Z"))).toBe("2026-08-22T00:00:00.000Z");
  });
});

describe("websiteJsonLd: lets Google show a HYFIN search box", async () => {
  const { websiteJsonLd } = await import("@/lib/home");
  it("declares a SearchAction pointing at /search", () => {
    const data = JSON.parse(websiteJsonLd("https://hyfin.org"));
    expect(data).toMatchObject({ "@type": "WebSite", url: "https://hyfin.org", potentialAction: { "@type": "SearchAction", target: { urlTemplate: "https://hyfin.org/search?q={search_term_string}" }, "query-input": "required name=search_term_string" } });
  });
});
