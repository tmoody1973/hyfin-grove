import type { Field, GlobalConfig } from "payload";

const lead = (name: string, label: string): Field => ({
  name,
  label,
  type: "relationship",
  relationTo: "posts",
  admin: { description: "Leave empty to lead with the newest story that has an image." },
});

/** Editors pin the lead story for the homepage and each section; empty pins fall back to the newest story with an image. */
export const FrontPage: GlobalConfig = {
  slug: "front-page",
  label: "Front page",
  access: { read: () => true, update: ({ req }) => Boolean(req.user) },
  fields: [
    lead("homeLead", "Homepage lead"),
    lead("musicLead", "Music lead"),
    lead("cultureLead", "Culture lead"),
    lead("milwaukeeLead", "Milwaukee lead"),
  ],
};
