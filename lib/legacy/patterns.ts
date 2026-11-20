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

const PRIVACY = "https://radiomilwaukee.org/privacy-policy";
/** The long tail of old WordPress sections, plugins, theme demos and test pages (first match wins). */
const TAIL: ReadonlyArray<[RegExp, string]> = [
  [/(\.(xml|rss)|\/xml|,rss)$/, "/feed.xml"],
  [/^\/(about|about-us|contact|contact-us)$/, "/aboutus"],
  [/^\/(the[\s-]wiz|thwiz|thewiz-\d+)$|^\/thewiz\//, "/thewiz"],
  [/^\/(anti[\s-]?gala|harlm|harlem-[a-z0-9-]+)$/, "/harlem"],
  [/^\/hol[a-z]{3,}marke?t?$/, "/blackity-black-holiday-market"],
  [/^\/(new-)?music-?mondays?$/, "/shows/new-music-mondays"],
  [/^\/concerts?$/, "/events"],
  [/^\/(show|showgenre|series)\//, "/shows"],
  [/^\/(eventtype|event-type|place|schedule-event)(\/|$)|^\/new-hyfin-event-calendar$/, "/events"],
  [/^\/podcasts?(-archive|-page-[a-z0-9-]+)?(\/|$)/, "/shows"],
  [/^\/(schedule|schedulefilter)(\/|$)/, "/listen/schedule"],
  [/^\/filter(\/|$)/, "/listen/playlist"],
  [/^\/support\/./, "/support"],
  [/^\/black-?business(-[a-z0-9-]+)?$/, "/hyfin-100"],
  [/^\/blackity-?black$|^\/blackity-holidy-market$/, "/blackity-black-holiday-market"],
  [/^\/(mec_esb|jet-popup|proradio-megafooter|wprss_feed_categories)(\/|$)|^\/(videos-archive|page-with-sidebar|story-grid-for-app|team-members-\d+|contests?|hy|robertglasper)$/, "/"],
  [/^\/(chart|chartcategory)(\/|$)|^\/charts?(-[a-z0-9-]+)?$|^\/(test-)?playlist(-[a-z0-9-]+)?$/, "/listen/playlist"],
  [/^\/(hyfin-events|event-location|mec-fes-builder)(\/|$)|^\/(event|events)-[a-z0-9-]+$|^\/test-event$/, "/events"],
  [/^\/(wpautoterms)(\/|$)|^\/privacy-policy(-[a-z0-9-]+)?$/, PRIVACY],
  [/^\/ladies-?first$/, "/shows/ladies-first"],
  [/^\/holiday-?market$/, "/blackity-black-holiday-market"],
  [/^\/(thewiz\d+|wiz-old|the-wiz(-[a-z0-9-]+)?)$/, "/thewiz"],
  [/^\/(qtvideo|product|cart|checkout|store|shop|account|my-account(-\d+)?)(\/|$)/, "/"],
  [/^\/(blog-[a-z0-9-]+|home-[a-z0-9-]+|hyfin-home(-[a-z0-9-]+)?|hyfin-landing-page(-[a-z0-9-]+)?|test-[a-z0-9-]+|sample-page|new-layout-\d+|donor-[a-z0-9-]+|donation-failed|promote-\d+)(\/|$)/, "/"],
];

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
  const seg = path.toLowerCase().split("/").filter(Boolean);
  const [first = "", second = ""] = seg;

  if (seg.at(-1) === "feed") return "/feed.xml";
  if (/^\d{4}$/.test(first) && seg.length <= 3 && seg.slice(1).every((s) => /^\d{2}$/.test(s))) return "/";
  if (first === "page") return "/";
  if (/^\d{4}$/.test(first) && seg.length >= 4 && /^\d{2}$/.test(seg[1]) && /^\d{2}$/.test(seg[2])) {
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
  if (first === "podcastfilter") return second && (await exists(db, "shows", second)) ? `/shows/${second}` : "/shows";
  const tail = TAIL.find(([re]) => re.test(`/${seg.join("/")}`));
  if (tail) return tail[1];
  // Some WordPress stories were linked at the site root (/greater-milwaukee-foundation-launches-…/) or under /news/.
  if (seg.length === 1) return (await postBy(db, first)) ?? (await postByTitleSlug(db, first));
  if (first === "news" && seg.length === 2) return postBy(db, second);
  return null;
}
