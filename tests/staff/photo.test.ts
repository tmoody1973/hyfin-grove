import { describe, expect, it } from "vitest";
import { checkPhoto, MAX_PHOTO_BYTES } from "@/lib/staff/photo";

const file = (type: string, size: number, name = "p.jpg") => new File([new Uint8Array(size)], name, { type });

describe("checkPhoto: the quick-add form's optional event photo", () => {
  it("is fine to leave out", () => {
    expect(checkPhoto(null, "")).toEqual({ ok: true, photo: null });
    expect(checkPhoto(file("application/octet-stream", 0, ""), "")).toEqual({ ok: true, photo: null }); // empty file input
  });
  it("accepts a JPEG, PNG or WebP under the limit, with a description", () => {
    const r = checkPhoto(file("image/jpeg", 900_000), "Crowd at Bounce");
    expect(r.ok && r.photo?.alt).toBe("Crowd at Bounce");
  });
  it("needs a short description for people who can't see it", () => {
    const r = checkPhoto(file("image/png", 1000, "p.png"), "  ");
    expect(!r.ok && r.error).toMatch(/describe/i);
  });
  it("refuses other file types and anything over the limit", () => {
    expect(checkPhoto(file("image/gif", 1000, "a.gif"), "x").ok).toBe(false);
    expect(checkPhoto(file("image/heic", 1000, "a.heic"), "x").ok).toBe(false);
    expect(checkPhoto(file("image/jpeg", MAX_PHOTO_BYTES + 1), "x").ok).toBe(false);
  });
});
