import { Forbidden, type CollectionBeforeChangeHook, type CollectionBeforeOperationHook, type PayloadRequest } from "payload";
import { isAdmin } from "../access";

/** A session lasts this long from sign-in, however often the admin refreshes it (decision 007). */
export const MAX_SESSION_MS = 8 * 3_600_000;

/**
 * Payload's refresh moves a session's expiry forward with no ceiling, so an open admin tab could outlive a
 * turned-off Google account forever. Refuse any refresh once the session is 8 hours old: the person then
 * signs in again, and Google checks them again.
 */
export const sessionsEndAfterEightHours: CollectionBeforeOperationHook = async ({ args, operation }) => {
  if (operation !== "refresh") return args;
  const { req } = args as { req: PayloadRequest };
  const sid = (req.user as { _sid?: string } | null)?._sid;
  if (!req.user || !sid) return args; // Payload refuses a refresh without a session itself
  const user = (await req.payload.db.findOne({ collection: "users", req, where: { id: { equals: req.user.id } } })) as { sessions?: Array<{ id: string; createdAt?: string }> } | null;
  const session = user?.sessions?.find((s) => s.id === sid);
  const started = session?.createdAt ? Date.parse(session.createdAt) : NaN;
  if (!Number.isFinite(started) || Date.now() - started > MAX_SESSION_MS) throw new Forbidden(req.t);
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
