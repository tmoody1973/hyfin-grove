/** The three launch categories (design: "Content model"). One per post. */
export const CATEGORIES = ["music", "culture", "milwaukee"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  music: "Music",
  culture: "Culture",
  milwaukee: "Milwaukee",
};

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

export type TagGroup = "shared" | "music";

export const slugify = (name: string) =>
  name.toLowerCase().replace(/&/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const tag = (name: string, group: TagGroup) => ({ name, slug: slugify(name), group });

/** Draft tag list; the import reports counts and tags under ~10 posts get merged. */
export const SEED_TAGS: ReadonlyArray<{ name: string; slug: string; group: TagGroup }> = [
  ...["Business", "Entertainment", "Politics & Policy", "History & Heritage", "Tech & AI", "Food", "Community", "Arts"].map(
    (n) => tag(n, "shared"),
  ),
  ...["New Releases", "Interviews", "Live & Concerts", "Industry"].map((n) => tag(n, "music")),
];

/** What each tag means, for Jev and for editors. Arts and Entertainment deliberately exclude music. */
const TAG_DESCRIPTIONS: Record<string, string> = {
  business: "Business: companies, entrepreneurs, money, jobs, the economy, Black-owned businesses",
  entertainment: "Entertainment: film, TV, streaming, celebrities, award shows, comedy (not music)",
  "politics-policy": "Politics & Policy: government, elections, laws, courts, policing, public policy",
  "history-heritage": "History & Heritage: Black history, anniversaries, legacies, looking back at the past",
  "tech-ai": "Tech & AI: technology, artificial intelligence, social platforms, apps, gaming",
  food: "Food: restaurants, chefs, cooking, food and drink culture",
  community: "Community: local organizing, nonprofits, education, health, neighborhood life",
  arts: "Arts: visual art, theater, dance, literature, museums, fashion (not music)",
  "new-releases": "New Releases: a new album, single or video being announced or reviewed",
  interviews: "Interviews: built around a conversation or Q&A with an artist or guest",
  "live-concerts": "Live & Concerts: concerts, tours, festivals, live performances",
  industry: "Industry: the business of music, such as labels, streaming payouts, charts, deals, awards",
};

export const tagDescription = (slug: string): string => (Object.hasOwn(TAG_DESCRIPTIONS, slug) ? TAG_DESCRIPTIONS[slug] : "");
