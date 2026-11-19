import { describe, expect, it } from "vitest";
import { isNmmTitle, resolveTag } from "@/lib/stories";

const db = {
  find: async ({ where }: { where: { slug: { equals: string } } }) => ({
    docs: where.slug.equals === "new-releases" ? [{ id: 4, name: "New Releases", slug: "new-releases", group: "music" }] : [],
  }),
};

describe("resolveTag", () => {
  it("finds a tag by slug, null when unknown or malformed", async () => {
    expect((await resolveTag(db as never, "new-releases"))?.name).toBe("New Releases");
    expect(await resolveTag(db as never, "nope")).toBeNull();
    expect(await resolveTag(db as never, "../x")).toBeNull();
  });
});

describe("isNmmTitle", () => {
  it("matches the New Music Mondays post titles hyfin.org uses", () => {
    for (const t of ["NEW MUSIC MONDAYS…Loveliness from Snoh Aalegra", "NEW MUSIC MONDAYS: Freshness", "New Music Monday: x", "NEW MUSIC MONDAYS….featuring NEW releases"]) expect(isNmmTitle(t), t).toBe(true);
  });
  it("leaves other stories alone", () => {
    for (const t of ["New music from Snoh Aalegra", "Monday: new music", "NEW MUSIC MONDAYSX"]) expect(isNmmTitle(t), t).toBe(false);
  });
});
