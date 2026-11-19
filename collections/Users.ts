import type { CollectionConfig } from "payload";
import { adminOnly, adminOnlyField, adminOrSelf } from "../lib/access";
import { editorsKeepTheirEmail, googleIdMustMatch, sessionsEndAfterEightHours } from "../lib/auth/accountGuards";
import { passwordsForAdminsOnly } from "../lib/auth/passwordGuard";

export const Users: CollectionConfig = {
  slug: "users",
  admin: {
    useAsTitle: "email",
  },
  // 8 hours per token; sessionsEndAfterEightHours caps the whole session at 8 hours from sign-in.
  auth: { tokenExpiration: 28_800 },
  hooks: {
    beforeOperation: [passwordsForAdminsOnly, sessionsEndAfterEightHours],
    beforeChange: [googleIdMustMatch, editorsKeepTheirEmail],
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
