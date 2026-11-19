import { describe, expect, it } from "vitest";
import { bylineWhere } from "@/lib/postQueries";

describe("stories by a host", () => {
  it("matches the name anywhere in the byline and hides withdrawn CDS stories", () => {
    expect(bylineWhere("Paula Lovo")).toEqual({ and: [{ byline: { like: "Paula Lovo" } }, { "cds.withdrawnAt": { exists: false } }] });
  });
  it("trims the name so a stray space can't widen or break the match", () => {
    expect(bylineWhere("  Paula Lovo ")).toEqual(bylineWhere("Paula Lovo"));
  });
});
