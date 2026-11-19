import { describe, expect, it, vi } from "vitest";
import { Forbidden } from "payload";
import { Users } from "@/collections/Users";
import { adminOnly } from "@/lib/access";
import { googleIdMustMatch, editorsKeepTheirEmail, MAX_SESSION_MS, sessionsEndAfterEightHours } from "@/lib/auth/accountGuards";
import { passwordsForAdminsOnly } from "@/lib/auth/passwordGuard";

const now = Date.parse("2026-11-19T20:00:00Z");
const refreshReq = (createdAt: string | undefined) =>
  ({ user: { id: 1, _sid: "s1" }, payload: { db: { findOne: vi.fn().mockResolvedValue({ id: 1, sessions: [{ id: "s1", createdAt, expiresAt: "2026-11-20T04:00:00Z" }] }) } }, t: (k: string) => k }) as never;

describe("sessions end 8 hours after sign-in, however often they refresh", () => {
  it("allows a refresh inside 8 hours", async () => {
    vi.setSystemTime(now);
    const args = { req: refreshReq("2026-11-19T13:00:00Z") };
    expect(await sessionsEndAfterEightHours({ args, operation: "refresh" } as never)).toBe(args);
  });
  it("refuses a refresh once the session is older than 8 hours", async () => {
    vi.setSystemTime(now);
    await expect(sessionsEndAfterEightHours({ args: { req: refreshReq("2026-11-19T11:59:00Z") }, operation: "refresh" } as never)).rejects.toBeInstanceOf(Forbidden);
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

describe("Users wiring", () => {
  it("registers every guard on the collection", () => {
    expect(Users.hooks?.beforeOperation).toEqual(expect.arrayContaining([passwordsForAdminsOnly, sessionsEndAfterEightHours]));
    expect(Users.hooks?.beforeChange).toEqual(expect.arrayContaining([googleIdMustMatch, editorsKeepTheirEmail]));
  });
  it("only admins can unlock accounts", () => expect(Users.access?.unlock).toBe(adminOnly));
  it("keeps database sessions on (the Google plugin's no-session branch would recreate deleted users)", () => {
    expect(typeof Users.auth === "object" && Users.auth.useSessions).not.toBe(false);
  });
});
