/**
 * Which CDS stories are HYFIN's, and where the site files them (decision 001; Tarik, 2026-11-18).
 * Pure constants: imported by both the sync and tests.
 */
import type { Category } from "@/lib/taxonomy";

/** Radio Milwaukee (88Nine and HYFIN share it); too broad alone, so always paired with the collections below. */
export const HYFIN_OWNER = "https://organization.api.npr.org/v4/services/s921";

const HYFIN_TAG = "g-s921-16131";

type ShowMapping = { category: Category; showSlug: string; showName: string };

/** HYFIN series. DJ Takeover (g-s921-1281) is not HYFIN; it syncs only if an editor tags a story HYFIN. */
export const SERIES_MAP: Readonly<Record<string, ShowMapping>> = {
  "g-s921-13049": { category: "music", showSlug: "ladies-first", showName: "Ladies First" }, // also a podcast
  "g-s921-8151": { category: "music", showSlug: "in-the-mix", showName: "In The Mix" },
  "g-s921-3487": { category: "music", showSlug: "la-alternativa", showName: "La Alternativa" },
};

export const SCOPE_COLLECTION_IDS: readonly string[] = [HYFIN_TAG, ...Object.keys(SERIES_MAP)];

/** CDS holds copies of WordPress posts as `hyfin-<wpId>`; those are already imported from WordPress. */
export const isWordPressCopy = (id: string): boolean => id.startsWith("hyfin-");

/** A series beats the bare HYFIN tag; tag-only stories return null and go to Jev. */
export const mapByCollections = (collectionIds: string[]): ShowMapping | null =>
  collectionIds.map((id) => (Object.hasOwn(SERIES_MAP, id) ? SERIES_MAP[id] : null)).find(Boolean) ?? null;

/**
 * Biography documents stories still link to but CDS no longer serves (404), so the name can't be fetched.
 * g-s921-3488: La Alternativa's author, per the radiomilwaukee.org story pages (Tarik, 2026-11-19).
 */
export const KNOWN_BIOGRAPHIES: Readonly<Record<string, string>> = { "g-s921-3488": "Paula Lovo" };
