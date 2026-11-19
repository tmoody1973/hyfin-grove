import { JSDOM } from "jsdom";
import { isCategory, tagDescription, type Category } from "../taxonomy";
import type { PostDraft } from "../wordpress/types";
import type { JevQuestion, JevResponse } from "./jev";

import { CATEGORY_REVIEW_THRESHOLD } from "./thresholds";
export { CATEGORY_REVIEW_THRESHOLD };
/** A tag needs at least this probability, and only the strongest MAX_TAGS are kept (first import gave ~3.4 tags/post). */
export const TAG_THRESHOLD = 0.7;
export const MAX_TAGS = 2;
/** Tag questions are namespaced so a tag can never be named like the "category" question. */
const tagKey = (slug: string) => `tag:${slug}`;
const BODY_CHARS = 6000;

export type SortResult = { category: Category; categoryConfidence: number; tagSlugs: string[]; needsReview: boolean };

const CATEGORY_CRITERIA: Record<Category, string> = {
  music: "Mainly about music: artists, songs, albums, releases, concerts, the music industry, music history.",
  culture: "Mainly about Black culture beyond music, nationally or globally: film, TV, books, fashion, food, tech, business, politics, history, identity.",
  milwaukee: "Mainly about Milwaukee or Wisconsin: local people, places, businesses, events, civic life, local news.",
};

export function sortStateFor(draft: Pick<PostDraft, "title" | "excerpt" | "bodyHtml">): string {
  const body = JSDOM.fragment(`<div>${draft.bodyHtml}</div>`).textContent?.replace(/\s+/g, " ").trim() ?? "";
  return `Title: ${draft.title}\nSummary: ${draft.excerpt}\nArticle: ${body.slice(0, BODY_CHARS)}`;
}

export function buildSortQuestions(tags: ReadonlyArray<{ slug: string; name: string }>): Record<string, JevQuestion> {
  return {
    category: {
      type: "choice",
      instructions: "Which section of HYFIN's website, a Black music and culture station in Milwaukee, should this article live in?",
      criteria: CATEGORY_CRITERIA,
    },
    ...Object.fromEntries(
      tags.map((t) => [
        tagKey(t.slug),
        {
          type: "noul",
          instructions: { topic: tagDescription(t.slug) || t.name, question: "Is this topic one of the main subjects of the article, not just a passing mention?" },
          criteria: { true: "A main subject the article spends real time on", false: "Absent, or only mentioned in passing" },
        },
      ]),
    ),
  };
}

/** Choice confidence per docs: (n × top probability − 1) / (n − 1). Used only if Jev omits it. */
const confidenceFrom = (p: Record<string, number>) => {
  const values = Object.values(p);
  const n = values.length;
  return n > 1 ? (n * Math.max(...values) - 1) / (n - 1) : 1;
};

export function interpretSort(response: JevResponse, tagSlugs: string[]): SortResult {
  const answer = response.answers.category;
  const choice = answer?.choice ?? "";
  if (!isCategory(choice)) throw new Error(`Jev returned an unknown category: "${choice}"`);
  const categoryConfidence = answer.confidence ?? confidenceFrom(answer.probabilities ?? { [choice]: 1 });
  return {
    category: choice,
    categoryConfidence,
    tagSlugs: tagSlugs
      .map((slug) => ({ slug, p: response.answers[tagKey(slug)]?.noul ?? 0 }))
      .filter((t) => t.p >= TAG_THRESHOLD)
      .sort((a, b) => b.p - a.p)
      .slice(0, MAX_TAGS)
      .map((t) => t.slug),
    needsReview: categoryConfidence < CATEGORY_REVIEW_THRESHOLD,
  };
}

/** Plain rule, no AI: the first show whose WordPress categories overlap the post's. */
export function showSlugForWpCategories(
  wpCategoryIds: number[],
  shows: ReadonlyArray<{ slug: string; wpCategoryIds: number[] }>,
): string | null {
  return shows.find((s) => s.wpCategoryIds.some((id) => wpCategoryIds.includes(id)))?.slug ?? null;
}
