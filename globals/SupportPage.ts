import type { Field, GlobalConfig } from "payload";

/**
 * Admin → Support page (plan 10). Every field is optional: anything left empty shows today's copy
 * (lib/supportContent.ts DEFAULT_SUPPORT), so the page never goes blank.
 */
const t = (name: string, label?: string, description?: string): Field => ({ name, label, type: "text", admin: description ? { description } : undefined });
const ta = (name: string, label?: string): Field => ({ name, label, type: "textarea" });
const texts = (name: string, label: string, description?: string): Field => ({ name, label, type: "array", admin: description ? { description } : undefined, fields: [{ name: "text", type: "text", required: true }] });
const card = (name: string, label: string, extra: Field[]): Field => ({ name, label, type: "group", fields: [t("title"), t("sub", "Line under the title"), texts("perks", "Perks"), ...extra] });

const GIVE = /^https:\/\/funraise\.org\/give\/Radio-Milwaukee\/[A-Za-z0-9-]+\/?$/;

export const SupportPage: GlobalConfig = {
  slug: "support-page",
  label: "Support page",
  admin: { description: "Everything on /support. Leave a field empty to keep the current text." },
  access: { read: () => true, update: ({ req }) => Boolean(req.user) },
  fields: [
    {
      type: "tabs",
      tabs: [
        { label: "Top", fields: [{ name: "hero", type: "group", fields: [t("eyebrow", "Small label"), t("headline"), ta("dek", "Intro")] }] },
        {
          label: "Ways in",
          fields: [
            card("share", "Share the love (red)", [t("buttonLabel", "Button")]),
            card("member", "Become a member (green)", [t("planName", "Name on the checkout panel", "e.g. HYFIN Member")]),
            card("hyfin100", "Join HYFIN100 (blue)", [t("planName", "Name on the checkout panel", "e.g. HYFIN100")]),
            {
              name: "plans",
              label: "Prices and Funraise forms",
              type: "array",
              maxRows: 6,
              admin: { description: "Up to 3 per card. Leave empty to keep today's four. The form number and link come from Funraise (Forms → the form's page)." },
              fields: [
                { name: "tier", type: "select", required: true, options: [{ label: "Become a member", value: "member" }, { label: "Join HYFIN100", value: "hyfin100" }] },
                { type: "row", fields: [t("price", "Price label", "e.g. $10 / month"), t("donateLabel", "Donate button", "e.g. Donate $10 monthly")] },
                {
                  name: "formId",
                  label: "Funraise form number",
                  type: "number",
                  required: true,
                  validate: (v: unknown) => (Number.isInteger(v) && (v as number) > 0 ? true : "A whole number from Funraise, like 45703."),
                },
                {
                  name: "fallbackUrl",
                  label: "Funraise giving page (used if the form can't open)",
                  type: "text",
                  required: true,
                  validate: (v: unknown) => (typeof v === "string" && GIVE.test(v.trim()) ? true : "Use a Radio Milwaukee Funraise link: https://funraise.org/give/Radio-Milwaukee/…"),
                },
              ],
            },
          ],
        },
        {
          label: "Member gear",
          fields: [
            {
              name: "gear",
              type: "group",
              fields: [
                t("eyebrow", "Small label"),
                t("headline"),
                ta("body"),
                { name: "image", type: "upload", relationTo: "media", admin: { description: "The tee photo. Its alt text comes from the media library." } },
                { name: "facts", type: "array", fields: [{ type: "row", fields: [{ name: "label", type: "text", required: true }, { name: "value", type: "text", required: true }] }] },
                t("buttonLabel", "Button"),
              ],
            },
          ],
        },
        {
          label: "About",
          fields: [
            { name: "who", label: "Who we are", type: "group", fields: [t("eyebrow", "Small label"), t("headline"), texts("paragraphs", "Paragraphs")] },
            { name: "pillars", type: "group", fields: [t("headline"), { name: "items", label: "Pillars", type: "array", fields: [t("title"), ta("body")] }] },
            {
              name: "impact",
              label: "Impact numbers",
              type: "group",
              fields: [
                { name: "show", label: "Show this section", type: "checkbox", defaultValue: false },
                t("headline"),
                { name: "stats", type: "array", maxRows: 6, fields: [{ type: "row", fields: [t("value", "Number", "e.g. 10K+"), t("label", "What it counts"), t("note", "Small print")] }] },
              ],
            },
          ],
        },
        {
          label: "Social and closing",
          fields: [
            {
              name: "social",
              type: "group",
              fields: [t("eyebrow", "Small label"), t("headline"), ta("body"), { name: "links", type: "array", fields: [{ type: "row", fields: [t("network"), t("handle"), t("url", "Link (https://…)")] }] }],
            },
            { name: "closing", type: "group", fields: [t("headline"), ta("body"), t("buttonLabel", "Button"), t("tagline"), t("legalLine", "Legal line", "e.g. Radio Milwaukee is a 501(c)(3) nonprofit, EIN …")] },
            { name: "thanks", label: "Thank-you screen", type: "group", fields: [t("fulfillmentLine", "Tee shipping line", "Shown after a gift, e.g. Tees ship within two weeks.")] },
          ],
        },
      ],
    },
  ],
};
