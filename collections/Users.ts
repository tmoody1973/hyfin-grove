import type { CollectionConfig } from "payload";
import { adminOnly, adminOnlyField, adminOrSelf } from "../lib/access";
import { passwordsForAdminsOnly } from "../lib/auth/passwordGuard";

export const Users: CollectionConfig = {
  slug: "users",
  admin: {
    useAsTitle: "email",
  },
  // 8 hours: a session outlives a turned-off Google account by at most this long.
  auth: { tokenExpiration: 28_800 },
  hooks: { beforeOperation: [passwordsForAdminsOnly] },
  access: {
    read: adminOrSelf,
    create: adminOnly,
    update: adminOrSelf,
    delete: adminOnly,
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
      saveToJWT: true, // access checks read it from the session, no database lookup
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
