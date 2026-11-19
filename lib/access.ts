import type { Access, FieldAccess } from "payload";

/** Two roles: `admin` (Tarik) manages users and roles; `editor` (every other staff member) edits content. */
export const isAdmin = (user: unknown): boolean =>
  typeof user === "object" && user !== null && (user as { role?: unknown }).role === "admin";

export const adminOnly: Access = ({ req }) => isAdmin(req.user);

/** Admins see and edit every user; anyone else only their own record. */
export const adminOrSelf: Access = ({ req }) => {
  if (!req.user) return false;
  return isAdmin(req.user) ? true : { id: { equals: req.user.id } };
};

export const adminOnlyField: FieldAccess = ({ req }) => isAdmin(req.user);
