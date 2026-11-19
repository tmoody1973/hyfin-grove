/** Pure rules for the import, kept apart from Payload so they can be unit tested. */

type ExistingPost = {
  category: string;
  tags?: unknown;
  show?: unknown;
  sorting?: { reviewedAt?: string | null; [key: string]: unknown } | null;
} | null;

/**
 * Once Tarik has reviewed a post, a rerun of the import must not undo it: return the fields to keep
 * (category, tags, show, sorting) and skip Jev. Null when there is nothing to protect.
 */
export function reviewedFieldsToKeep(existing: ExistingPost) {
  if (!existing?.sorting?.reviewedAt) return null;
  return { category: existing.category, tags: existing.tags, show: existing.show, sorting: existing.sorting };
}

/** Strip the body's copy of the featured image only when the hero itself uploaded; otherwise keep it. */
export const heroUrlToStrip = (heroSourceUrl: string | undefined, heroId: number | null): string | null =>
  heroSourceUrl && heroId !== null ? heroSourceUrl : null;
