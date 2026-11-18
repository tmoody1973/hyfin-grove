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

const slugify = (name: string) =>
  name.toLowerCase().replace(/&/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const tag = (name: string, group: TagGroup) => ({ name, slug: slugify(name), group });

/** Draft tag list; the import reports counts and tags under ~10 posts get merged. */
export const SEED_TAGS: ReadonlyArray<{ name: string; slug: string; group: TagGroup }> = [
  ...["Business", "Entertainment", "Politics & Policy", "History & Heritage", "Tech & AI", "Food", "Community", "Arts"].map(
    (n) => tag(n, "shared"),
  ),
  ...["New Releases", "Interviews", "Live & Concerts", "Industry"].map((n) => tag(n, "music")),
];
