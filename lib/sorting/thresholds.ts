/**
 * Sorting thresholds, kept dependency-free: collections/Posts (part of the live server bundle) imports
 * them via reviewRules, and must never pull in jsdom, which only the importer uses.
 */
/** Below this Jev confidence (its own certainty statistic, 0–1) a post goes to Tarik's review. */
export const CATEGORY_REVIEW_THRESHOLD = 0.7;
