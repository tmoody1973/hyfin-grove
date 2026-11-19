import { describe, expect, it } from "vitest";
import { visible } from "@/lib/postQueries";

describe("visible", () => {
  it("adds 'not withdrawn' to any lookup", () => {
    expect(visible({ slug: { equals: "a" } })).toEqual({ and: [{ slug: { equals: "a" } }, { "cds.withdrawnAt": { exists: false } }] });
  });
});
