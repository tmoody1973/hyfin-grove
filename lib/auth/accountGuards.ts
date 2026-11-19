import { Forbidden, type CollectionBeforeChangeHook, type CollectionBeforeOperationHook, type PayloadRequest } from "payload";
import { isAdmin } from "../access";

/** A session lasts at most this long from sign-in, however often the admin refreshes it (decision 007). */
export const MAX_SESSION_MS = 8 * 3_600_000;
/** Each token lasts an hour; refreshes stop once a new token would outlive MAX_SESSION_MS. */
export const TOKEN_SECONDS = 3600;

/**
 * Payload's refresh moves a session's expiry forward with no ceiling, so an open admin tab could outlive a
 * turned-off Google account forever. Refuse any refresh whose new token would end more than 8 hours after
 * sign-in: no token ever outlives the cap, and the person then signs in again, so Google checks them again.
 */
export const sessionsEndAfterEightHours: CollectionBeforeOperationHook = async ({ args, operation }) => {
  if (operation !== "refresh") return args;
  const { req } = args as { req: PayloadRequest };
  const sid = (req.user as { _sid?: string } | null)?._sid;
  if (!req.user || !sid) return args; // Payload refuses a refresh without a session itself
  const user = (await req.payload.db.findOne({ collection: "users", req, where: { id: { equals: req.user.id } } })) as { sessions?: Array<{ id: string; createdAt?: string }> } | null;
  const session = user?.sessions?.find((s) => s.id === sid);
  const started = session?.createdAt ? Date.parse(session.createdAt) : NaN;
  // A refresh issues a fresh TOKEN_SECONDS token; refuse it if that token would end past the cap.
  if (!Number.isFinite(started) || Date.now() + TOKEN_SECONDS * 1000 - started > MAX_SESSION_MS) throw new Forbidden(req.t);
  return args;
};

/**
 * Once a user is tied to a Google account, a different Google account can't take it over (for example an
 * email address reassigned to a new person, who would otherwise inherit the old account and its role).
 */
export const googleIdMustMatch: CollectionBeforeChangeHook = ({ data, originalDoc, operation, req }) => {
  if (operation === "update" && originalDoc?.sub && data?.sub && data.sub !== originalDoc.sub) throw new Forbidden(req?.t);
  return data;
};

/** Editors can't change their own email (they could take over a new hire's first Google sign-in). */
export const editorsKeepTheirEmail: CollectionBeforeChangeHook = ({ data, originalDoc, operation, req }) => {
  const changing = operation === "update" && typeof data?.email === "string" && data.email.toLowerCase() !== String(originalDoc?.email ?? "").toLowerCase();
  if (changing && req.user && !isAdmin(req.user)) throw new Forbidden(req.t);
  return data;
};

/** Editors never have a usable password (decision 007), so they can't set one on their account either. */
export const editorsCantSetPasswords: CollectionBeforeChangeHook = ({ data, req }) => {
  if (typeof data?.password === "string" && data.password !== "" && req.user && !isAdmin(req.user)) throw new Forbidden(req.t);
  return data;
};
