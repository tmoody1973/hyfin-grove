import type { CollectionConfig } from "payload";
import { adminOnly, adminOnlyField, adminOrSelf } from "../lib/access";

export const Users: CollectionConfig = {
  slug: "users",
  admin: {
    useAsTitle: "email",
  },
  auth: true,
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
  ],
};
