import "server-only";
import { cache } from "react";

const CDS_BASE = "https://content.api.npr.org/v1/documents";
const REVALIDATE_SECONDS = 300;
const SERIES_NAME = "Ladies First";
const TITLE_PREFIX = new RegExp(`^${SERIES_NAME}:\\s*`, "i");

import { assetKey, pickCrop, primaryImage, toBody, type BodyBlock, type CdsDocument } from "./cds/toPost";

export type { BodyBlock };

export type Story = {
  id: string;
  title: string;
  shortTitle: string;
  teaser: string | null;
  publishedAt: string;
  durationSeconds: number | null;
  audioUrl: string | null;
  imageWide: string | null;
  imageSquare: string | null;
  imageAlt: string;
  canonicalUrl: string | null;
  body: BodyBlock[];
};
type CdsResponse = { resources: CdsDocument[] };

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}. Add it to .env.local.`);
  return value;
}

async function cdsFetch(query: string): Promise<CdsDocument[]> {
  const res = await fetch(`${CDS_BASE}${query}`, {
    headers: { Authorization: `Bearer ${env("NPR_CDS_TOKEN")}` },
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!res.ok) throw new Error(`CDS request failed: ${res.status} ${res.statusText}`);
  const json = (await res.json()) as CdsResponse;
  return json.resources ?? [];
}

function toStory(doc: CdsDocument): Story {
  const assets = doc.assets ?? {};
  const audio = doc.audio?.[0] ? assets[assetKey(doc.audio[0].href)] : undefined;
  const image = primaryImage(doc);
  return {
    id: doc.id,
    title: doc.title,
    shortTitle: doc.title.replace(TITLE_PREFIX, ""),
    teaser: doc.teaser ?? null,
    publishedAt: doc.publishDateTime,
    durationSeconds: audio?.duration ?? null,
    audioUrl: audio?.enclosures?.find((e) => e.type === "audio/mpeg")?.href ?? audio?.enclosures?.[0]?.href ?? null,
    imageWide: pickCrop(image, "image-wide"),
    imageSquare: pickCrop(image, "image-square"),
    imageAlt: image?.title ?? doc.title,
    canonicalUrl: doc.webPages?.find((w) => w.rels?.includes("canonical"))?.href ?? null,
    body: toBody(doc, image?.id),
  };
}

export const listStories = cache(async (): Promise<Story[]> => {
  const series = env("NPR_LADIES_FIRST_SERIES_ID");
  const docs = await cdsFetch(
    `?collectionIds=${encodeURIComponent(series)}&profileIds=story&sort=publishDateTime:desc&limit=100`,
  );
  return docs.map(toStory);
});

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "long", day: "numeric", year: "numeric", timeZone: "America/Chicago",
});

/** "September 4, 2026 · 23 min" — duration omitted when CDS has none. */
export function metaLine(story: Pick<Story, "publishedAt" | "durationSeconds">): string {
  const parts = [dateFormat.format(new Date(story.publishedAt))];
  if (story.durationSeconds != null) parts.push(`${Math.floor(story.durationSeconds / 60)} min`);
  return parts.join(" · ");
}
