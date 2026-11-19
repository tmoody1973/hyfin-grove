import xss from "xss"; // CommonJS package: default import works under Node ESM, Next and Vitest alike
import { embedFromUrl, type EmbedProvider } from "@/lib/embeds";
import { defaultBylineFor } from "./scope";

/**
 * CDS document → the fields a synced post stores. Pure: no network, no DOM library (jsdom must never
 * reach the live server; see tests/serverBundle.test.ts).
 */

export type BodyBlock =
  | { kind: "html"; id: string; html: string }
  | { kind: "image"; id: string; src: string; width: number; height: number; caption: string | null; credit: string | null }
  | { kind: "embed"; id: string; provider: EmbedProvider; url: string; title: string | null };

type Link = { href: string; rels?: string[] };
type Enclosure = Link & { type?: string; width?: number; height?: number };
export type Asset = {
  id: string;
  profiles?: Link[];
  text?: string;
  /** html-block assets: raw HTML (only an allowlisted iframe player is kept). */
  html?: string;
  title?: string;
  name?: string;
  caption?: string | null;
  provider?: string | null;
  producer?: string | null;
  altText?: string | null;
  /** NPR restricts some photos to authorized organizations; those are never shown. */
  isRestrictedToAuthorizedOrgServiceIds?: boolean;
  duration?: number;
  enclosures?: Enclosure[];
  bylineDocuments?: Link[];
};
export type CdsDocument = {
  id: string;
  title: string;
  teaser?: string | null;
  publishDateTime: string;
  editorialLastModifiedDateTime?: string;
  profiles?: Link[];
  collections?: Link[];
  bylines?: Link[];
  audio?: Link[];
  images?: Link[];
  layout?: Link[];
  webPages?: Link[];
  assets?: Record<string, Asset>;
};

export type CdsPostData = {
  cdsId: string;
  title: string;
  excerpt: string | null;
  publishedAt: string;
  byline: string | null;
  audio: { url: string; durationSeconds: number | null } | null;
  imageUrl: string | null;
  imageCaption: string | null;
  imageCredit: string | null;
  imageAlt: string | null;
  canonicalUrl: string | null;
  editorialLastModified: string;
  cdsBody: BodyBlock[];
  collectionIds: string[];
  premium: boolean;
};

export const assetKey = (href: string) => href.replace("#/assets/", "");
const lastSegment = (href: string) => href.split("/").filter(Boolean).pop() ?? href;
const hasProfile = (profiles: Link[] | undefined, name: string) =>
  profiles?.some((p) => p.href === `/v1/profiles/${name}`) ?? false;
const pickEnclosure = (asset: Asset | undefined, rel: string): Enclosure | undefined =>
  asset?.enclosures?.find((e) => e.rels?.includes(rel)) ?? asset?.enclosures?.[0];
export const pickCrop = (asset: Asset | undefined, rel: string) => pickEnclosure(asset, rel)?.href ?? null;

/**
 * Story HTML is rendered raw on the same origin as the admin, so only an allowlist of tags and attributes
 * survives (js-xss: pure JS, no DOM, so no jsdom in the live server). Links are checked after decoding
 * entities and hidden characters; script/style/iframe and friends are removed with their contents.
 */
const STORY_HTML = {
  // No whiteList given = js-xss's default allowlist (a, p, em, strong, lists, img, figure, headings, tables...).
  stripIgnoreTag: true,
  stripIgnoreTagBody: ["script", "style", "iframe", "object", "embed", "noscript", "template", "svg", "math"],
};

export const sanitizeHtml = (html: string): string => xss(html, STORY_HTML);

const IFRAME_SRC = /<iframe\b[^>]*?\ssrc\s*=\s*["']([^"']+)["']/i;
const IFRAME_TITLE = /<iframe\b[^>]*?\stitle\s*=\s*["']([^"']*)["']/i;
const decodeAttr = (v: string) => v.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

/** The first iframe in a CDS html block, if its address is an allowed player (lib/embeds.ts). */
function playerIn(html: string) {
  const src = IFRAME_SRC.exec(html)?.[1];
  if (!src) return null;
  const title = IFRAME_TITLE.exec(html)?.[1];
  return embedFromUrl(decodeAttr(src), title ? decodeAttr(title) : null);
}

const text = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);
/** "Brandon Bell/Getty Images": photographer, then agency, as NPR credits them. */
export const photoCredit = (asset: Pick<Asset, "producer" | "provider">): string | null =>
  [text(asset.producer), text(asset.provider)].filter(Boolean).join("/") || null;
const usable = (asset: Asset | undefined): asset is Asset => !!asset && asset.isRestrictedToAuthorizedOrgServiceIds !== true;

export function toBody(doc: CdsDocument, skipAssetId: string | undefined): BodyBlock[] {
  const assets = doc.assets ?? {};
  return (doc.layout ?? []).flatMap((link): BodyBlock[] => {
    const asset = assets[assetKey(link.href)];
    if (!asset || asset.id === skipAssetId) return []; // hero image already shown above the body
    if (hasProfile(asset.profiles, "text") && asset.text) return [{ kind: "html", id: asset.id, html: sanitizeHtml(asset.text) }];
    if (hasProfile(asset.profiles, "html-block")) {
      // Brightspot's raw HTML block: keep only a player on the embed allowlist; everything else is dropped.
      const e = playerIn(asset.html ?? "");
      return e ? [{ kind: "embed", id: asset.id, ...e }] : [];
    }
    if (hasProfile(asset.profiles, "image")) {
      if (!usable(asset)) return [];
      const enc = pickEnclosure(asset, "image-wide");
      if (!enc) return [];
      return [{
        kind: "image", id: asset.id, src: enc.href,
        width: enc.width ?? 1440, height: enc.height ?? 810,
        caption: text(asset.caption), credit: photoCredit(asset),
      }];
    }
    return [];
  });
}

export const primaryImage = (doc: CdsDocument): Asset | undefined => {
  const link = doc.images?.find((l) => l.rels?.includes("primary")) ?? doc.images?.[0];
  return link ? doc.assets?.[assetKey(link.href)] : undefined;
};

/** Biography document ids behind a story's bylines (their names need a second CDS request). */
export const bylineDocumentIds = (doc: CdsDocument): string[] =>
  (doc.bylines ?? []).flatMap((b) => doc.assets?.[assetKey(b.href)]?.bylineDocuments?.map((d) => lastSegment(d.href)) ?? []);

/** `names` maps biography document id → person's name, fetched by the client. */
export function toPostData(doc: CdsDocument, names: ReadonlyMap<string, string> = new Map()): CdsPostData {
  const assets = doc.assets ?? {};
  const audio = doc.audio?.[0] ? assets[assetKey(doc.audio[0].href)] : undefined;
  const audioUrl = audio?.enclosures?.find((e) => e.type === "audio/mpeg")?.href ?? audio?.enclosures?.[0]?.href;
  const primary = primaryImage(doc);
  const image = usable(primary) ? primary : undefined;
  const textBylines = (doc.bylines ?? []).map((b) => assets[assetKey(b.href)]?.name).filter((n): n is string => Boolean(n));
  const bylineNames = [...textBylines, ...bylineDocumentIds(doc).map((id) => names.get(id)).filter((n): n is string => Boolean(n))];
  const collectionIds = (doc.collections ?? []).map((c) => lastSegment(c.href));
  return {
    cdsId: doc.id,
    title: doc.title,
    excerpt: doc.teaser ?? null,
    publishedAt: doc.publishDateTime,
    byline: bylineNames.length ? bylineNames.join(", ") : defaultBylineFor(collectionIds),
    audio: audioUrl ? { url: audioUrl, durationSeconds: audio?.duration ?? null } : null,
    imageUrl: pickCrop(image, "image-wide"),
    imageCaption: text(image?.caption),
    imageCredit: image ? photoCredit(image) : null,
    imageAlt: text(image?.altText),
    canonicalUrl: doc.webPages?.find((w) => w.rels?.includes("canonical"))?.href ?? null,
    editorialLastModified: doc.editorialLastModifiedDateTime ?? doc.publishDateTime,
    cdsBody: toBody(doc, primary?.id),
    collectionIds,
    premium: hasProfile(doc.profiles, "has-premium-audio"),
  };
}
