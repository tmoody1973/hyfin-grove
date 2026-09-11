import "server-only";
import { cache } from "react";

const CDS_BASE = "https://content.api.npr.org/v1/documents";
const REVALIDATE_SECONDS = 300;
const SERIES_NAME = "Ladies First";
const TITLE_PREFIX = new RegExp(`^${SERIES_NAME}:\\s*`, "i");

export type BodyBlock =
  | { kind: "html"; id: string; html: string }
  | { kind: "image"; id: string; src: string; width: number; height: number; caption: string | null; credit: string | null };

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

type Link = { href: string; rels?: string[] };
type Enclosure = Link & { type?: string; width?: number; height?: number };
type Asset = {
  id: string;
  profiles?: Link[];
  text?: string;
  title?: string;
  caption?: string | null;
  provider?: string | null;
  producer?: string | null;
  duration?: number;
  enclosures?: Enclosure[];
};
type CdsDocument = {
  id: string;
  title: string;
  shortTitle: string;
  teaser?: string | null;
  publishDateTime: string;
  audio?: Link[];
  images?: Link[];
  layout?: Link[];
  webPages?: Link[];
  assets?: Record<string, Asset>;
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

const assetKey = (href: string) => href.replace("#/assets/", "");
const hasProfile = (asset: Asset, name: string) =>
  asset.profiles?.some((p) => p.href === `/v1/profiles/${name}`) ?? false;
const pickEnclosure = (asset: Asset | undefined, rel: string): Enclosure | undefined =>
  asset?.enclosures?.find((e) => e.rels?.includes(rel)) ?? asset?.enclosures?.[0];
const pickCrop = (asset: Asset | undefined, rel: string) => pickEnclosure(asset, rel)?.href ?? null;

function toBody(doc: CdsDocument, skipAssetId: string | undefined): BodyBlock[] {
  const assets = doc.assets ?? {};
  return (doc.layout ?? []).flatMap((link): BodyBlock[] => {
    const asset = assets[assetKey(link.href)];
    if (!asset || asset.id === skipAssetId) return []; // hero image already shown above the body
    if (hasProfile(asset, "text") && asset.text) return [{ kind: "html", id: asset.id, html: asset.text }];
    if (hasProfile(asset, "image")) {
      const enc = pickEnclosure(asset, "image-wide");
      if (!enc) return [];
      return [{
        kind: "image", id: asset.id, src: enc.href,
        width: enc.width ?? 1440, height: enc.height ?? 810,
        caption: asset.caption ?? null, credit: asset.provider ?? asset.producer ?? null,
      }];
    }
    return [];
  });
}

function toStory(doc: CdsDocument): Story {
  const assets = doc.assets ?? {};
  const audio = doc.audio?.[0] ? assets[assetKey(doc.audio[0].href)] : undefined;
  const primaryImageLink = doc.images?.find((l) => l.rels?.includes("primary")) ?? doc.images?.[0];
  const image = primaryImageLink ? assets[assetKey(primaryImageLink.href)] : undefined;
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

export const getStory = cache(async (id: string): Promise<Story | null> => {
  if (!/^[\w-]+$/.test(id)) return null;
  const docs = await cdsFetch(`?ids=${encodeURIComponent(id)}`);
  return docs[0] ? toStory(docs[0]) : null;
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
