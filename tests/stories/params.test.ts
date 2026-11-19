import { describe, expect, it } from "vitest";
import { pageHref, parsePage } from "@/lib/stories/params";

describe("parsePage", () => {
  it("is 1 when missing or empty", () => {
    expect(parsePage({})).toBe(1);
    expect(parsePage({ page: "" })).toBe(1);
  });
  it("reads a positive whole number", () => {
    expect(parsePage({ page: "3" })).toBe(3);
  });
  it("is null (404) for zero, negatives, words, fractions and huge numbers", () => {
    for (const page of ["0", "-1", "abc", "2.5", "1e3", " 2", "99999999999999999999"]) expect(parsePage({ page }), page).toBeNull();
  });
  it("uses the first of repeated ?page values", () => {
    expect(parsePage({ page: ["2", "3"] })).toBe(2);
  });
});

describe("pageHref", () => {
  it("leaves ?page off page 1", () => {
    expect(pageHref("/music", 1)).toBe("/music");
    expect(pageHref("/music", 2)).toBe("/music?page=2");
  });
});
