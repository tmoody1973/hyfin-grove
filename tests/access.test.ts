import { describe, expect, it } from "vitest";
import type { Field } from "payload";
import { Users } from "@/collections/Users";
import { adminOnly, adminOnlyField, adminOrSelf, isAdmin } from "@/lib/access";

const req = (user: unknown) => ({ req: { user } }) as never;
const admin = { id: 1, role: "admin" };
const editor = { id: 7, role: "editor" };

describe("roles", () => {
  it("isAdmin is true only for the admin role", () => {
    expect(isAdmin(admin)).toBe(true);
    expect(isAdmin(editor)).toBe(false);
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin({ role: "Admin" })).toBe(false);
  });
  it("adminOrSelf: admins see everyone, editors only themselves, visitors nobody", () => {
    expect(adminOrSelf(req(admin))).toBe(true);
    expect(adminOrSelf(req(editor))).toEqual({ id: { equals: 7 } });
    expect(adminOrSelf(req(null))).toBe(false);
  });
  it("only admins pass adminOnly and adminOnlyField", () => {
    expect(adminOnly(req(admin))).toBe(true);
    expect(adminOnly(req(editor))).toBe(false);
    expect(adminOnlyField(req(editor))).toBe(false);
    expect(adminOnlyField(req(admin))).toBe(true);
  });
  it("Users: role defaults to editor, rides in the token, and only admins can set it", () => {
    const role = Users.fields.find((f) => "name" in f && f.name === "role") as Field & { defaultValue?: unknown; saveToJWT?: boolean; access?: { create?: unknown; update?: unknown } };
    expect(role.defaultValue).toBe("editor");
    expect(role.saveToJWT).toBe(true);
    expect(role.access?.update).toBe(adminOnlyField);
    expect(role.access?.create).toBe(adminOnlyField);
  });
  it("Users: editors can't create or delete users", () => {
    expect(Users.access?.create).toBe(adminOnly);
    expect(Users.access?.delete).toBe(adminOnly);
    expect(Users.access?.update).toBe(adminOrSelf);
    expect(Users.access?.read).toBe(adminOrSelf);
  });
});
