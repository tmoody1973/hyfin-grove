import { describe, expect, it } from "vitest";
import { postPath } from "@/lib/postPath";

describe("postPath", () => {
  it("puts a post under its category", () => {
    expect(postPath({ category: "culture", slug: "abc" })).toBe("/culture/abc");
    expect(postPath({ category: "milwaukee", slug: "x-y" })).toBe("/milwaukee/x-y");
  });
});

describe("postPath with non-ASCII slugs", () => {
  it("percent-encodes the slug so it is a valid redirect header", () => {
    expect(postPath({ category: "culture", slug: "wu‑tang-clan" })).toBe("/culture/wu%E2%80%91tang-clan");
  });
});
