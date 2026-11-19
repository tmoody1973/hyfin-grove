import type { CollectionConfig } from "payload";
import { adminOnly, adminOnlyField, adminOrSelf } from "../lib/access";
import { editorsCantSetPasswords, editorsKeepTheirEmail, googleIdMustMatch, sessionsEndAfterEightHours, TOKEN_SECONDS } from "../lib/auth/accountGuards";
import { passwordsForAdminsOnly } from "../lib/auth/passwordGuard";

export const Users: CollectionConfig = {
  slug: "users",
  admin: {
    useAsTitle: "email",
  },
  // One-hour tokens; sessionsEndAfterEightHours stops refreshes so nothing outlives 8 hours from sign-in.
  auth: { tokenExpiration: TOKEN_SECONDS },
  hooks: {
    beforeOperation: [passwordsForAdminsOnly, sessionsEndAfterEightHours],
    beforeChange: [googleIdMustMatch, editorsKeepTheirEmail, editorsCantSetPasswords],
  },
  access: {
    read: adminOrSelf,
    create: adminOnly,
    update: adminOrSelf,
    delete: adminOnly,
    unlock: adminOnly, // otherwise any editor could reset the lockout on the admin's password
  },
  fields: [
    // Email added by default
    {
      name: "role",
      type: "select",
      options: [
        { label: "Admin", value: "admin" },
        { label: "Editor", value: "editor" },
      ],
      defaultValue: "editor",
      required: true,
      saveToJWT: true, // also in the token; access checks use the user loaded from the database each request
      access: { create: adminOnlyField, update: adminOnlyField },
      admin: { position: "sidebar", description: "Editors edit content. Admins also manage users and roles." },
    },
    {
      // Google's account id, set only by Google sign-in (payload-oauth2 reuses this field). Defined here so the
      // schema is the same whether or not the Google keys are configured.
      name: "sub",
      type: "text",
      index: true,
      access: { create: () => false, update: () => false },
      admin: { readOnly: true, position: "sidebar", description: "Google account id (set by Sign in with Google)." },
    },
  ],
};
