import { AuthenticationError, type CollectionBeforeOperationHook } from "payload";
import { isAdmin } from "../access";

/**
 * Password login and "forgot password" are for admins only, so a staff member who leaves is locked out the
 * moment their Google account is turned off (Google-created accounts have a random password nobody knows).
 * Runs on the password `login` operation only; Google sign-in never calls it.
 * - An editor's password login fails with Payload's usual "email or password is incorrect".
 * - An editor's reset request gets the usual "Success" but no email (Payload reads the email before this hook,
 *   so the hook turns the email off rather than changing the address).
 */
export const passwordsForAdminsOnly: CollectionBeforeOperationHook = async ({ args, operation, req }) => {
  if (operation !== "login" && operation !== "forgotPassword") return args;
  // A login with no password goes to Payload's own validation, so the answer can't reveal who is an editor.
  if (operation === "login") {
    const password = (args as { data?: { password?: unknown } }).data?.password;
    if (typeof password !== "string" || password === "") return args;
  }
  const email = String((args as { data?: { email?: unknown } }).data?.email ?? "").toLowerCase().trim();
  if (!email) return args;
  const { docs } = await req.payload.find({ collection: "users", where: { email: { equals: email } }, limit: 1, depth: 0, overrideAccess: true, req });
  const user = docs[0];
  if (!user || isAdmin(user)) return args;
  if (operation === "login") throw new AuthenticationError(req.t);
  return { ...args, disableEmail: true };
};
