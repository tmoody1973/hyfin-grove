import type { PluginTypes as PluginOptions } from "payload-oauth2";
import { SITE_URL } from "../seo";
import { NotStaffError, STAFF_DOMAIN, staffIdentity } from "./googleProfile";

const USERINFO = "https://openidconnect.googleapis.com/v1/userinfo";

/**
 * "Sign in with Google" for the admin (plan 2026-11-19-google-sign-in). The plugin runs the OAuth dance; this
 * decides who gets in. Off until both keys are set. PKCE on: the plugin forwards OAuth `state` but never
 * checks it, and PKCE ties each sign-in to the browser that started it.
 */
export function googleOAuth(): PluginOptions {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID ?? "";
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "";
  return {
    enabled: Boolean(clientId && clientSecret),
    strategyName: "google",
    authCollection: "users",
    // Local dev sets GOOGLE_OAUTH_SERVER_URL=http://localhost:3007; Google must list the same callback.
    serverURL: (process.env.GOOGLE_OAUTH_SERVER_URL || SITE_URL).replace(/\/+$/, ""),
    clientId,
    clientSecret,
    authorizePath: "/oauth/google",
    callbackPath: "/oauth/google/callback",
    providerAuthorizationUrl: `https://accounts.google.com/o/oauth2/v2/auth?hd=${STAFF_DOMAIN}`,
    tokenEndpoint: "https://oauth2.googleapis.com/token",
    scopes: ["openid", "email", "profile"],
    prompt: "select_account",
    pkceEnabled: true,
    useEmailAsIdentity: true,
    onUserNotFoundBehavior: "create", // new staff start as editors (the role field's default)
    // Whatever this returns is written to the user record: email and Google id only, never a role.
    async getUserInfo(accessToken) {
      const res = await fetch(USERINFO, { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`Google userinfo failed: HTTP ${res.status}`);
      return staffIdentity(await res.json());
    },
    successRedirect: () => "/admin",
    failureRedirect(req, error) {
      if (error instanceof NotStaffError) {
        req.payload.logger.warn(error.message);
        return "/admin/login?error=google-not-staff";
      }
      req.payload.logger.error(`Google sign-in failed: ${error instanceof Error ? error.message : String(error)}`);
      return "/admin/login?error=google";
    },
  };
}
