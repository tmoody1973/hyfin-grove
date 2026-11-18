import { describe, expect, it } from "vitest";
import { postPath } from "@/lib/postPath";

describe("postPath", () => {
  it("puts a post under its category", () => {
    expect(postPath({ category: "culture", slug: "abc" })).toBe("/culture/abc");
    expect(postPath({ category: "milwaukee", slug: "x-y" })).toBe("/milwaukee/x-y");
  });
});
