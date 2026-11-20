import { describe, expect, it } from "vitest";
import { returnToFromCookie, safeReturnTo } from "@/lib/staff/returnTo";

describe("safeReturnTo: where Google sign-in may send staff back to", () => {
  it("keeps a /staff page", () => {
    expect(safeReturnTo("/staff/add-event")).toBe("/staff/add-event");
  });
  it("sends anything else to the admin, as before", () => {
    for (const v of [undefined, "", "https://evil.com", "//evil.com", "/admin", "/staff/../admin", "/staff/%0d", "/staff/\\evil", "/staffing", "/staff/a b"]) {
      expect(safeReturnTo(v)).toBe("/admin");
    }
  });
});

describe("returnToFromCookie", () => {
  it("reads the hyfin-return cookie among others", () => {
    expect(returnToFromCookie("a=1; hyfin-return=%2Fstaff%2Fadd-event; b=2")).toBe("/staff/add-event");
    expect(returnToFromCookie(null)).toBe("/admin");
    expect(returnToFromCookie("hyfin-return=%E0%A4%A")).toBe("/admin");
  });
});
