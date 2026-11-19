import { describe, expect, it } from "vitest";
import { Media } from "@/collections/Media";

describe("Media collection", () => {
  it("is publicly readable, so site visitors can load images", () => {
    const read = Media.access?.read;
    expect(typeof read).toBe("function");
    expect((read as (args: unknown) => unknown)({ req: { user: null } })).toBe(true);
  });
});
