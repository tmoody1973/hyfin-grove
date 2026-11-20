import type { Payload } from "payload";
import type { BodyBlock } from "@/lib/cds/toPost";
import { visible } from "@/lib/postQueries";
import type { Media } from "@/payload-types";
import type { NprStory } from "./topic";

/**
 * HYFIN's stored copy of an NPR story (plan 11), shaped like the live read so /npr/<id> renders either.
 * Withdrawn copies don't count: the page then falls back to a live read, which NPR no longer serves either.
 */
export async function getStoredNprStory(db: Pick<Payload, "find">, id: string): Promise<NprStory | null> {
  const { docs } = await db.find({ collection: "posts", where: visible({ and: [{ source: { equals: "npr" } }, { "cds.documentId": { equals: id } }] }), limit: 1, depth: 1 });
  const p = docs[0];
  if (!p?.cds?.documentId || !p.cds.canonicalUrl) return null;
  const hero = typeof p.heroImage === "object" ? (p.heroImage as Media | null) : null;
  return {
    id: p.cds.documentId,
    title: p.title,
    teaser: p.excerpt ?? null,
    byline: p.byline ?? null,
    publishedAt: p.publishedAt,
    imageUrl: hero?.url ?? p.cds.imageUrl ?? null,
    imageCaption: hero ? (hero.caption ?? null) : (p.cds.imageCaption ?? null),
    imageCredit: hero ? (hero.credit ?? null) : (p.cds.imageCredit ?? null),
    imageAlt: hero ? (hero.alt ?? null) : (p.cds.imageAlt ?? null),
    body: (p.cdsBody ?? []) as BodyBlock[],
    audio: p.audio?.url ? { url: p.audio.url, durationSeconds: p.audio.durationSeconds ?? null } : null,
    canonicalUrl: p.cds.canonicalUrl,
  };
}
