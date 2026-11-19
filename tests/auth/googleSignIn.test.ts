import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GoogleSignIn } from "@/components/admin/GoogleSignIn";

const render = (searchParams: Record<string, string> = {}) => { const out = GoogleSignIn({ searchParams }); return out ? renderToStaticMarkup(out) : ""; };
const on = () => {
  vi.stubEnv("GOOGLE_OAUTH_CLIENT_ID", "id");
  vi.stubEnv("GOOGLE_OAUTH_CLIENT_SECRET", "secret");
};
afterEach(() => vi.unstubAllEnvs());

describe("admin login: Sign in with Google", () => {
  it("links to the Google sign-in path and says who it's for", () => {
    on();
    const html = render();
    expect(html).toContain('href="/api/users/oauth/google"');
    expect(html).toContain("Sign in with Google");
    expect(html).toContain("@radiomilwaukee.org");
    expect(html).not.toContain('role="alert"');
  });
  it("explains a rejected account", () => {
    on();
    expect(render({ error: "google-not-staff" })).toContain("That Google account isn&#x27;t a Radio Milwaukee account.");
    expect(render({ error: "google" })).toContain("Google sign-in failed. Try again.");
  });
  it("shows nothing when Google isn't configured", () => {
    vi.stubEnv("GOOGLE_OAUTH_CLIENT_ID", "");
    expect(render()).toBe("");
  });
});
