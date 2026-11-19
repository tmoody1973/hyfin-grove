import { describe, expect, it } from "vitest";
import { Pages } from "@/collections/Pages";
import { findPage } from "@/lib/pages";

type F = { name?: string; type?: string; unique?: boolean; relationTo?: string; fields?: F[] };
const field = (n: string) => (Pages.fields as F[]).find((f) => f.name === n);

describe("Pages collection", () => {
  it("has a unique slug, title, body, hero image and the WordPress origin", () => {
    expect(Pages.slug).toBe("pages");
    expect(field("slug")?.unique).toBe(true);
    expect(field("title")?.type).toBe("text");
    expect(field("body")?.type).toBe("richText");
    expect(field("heroImage")?.relationTo).toBe("media");
    expect(field("legacy")?.fields?.map((f) => f.name)).toEqual(expect.arrayContaining(["wpId", "wpUrl"]));
  });
});

describe("findPage", () => {
  const db = { find: async ({ where }: { where: { slug: { equals: string } } }) => ({ docs: where.slug.equals === "thewiz" ? [{ id: 1, slug: "thewiz", title: "The Wiz" }] : [] }) };
  it("finds a page by its old address, case-insensitively", async () => {
    expect((await findPage(db as never, "TheWiz"))?.title).toBe("The Wiz");
  });
  it("null for unknown or malformed slugs", async () => {
    expect(await findPage(db as never, "nope")).toBeNull();
    expect(await findPage(db as never, "../x")).toBeNull();
  });
});
