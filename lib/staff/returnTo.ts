/** Where Google sign-in sends staff back to (plan 9, task 6). Only /staff/ pages; anything else is the admin, as before. */
export const RETURN_COOKIE = "hyfin-return";
const FALLBACK = "/admin";
const STAFF_PATH = /^\/staff\/[a-z0-9-]+(\/[a-z0-9-]+)*$/;

export function safeReturnTo(value: string | null | undefined): string {
  return value && STAFF_PATH.test(value) ? value : FALLBACK;
}

/** Reads the return path from a Cookie header; a broken or missing value means the admin. */
export function returnToFromCookie(cookieHeader: string | null | undefined): string {
  const raw = (cookieHeader ?? "").split(/;\s*/).find((c) => c.startsWith(`${RETURN_COOKIE}=`))?.slice(RETURN_COOKIE.length + 1);
  if (!raw) return FALLBACK;
  try {
    return safeReturnTo(decodeURIComponent(raw));
  } catch {
    return FALLBACK;
  }
}
