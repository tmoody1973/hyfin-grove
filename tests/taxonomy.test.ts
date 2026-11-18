import { describe, expect, it } from "vitest";
import { CATEGORIES, CATEGORY_LABELS, SEED_TAGS, isCategory } from "@/lib/taxonomy";

describe("taxonomy", () => {
  it("has exactly the three launch categories, in order", () => {
    expect(CATEGORIES).toEqual(["music", "culture", "milwaukee"]);
    expect(CATEGORY_LABELS).toEqual({ music: "Music", culture: "Culture", milwaukee: "Milwaukee" });
  });

  it("seeds the shared tag list from the design", () => {
    expect(SEED_TAGS.filter((t) => t.group === "shared").map((t) => t.name)).toEqual([
      "Business", "Entertainment", "Politics & Policy", "History & Heritage", "Tech & AI", "Food", "Community", "Arts",
    ]);
  });

  it("seeds the music tag list from the design", () => {
    expect(SEED_TAGS.filter((t) => t.group === "music").map((t) => t.name)).toEqual([
      "New Releases", "Interviews", "Live & Concerts", "Industry",
    ]);
  });

  it("gives every tag a unique, url-safe slug", () => {
    expect(new Set(SEED_TAGS.map((t) => t.slug)).size).toBe(SEED_TAGS.length);
    for (const t of SEED_TAGS) expect(t.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(SEED_TAGS.find((t) => t.name === "Politics & Policy")?.slug).toBe("politics-policy");
  });

  it("recognizes only the three categories", () => {
    expect(isCategory("culture")).toBe(true);
    expect(isCategory("news")).toBe(false);
  });
});
