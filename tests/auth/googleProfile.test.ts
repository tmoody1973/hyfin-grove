import { describe, expect, it } from "vitest";
import { NotStaffError, staffIdentity } from "@/lib/auth/googleProfile";

const staff = { email: "Tarik@RadioMilwaukee.org", email_verified: true, hd: "radiomilwaukee.org", sub: "1" };

describe("staffIdentity", () => {
  it("accepts a verified Radio Milwaukee Workspace account, lowercasing the email", () => {
    expect(staffIdentity(staff)).toEqual({ email: "tarik@radiomilwaukee.org", sub: "1" });
  });
  it.each([
    ["a Gmail account", { ...staff, email: "tarik@gmail.com", hd: undefined }],
    ["no Workspace domain (hd missing)", { ...staff, hd: undefined }],
    ["another Workspace's hd, even with a staff-looking email", { ...staff, hd: "evil.org" }],
    ["an unverified email", { ...staff, email_verified: false }],
    ["email_verified as the string 'true'", { ...staff, email_verified: "true" }],
    ["a look-alike domain", { ...staff, email: "tarik@radiomilwaukee.org.evil.com" }],
    ["a missing Google id", { ...staff, sub: undefined }],
    ["no email at all", { ...staff, email: undefined }],
  ])("rejects %s", (_, profile) => {
    expect(() => staffIdentity(profile)).toThrow(NotStaffError);
  });
});
