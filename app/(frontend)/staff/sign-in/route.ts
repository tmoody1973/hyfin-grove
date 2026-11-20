import { RETURN_COOKIE, safeReturnTo } from "@/lib/staff/returnTo";

/**
 * Starts Google sign-in for a staff page (plan 9, task 6): remembers where to come back to for 10 minutes, then
 * hands off to the admin's Google sign-in. Only /staff/ pages are remembered (see safeReturnTo).
 */
export function GET(req: Request) {
  const next = safeReturnTo(new URL(req.url).searchParams.get("next"));
  const res = new Response(null, { status: 302, headers: { Location: "/api/users/oauth/google" } });
  const secure = new URL(req.url).protocol === "https:" ? "; Secure" : "";
  res.headers.append("Set-Cookie", `${RETURN_COOKIE}=${encodeURIComponent(next)}; Path=/; Max-Age=600; HttpOnly; SameSite=Lax${secure}`);
  return res;
}
