/**
 * CDS document → the fields a synced post stores. Pure: no network, no DOM library (jsdom must never
 * reach the live server; see tests/serverBundle.test.ts).
 */

export type BodyBlock =
  | { kind: "html"; id: string; html: string }
  | { kind: "image"; id: string; src: string; width: number; height: number; caption: string | null; credit: string | null };

type Link = { href: string; rels?: string[] };
type Enclosure = Link & { type?: string; width?: number; height?: number };
export type Asset = {
  id: string;
  profiles?: Link[];
  text?: string;
  title?: string;
  name?: string;
  caption?: string | null;
  provider?: string | null;
  producer?: string | null;
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
 * Our own Brightspot HTML, rendered raw on the site, so strip anything executable.
 * ponytail: regex, not a parser; fine for editor-written story HTML, revisit if CDS ever feeds third-party HTML.
 */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/<(script|style|iframe|object|embed)\b[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<(script|style|iframe|object|embed)\b[^>]*\/?>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(href|src)\s*=\s*("\s*javascript:[^"]*"|'\s*javascript:[^']*'|javascript:[^\s>]*)/gi, "");
}

export function toBody(doc: CdsDocument, skipAssetId: string | undefined): BodyBlock[] {
  const assets = doc.assets ?? {};
  return (doc.layout ?? []).flatMap((link): BodyBlock[] => {
    const asset = assets[assetKey(link.href)];
    if (!asset || asset.id === skipAssetId) return []; // hero image already shown above the body
    if (hasProfile(asset.profiles, "text") && asset.text) return [{ kind: "html", id: asset.id, html: sanitizeHtml(asset.text) }];
    if (hasProfile(asset.profiles, "image")) {
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
  const image = primaryImage(doc);
  const textBylines = (doc.bylines ?? []).map((b) => assets[assetKey(b.href)]?.name).filter((n): n is string => Boolean(n));
  const bylineNames = [...textBylines, ...bylineDocumentIds(doc).map((id) => names.get(id)).filter((n): n is string => Boolean(n))];
  return {
    cdsId: doc.id,
    title: doc.title,
    excerpt: doc.teaser ?? null,
    publishedAt: doc.publishDateTime,
    byline: bylineNames.length ? bylineNames.join(", ") : null,
    audio: audioUrl ? { url: audioUrl, durationSeconds: audio?.duration ?? null } : null,
    imageUrl: pickCrop(image, "image-wide"),
    canonicalUrl: doc.webPages?.find((w) => w.rels?.includes("canonical"))?.href ?? null,
    editorialLastModified: doc.editorialLastModifiedDateTime ?? doc.publishDateTime,
    cdsBody: toBody(doc, image?.id),
    collectionIds: (doc.collections ?? []).map((c) => lastSegment(c.href)),
    premium: hasProfile(doc.profiles, "has-premium-audio"),
  };
}
