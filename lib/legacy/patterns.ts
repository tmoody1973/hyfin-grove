import type { Payload } from "payload";
import { postPath } from "../postPath";
import { slugify, type Category } from "../taxonomy";

type Db = Pick<Payload, "find">;

/** Old WordPress category paths (longest prefix wins) → where that coverage lives now. */
const CATEGORY_MAP: ReadonlyArray<[string, string]> = [
  ["news/music/jazz-night-in-america", "/music"],
  ["news/new-releases", "/tag/new-releases"],
  ["news/milwaukee", "/milwaukee"],
  ["news/business-innovation", "/tag/business"],
  ["news/entertainment", "/tag/entertainment"],
  ["news/music", "/music"],
  ["music", "/music"],
  ["new-releases", "/tag/new-releases"],
  ["releases", "/tag/new-releases"],
  ["music-industry", "/tag/industry"],
  ["concerts", "/tag/live-concerts"],
  ["artists", "/music"],
  ["interviews", "/tag/interviews"],
  ["podcasts/ladies-first", "/shows/ladies-first"],
  ["podcasts", "/shows"],
  ["events", "/events"],
  ["culture", "/culture"],
  ["milwaukee", "/milwaukee"],
];

/** WordPress author logins and /members/ names → host pages (others go home). */
const PEOPLE: Readonly<Record<string, string>> = {
  elementradiomilwaukee: "element-everest-blanks",
  anthonyradiomilwaukee: "anthony-foster",
  kennyradiomilwaukee: "kenny-perez",
  tarikradiomilwaukee: "tarik-moody",
  paularadiomilwaukee: "paula-lovo",
  meganradiomilwaukee: "megan-mathews",
  "megan-matthews": "megan-mathews",
};

/** Old /shows/<slug> → a current show or host. */
const OLD_SHOWS: Readonly<Record<string, string>> = {
  "rhythm-lab": "/shows/rhythm-lab-radio",
  anthony: "/hosts/anthony-foster",
  "tarik-aka-the-architect": "/hosts/tarik-moody",
  "hyfin-w-element": "/hosts/element-everest-blanks",
  "weekends-with-megan-mathews": "/hosts/megan-mathews",
};

const EVENT_PREFIXES = new Set(["events", "event", "venue", "organizer", "hyfin-event"]);

const exists = async (db: Db, collection: "tags" | "hosts" | "shows", slug: string) =>
  (await db.find({ collection, where: { slug: { equals: slug } }, limit: 1, depth: 0 })).docs.length > 0;

async function postBy(db: Db, wpSlug: string): Promise<string | null> {
  const { docs } = await db.find({ collection: "posts", where: { or: [{ "legacy.wpSlug": { equals: wpSlug } }, { slug: { equals: wpSlug } }] }, limit: 1, depth: 0 });
  const p = docs[0] as { category?: Category; slug?: string } | undefined;
  return p?.category && p.slug ? postPath({ category: p.category, slug: p.slug }) : null;
}

/** Ladies First's WordPress links are its titles slugified ("ladies-first-the-womack-sisters"); our copies come from CDS. */
async function postByTitleSlug(db: Db, wpSlug: string): Promise<string | null> {
  const { docs } = await db.find({ collection: "posts", where: { title: { like: wpSlug.replace(/-/g, " ") } }, limit: 10, depth: 0 });
  const p = (docs as Array<{ title: string; category?: Category; slug?: string }>).find((d) => slugify(d.title) === wpSlug);
  return p?.category && p.slug ? postPath({ category: p.category, slug: p.slug }) : null;
}

async function person(db: Db, name: string): Promise<string | null> {
  const key = name.replace(/-org$|-com$/, "").replace(/-/g, "");
  const slug = PEOPLE[name] ?? PEOPLE[key] ?? name;
  return (await exists(db, "hosts", slug)) ? `/hosts/${slug}` : null;
}

/**
 * Pattern rules for old hyfin.org addresses (plan 7, task 3). `path` is decoded, without trailing slash or query.
 * Returns null when no rule applies (the page then 404s or the junk list covers it).
 */
export async function patternTarget(path: string, db: Db): Promise<string | null> {
  const seg = path.split("/").filter(Boolean);
  const [first = "", second = ""] = seg;

  if (seg.at(-1) === "feed") return "/feed.xml";
  if (/^\d{4}$/.test(first) && seg.length <= 3 && seg.slice(1).every((s) => /^\d{2}$/.test(s))) return "/";
  if (first === "page") return "/";
  if (/^\d{4}$/.test(first) && seg.length === 4) {
    const wpSlug = seg[3].toLowerCase();
    // A dated story deleted on hyfin.org before the move goes home rather than to a dead end.
    return (await postBy(db, wpSlug)) ?? (await postByTitleSlug(db, wpSlug)) ?? "/";
  }

  switch (first) {
    case "category": {
      const cat = seg.slice(1).join("/").replace(/\/page\/\d+$/, "");
      return CATEGORY_MAP.find(([k]) => cat === k || cat.startsWith(`${k}/`))?.[1] ?? "/";
    }
    case "tag":
      return second && (await exists(db, "tags", second)) ? `/tag/${second}` : "/";
    case "author":
      return (second && (await person(db, second))) || "/";
    case "members":
      return (second && (await person(db, second))) || "/listen/schedule";
    case "podcast":
      return (second && (await postBy(db, second.toLowerCase()))) || "/shows";
    case "radiochannel":
      return "/listen/playlist";
    case "shows":
      if (Object.hasOwn(OLD_SHOWS, second)) return OLD_SHOWS[second];
      return second && (await exists(db, "shows", second)) ? `/shows/${second}` : "/shows";
    case "wp-content": {
      if (second !== "uploads") return null;
      const { docs } = await db.find({ collection: "media", where: { or: [{ sourceUrl: { equals: `https://hyfin.org${path}` } }, { sourceUrl: { equals: `http://hyfin.org${path}` } }] }, limit: 1, depth: 0 });
      return (docs[0] as { url?: string } | undefined)?.url ?? null;
    }
  }
  if (EVENT_PREFIXES.has(first)) return "/events";
  return null;
}
