import type { GlobalConfig } from "payload";
import { httpsOrNull } from "../lib/newsletter/content";

/** Admin → Newsletter page (plan 14): /newsletter's pitch. Empty fields keep the default copy (lib/newsletter/content.ts). */
const link = (name: string, label: string, description: string) => ({
  name,
  label,
  type: "text" as const,
  admin: { description },
  validate: (v: unknown) => (v == null || v === "" || httpsOrNull(v) ? true : "Use a full link starting with https://"),
});

export const NewsletterPage: GlobalConfig = {
  slug: "newsletter-page",
  label: "Newsletter page",
  admin: { description: "Everything on /newsletter. Signups go to Mailchimp's HYFIN List. Leave a field empty to keep the current text." },
  access: { read: () => true, update: ({ req }) => Boolean(req.user) },
  fields: [
    { name: "eyebrow", label: "Small label", type: "text" },
    { name: "headline", type: "text" },
    { name: "dek", label: "Intro", type: "textarea" },
    {
      name: "reasons",
      label: "What's inside",
      type: "array",
      maxRows: 4,
      admin: { description: "One block per Signal color. Leave empty to keep today's four." },
      fields: [
        { name: "channel", label: "Color", type: "select", required: true, defaultValue: "white", options: [{ label: "Red", value: "red" }, { label: "Green", value: "green" }, { label: "Blue", value: "blue" }, { label: "White", value: "white" }] },
        { name: "title", type: "text", required: true },
        { name: "body", type: "textarea", required: true },
      ],
    },
    { name: "trust", label: "Trust line", type: "text", admin: { description: "Under the form, e.g. One email to confirm. Unsubscribe anytime." } },
    link("privacyUrl", "Privacy policy link", "Defaults to radiomilwaukee.org/privacy-policy/"),
    link("latestIssueUrl", "Latest issue link (optional)", "A Mailchimp campaign link (Campaigns → the email → Share), shown as \"Read the latest\"."),
  ],
};
