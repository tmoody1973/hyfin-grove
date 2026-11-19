import { afterEach, describe, expect, it, vi } from "vitest";
import { googleOAuth } from "@/lib/auth/google";
import { NotStaffError } from "@/lib/auth/googleProfile";

const req = { payload: { logger: { error: vi.fn(), warn: vi.fn() } } } as never;
const withKeys = () => {
  vi.stubEnv("GOOGLE_OAUTH_CLIENT_ID", "id");
  vi.stubEnv("GOOGLE_OAUTH_CLIENT_SECRET", "secret");
};
const profile = (p: Record<string, unknown>) => vi.fn().mockResolvedValue(new Response(JSON.stringify(p)));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Google sign-in options", () => {
  it("is off until both Google keys are set", () => {
    vi.stubEnv("GOOGLE_OAUTH_CLIENT_ID", "id");
    vi.stubEnv("GOOGLE_OAUTH_CLIENT_SECRET", "");
    expect(googleOAuth().enabled).toBe(false);
    withKeys();
    expect(googleOAuth().enabled).toBe(true);
  });
  it("uses PKCE, Google's account picker, the Workspace hint and named paths", () => {
    withKeys();
    const o = googleOAuth();
    expect(o.pkceEnabled).toBe(true);
    expect(o.prompt).toBe("select_account");
    expect(new URL(o.providerAuthorizationUrl).searchParams.get("hd")).toBe("radiomilwaukee.org");
    expect(o.scopes).toEqual(["openid", "email", "profile"]);
    expect(o.authorizePath).toBe("/oauth/google");
    expect(o.callbackPath).toBe("/oauth/google/callback");
    expect(o.useEmailAsIdentity).toBe(true);
  });
  it("rejects a Gmail profile before any account exists", async () => {
    withKeys();
    vi.stubGlobal("fetch", profile({ email: "x@gmail.com", email_verified: true, sub: "9" }));
    await expect(googleOAuth().getUserInfo("token", req)).rejects.toBeInstanceOf(NotStaffError);
  });
  it("returns only email and Google id for staff (nothing else gets written to the user)", async () => {
    withKeys();
    const fetchMock = profile({ email: "Element@radiomilwaukee.org", email_verified: true, hd: "radiomilwaukee.org", sub: "42", name: "E", role: "admin" });
    vi.stubGlobal("fetch", fetchMock);
    expect(await googleOAuth().getUserInfo("token", req)).toEqual({ email: "element@radiomilwaukee.org", sub: "42" });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer token");
  });
  it("sends rejected accounts back to the login page with the right message", async () => {
    withKeys();
    const o = googleOAuth();
    expect(await o.failureRedirect(req, new NotStaffError("x"))).toBe("/admin/login?error=google-not-staff");
    expect(await o.failureRedirect(req, new Error("boom"))).toBe("/admin/login?error=google");
    expect(await o.successRedirect(req)).toBe("/admin");
  });
});
