/**
 * "Sign in with Google" above the admin login form (plan 2026-11-19-google-sign-in). Rendered by Payload with
 * the login page's search params, which carry ?error= from a rejected Google sign-in.
 */
const MESSAGES: Record<string, string> = {
  "google-not-staff": "That Google account isn't a Radio Milwaukee account.",
  google: "Google sign-in failed. Try again.",
};

export function GoogleSignIn({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  if (!process.env.GOOGLE_OAUTH_CLIENT_ID || !process.env.GOOGLE_OAUTH_CLIENT_SECRET) return null;
  const code = typeof searchParams?.error === "string" ? searchParams.error : "";
  const message = Object.hasOwn(MESSAGES, code) ? MESSAGES[code] : null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
      {message && (
        <p role="alert" style={{ margin: 0, color: "var(--theme-error-500)" }}>
          {message}
        </p>
      )}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- an API route that redirects to Google: needs a full navigation, not client-side <Link> */}
      <a href="/api/users/oauth/google" className="btn btn--style-primary btn--size-large" style={{ margin: 0, textAlign: "center" }}>
        Sign in with Google
      </a>
      <p style={{ margin: 0, color: "var(--theme-elevation-500)", fontSize: "0.85rem" }}>
        Radio Milwaukee staff: use your @radiomilwaukee.org Google account. Password login is for admins.
      </p>
    </div>
  );
}

export default GoogleSignIn;
