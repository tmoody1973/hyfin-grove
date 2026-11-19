import { AuthenticationError } from "payload";
import { describe, expect, it, vi } from "vitest";
import { passwordsForAdminsOnly } from "@/lib/auth/passwordGuard";

const reqWith = (user: unknown) => ({ payload: { find: vi.fn().mockResolvedValue({ docs: user ? [user] : [] }) }, t: (k: string) => k }) as never;
const run = (operation: string, email: string, user: unknown, password: string | undefined = "pw") =>
  passwordsForAdminsOnly({ args: { data: operation === "login" ? { email, password } : { email } }, operation, req: reqWith(user) } as never);

describe("password login and reset are for admins only", () => {
  it("an editor's password login fails like a wrong password", async () => {
    await expect(run("login", "element@radiomilwaukee.org", { id: 2, role: "editor" })).rejects.toBeInstanceOf(AuthenticationError);
  });
  it("an admin's password login goes through", async () => {
    const args = await run("login", "Tarik@radiomilwaukee.org", { id: 1, role: "admin" });
    expect(args).toEqual({ data: { email: "Tarik@radiomilwaukee.org", password: "pw" } });
  });
  it("an unknown email is left to Payload's normal answer", async () => {
    expect(await run("login", "nobody@x.org", null)).toEqual({ data: { email: "nobody@x.org", password: "pw" } });
  });
  it("an editor's 'forgot password' looks normal but sends no email", async () => {
    expect(await run("forgotPassword", "element@radiomilwaukee.org", { id: 2, role: "editor" })).toEqual({ data: { email: "element@radiomilwaukee.org" }, disableEmail: true });
  });
  it("an admin's 'forgot password' works", async () => {
    expect(await run("forgotPassword", "tarik@radiomilwaukee.org", { id: 1, role: "admin" })).toEqual({ data: { email: "tarik@radiomilwaukee.org" } });
  });
  it("other operations are untouched and never look anyone up", async () => {
    const req = reqWith({ role: "editor" });
    await passwordsForAdminsOnly({ args: { data: {} }, operation: "update", req } as never);
    expect((req as unknown as { payload: { find: ReturnType<typeof vi.fn> } }).payload.find).not.toHaveBeenCalled();
  });
  it("a login with no password gets Payload's normal validation, so it can't reveal who is an editor", async () => {
    const editor = { id: 2, role: "editor" };
    expect(await run("login", "element@radiomilwaukee.org", editor, "")).toEqual({ data: { email: "element@radiomilwaukee.org", password: "" } });
    const noPassword = { data: { email: "element@radiomilwaukee.org" } };
    expect(await passwordsForAdminsOnly({ args: noPassword, operation: "login", req: reqWith(editor) } as never)).toBe(noPassword);
  });
});
