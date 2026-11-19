import { describe, expect, it } from "vitest";
import { buildSortQuestions, interpretSort, MAX_TAGS, TAG_THRESHOLD } from "@/lib/sorting/sortPost";
import { SEED_TAGS, tagDescription } from "@/lib/taxonomy";

const usage = { input_tokens: 0, output_tokens: 0 };
const answer = (tags: Record<string, number>) => ({
  model: "x", usage,
  answers: { category: { choice: "music", confidence: 0.9 }, ...Object.fromEntries(Object.entries(tags).map(([k, v]) => [`tag:${k}`, { noul: v }])) },
});

describe("tag definitions", () => {
  it("every seed tag has a definition, and Arts/Entertainment exclude music", () => {
    for (const t of SEED_TAGS) expect(tagDescription(t.slug), t.slug).toBeTruthy();
    expect(tagDescription("arts")).toMatch(/not music/i);
    expect(tagDescription("entertainment")).toMatch(/not music/i);
  });
  it("the tag question carries the definition, not just the name", () => {
    const q = buildSortQuestions([{ slug: "arts", name: "Arts" }]) as Record<string, { instructions: { topic: string } }>;
    expect(q["tag:arts"].instructions.topic).toContain(tagDescription("arts"));
  });
});

describe("tag selection", () => {
  it("needs at least 70% and keeps only the 2 strongest", () => {
    expect(TAG_THRESHOLD).toBe(0.7);
    expect(MAX_TAGS).toBe(2);
    const r = interpretSort(answer({ arts: 0.95, business: 0.9, industry: 0.8, food: 0.6 }), ["arts", "business", "industry", "food"]);
    expect(r.tagSlugs).toEqual(["arts", "business"]);
  });
  it("allows zero tags when nothing is strong enough", () => {
    expect(interpretSort(answer({ arts: 0.65 }), ["arts"]).tagSlugs).toEqual([]);
  });
});
