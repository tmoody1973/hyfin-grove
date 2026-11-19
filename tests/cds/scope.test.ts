import { describe, expect, it } from "vitest";
import { isWordPressCopy, mapByCollections, SCOPE_COLLECTION_IDS } from "@/lib/cds/scope";

describe("HYFIN CDS scope", () => {
  it("recognizes WordPress copies by their hyfin- id", () => {
    expect(isWordPressCopy("hyfin-440659")).toBe(true);
    expect(isWordPressCopy("g-s921-17816")).toBe(false);
  });
  it("covers the HYFIN tag and the three HYFIN series, not DJ Takeover", () => {
    expect([...SCOPE_COLLECTION_IDS].sort()).toEqual(["g-s921-13049", "g-s921-16131", "g-s921-3487", "g-s921-8151"]);
  });
  it("maps a series even when the HYFIN tag is also present", () => {
    expect(mapByCollections(["g-s921-16131", "g-s921-13049"])).toEqual({ category: "music", showSlug: "ladies-first", showName: "Ladies First" });
  });
  it("leaves tag-only stories to Jev", () => {
    expect(mapByCollections(["g-s921-16131", "319418027"])).toBeNull();
  });
  it("does not map DJ Takeover", () => {
    expect(mapByCollections(["g-s921-1281"])).toBeNull();
  });
});
