/**
 * Who may sign in with Google: verified accounts in Radio Milwaukee's Google Workspace only. Checked on the
 * server from Google's own profile; the `hd` hint on the sign-in link is a convenience, not the check.
 */
export const STAFF_DOMAIN = "radiomilwaukee.org";

export class NotStaffError extends Error {
  constructor(reason: string) {
    super(`Not a Radio Milwaukee staff account: ${reason}`);
    this.name = "NotStaffError";
  }
}

export function staffIdentity(profile: { email?: unknown; email_verified?: unknown; hd?: unknown; sub?: unknown }): { email: string; sub: string } {
  const { email, email_verified, hd, sub } = profile;
  if (typeof email !== "string" || typeof sub !== "string" || sub === "") throw new NotStaffError("missing email or Google id");
  if (email_verified !== true) throw new NotStaffError("email not verified");
  if (hd !== STAFF_DOMAIN) throw new NotStaffError("not in the Radio Milwaukee Workspace");
  const lower = email.toLowerCase();
  if (!lower.endsWith(`@${STAFF_DOMAIN}`)) throw new NotStaffError("not a radiomilwaukee.org email");
  return { email: lower, sub };
}
