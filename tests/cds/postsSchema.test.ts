import { describe, expect, it } from "vitest";
import type { Field } from "payload";
import { Posts } from "@/collections/Posts";
import { cdsLocked } from "@/lib/cds/fieldAccess";

const field = (name: string) => Posts.fields.find((f) => "name" in f && f.name === name) as Field & { access?: { create?: unknown; update?: unknown }; admin?: { condition?: (d: unknown) => boolean } };

describe("Posts schema for synced stories", () => {
  it("locks the rich-text body on CDS posts and hides it there (the page shows cdsBody instead)", () => {
    expect(field("body").access?.update).toBe(cdsLocked);
    expect(field("body").admin?.condition?.({ source: "cds" })).toBe(false);
    expect(field("body").admin?.condition?.({ source: "wordpress" })).toBe(true);
  });
  it("never accepts cdsBody from a person: it is rendered as HTML, so only the sanitizing sync may write it", () => {
    const access = field("cdsBody").access as { create: () => boolean; update: () => boolean };
    expect(access.create()).toBe(false);
    expect(access.update()).toBe(false);
  });
});
