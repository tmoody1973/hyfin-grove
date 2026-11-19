import { describe, expect, it, vi } from "vitest";
import { Forbidden } from "payload";
import { Users } from "@/collections/Users";
import { adminOnly } from "@/lib/access";
import { editorsCantSetPasswords, googleIdMustMatch, editorsKeepTheirEmail, MAX_SESSION_MS, sessionsEndAfterEightHours, TOKEN_SECONDS } from "@/lib/auth/accountGuards";
import { passwordsForAdminsOnly } from "@/lib/auth/passwordGuard";

const now = Date.parse("2026-11-19T20:00:00Z");
const refreshReq = (createdAt: string | undefined) =>
  ({ user: { id: 1, _sid: "s1" }, payload: { db: { findOne: vi.fn().mockResolvedValue({ id: 1, sessions: [{ id: "s1", createdAt, expiresAt: "2026-11-20T04:00:00Z" }] }) } }, t: (k: string) => k }) as never;

describe("sessions end 8 hours after sign-in, however often they refresh", () => {
  it("allows a refresh while the new token still ends inside the 8 hours", async () => {
    vi.setSystemTime(now); // 20:00 UTC; session began 13:00, new 1-hour token ends 21:00 = exactly 8 h
    const args = { req: refreshReq("2026-11-19T13:00:00Z") };
    expect(await sessionsEndAfterEightHours({ args, operation: "refresh" } as never)).toBe(args);
  });
  it("refuses a refresh whose new token would outlive 8 hours from sign-in", async () => {
    vi.setSystemTime(now); // session began 12:59, a new token would end 21:00 = 8 h 1 min
    await expect(sessionsEndAfterEightHours({ args: { req: refreshReq("2026-11-19T12:59:00Z") }, operation: "refresh" } as never)).rejects.toBeInstanceOf(Forbidden);
  });
  it("tokens last an hour, so no token can outlive the 8-hour cap", () => {
    expect(TOKEN_SECONDS).toBe(3600);
    expect(typeof Users.auth === "object" && Users.auth.tokenExpiration).toBe(TOKEN_SECONDS);
  });
  it("refuses a session with no recorded start (fails closed)", async () => {
    await expect(sessionsEndAfterEightHours({ args: { req: refreshReq(undefined) }, operation: "refresh" } as never)).rejects.toBeInstanceOf(Forbidden);
  });
  it("ignores other operations", async () => {
    const args = { req: { user: null } };
    expect(await sessionsEndAfterEightHours({ args, operation: "login" } as never)).toBe(args);
    expect(MAX_SESSION_MS).toBe(8 * 3_600_000);
  });
});

describe("account guards", () => {
  it("refuses to attach a different Google account to a user (recycled address)", () => {
    expect(() => googleIdMustMatch({ data: { sub: "new" }, originalDoc: { sub: "old" }, operation: "update" } as never)).toThrow(Forbidden);
    expect(googleIdMustMatch({ data: { sub: "same" }, originalDoc: { sub: "same" }, operation: "update" } as never)).toEqual({ sub: "same" });
    expect(googleIdMustMatch({ data: { sub: "first" }, originalDoc: { sub: null }, operation: "update" } as never)).toEqual({ sub: "first" });
  });
  it("editors can't change their own email; admins and Google sign-in (no logged-in user) can", () => {
    const run = (user: unknown) => editorsKeepTheirEmail({ data: { email: "newhire@radiomilwaukee.org" }, originalDoc: { email: "editor@radiomilwaukee.org" }, operation: "update", req: { user, t: (k: string) => k } } as never);
    expect(() => run({ id: 2, role: "editor" })).toThrow(Forbidden);
    expect(run({ id: 1, role: "admin" })).toEqual({ data: { email: "newhire@radiomilwaukee.org" } }.data);
    expect(run(null)).toEqual({ email: "newhire@radiomilwaukee.org" });
  });
});

describe("editors have no password", () => {
  it("an editor can't set a password on their account; admins and Google account creation can", () => {
    const run = (user: unknown, operation = "update") => editorsCantSetPasswords({ data: { password: "x" }, operation, req: { user, t: (k: string) => k } } as never);
    expect(() => run({ id: 2, role: "editor" })).toThrow(Forbidden);
    expect(run({ id: 1, role: "admin" })).toEqual({ password: "x" });
    expect(run(null, "create")).toEqual({ password: "x" }); // Google sign-in creates the account with a random password
  });
});

describe("Users wiring", () => {
  it("registers every guard on the collection", () => {
    expect(Users.hooks?.beforeOperation).toEqual(expect.arrayContaining([passwordsForAdminsOnly, sessionsEndAfterEightHours]));
    expect(Users.hooks?.beforeChange).toEqual(expect.arrayContaining([googleIdMustMatch, editorsKeepTheirEmail, editorsCantSetPasswords]));
  });
  it("only admins can unlock accounts", () => expect(Users.access?.unlock).toBe(adminOnly));
  it("keeps database sessions on (the Google plugin's no-session branch would recreate deleted users)", () => {
    expect(typeof Users.auth === "object" && Users.auth.useSessions).not.toBe(false);
  });
});
