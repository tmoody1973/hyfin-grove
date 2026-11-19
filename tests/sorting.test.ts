import { describe, expect, it } from "vitest";
import { askJev, type JevResponse } from "@/lib/sorting/jev";
import { buildSortQuestions, interpretSort, showSlugForWpCategories, sortStateFor } from "@/lib/sorting/sortPost";

const usage = { input_tokens: 0, output_tokens: 0 };
const response = (category: Record<string, unknown>, tags: Record<string, number> = {}): JevResponse => ({
  model: "jev-test",
  usage,
  answers: { category, ...Object.fromEntries(Object.entries(tags).map(([k, v]) => [`tag:${k}`, { type: "noul", noul: v }])) },
});

describe("interpretSort", () => {
  it("takes Jev's category, keeps tags above 0.5, and trusts a confident answer", () => {
    const r = interpretSort(
      response({ type: "choice", choice: "culture", confidence: 0.73, probabilities: { culture: 0.82, music: 0.15, milwaukee: 0.03 } }, { entertainment: 0.9, food: 0.2 }),
      ["entertainment", "food"],
    );
    expect(r).toEqual({ category: "culture", categoryConfidence: 0.73, tagSlugs: ["entertainment"], needsReview: false });
  });

  it("sends an unsure category to review", () => {
    const r = interpretSort(response({ type: "choice", choice: "culture", confidence: 0.33, probabilities: { culture: 0.55, music: 0.4, milwaukee: 0.05 } }), []);
    expect(r.needsReview).toBe(true);
  });

  it("works out confidence from the probabilities when Jev leaves it out", () => {
    const r = interpretSort(response({ type: "choice", choice: "music", probabilities: { music: 0.9, culture: 0.05, milwaukee: 0.05 } }), []);
    expect(r.categoryConfidence).toBeCloseTo(0.85, 5);
  });

  it("never guesses: an unknown or missing category throws", () => {
    expect(() => interpretSort(response({ type: "choice", choice: "news" }), [])).toThrow(/unknown category/);
    expect(() => interpretSort({ model: "x", usage, answers: {} }, [])).toThrow(/unknown category/);
  });
});

describe("askJev", () => {
  it("fails loudly when TypeSafe returns an error", async () => {
    const failing = (async () => new Response("nope", { status: 500 })) as unknown as typeof fetch;
    await expect(askJev("state", {}, "key", failing)).rejects.toThrow(/HTTP 500/);
  });

  it("sends state, model and questions with the API key", async () => {
    let sent: { url: string; init: RequestInit } | null = null;
    const fake = (async (url: string, init: RequestInit) => {
      sent = { url, init };
      return Response.json({ model: "jev", answers: {}, usage });
    }) as unknown as typeof fetch;
    await askJev("hello", { q: { type: "noul" } }, "k1", fake);
    expect(sent!.url).toBe("https://api.typesafe.ai/v1/systemone");
    expect((sent!.init.headers as Record<string, string>).Authorization).toBe("Bearer k1");
    expect(JSON.parse(String(sent!.init.body))).toEqual({ state: "hello", model: "jev-latest", questions: { q: { type: "noul" } } });
  });
});

describe("questions and state", () => {
  it("asks one category choice over exactly the three categories, plus one yes/no per tag", () => {
    const q = buildSortQuestions([{ slug: "food", name: "Food" }]) as Record<string, { type: string; criteria: Record<string, unknown> }>;
    expect(q.category.type).toBe("choice");
    expect(Object.keys(q.category.criteria)).toEqual(["music", "culture", "milwaukee"]);
    expect(q["tag:food"].type).toBe("noul");
  });

  it("caps the body so long posts don't blow the request", () => {
    const s = sortStateFor({ title: "T", excerpt: "E", bodyHtml: `<p>${"word ".repeat(5000)}</p>` });
    expect(s.startsWith("Title: T")).toBe(true);
    expect(s.length).toBeLessThan(6200);
  });
});

describe("showSlugForWpCategories", () => {
  it("maps WordPress categories to a show by plain rule", () => {
    const shows = [{ slug: "hyfin-verified", wpCategoryIds: [136] }];
    expect(showSlugForWpCategories([12, 136], shows)).toBe("hyfin-verified");
    expect(showSlugForWpCategories([12], shows)).toBeNull();
  });
});
