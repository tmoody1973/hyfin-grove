import { describe, expect, it } from "vitest";
import { searchIndexAccess } from "@/lib/seo";

describe("search index access", () => {
  it("is readable by logged-in editors only (titles of every post would otherwise be public)", () => {
    expect(searchIndexAccess.read({ req: { user: { id: 1 } } })).toBe(true);
    expect(searchIndexAccess.read({ req: { user: null } })).toBe(false);
  });
});
