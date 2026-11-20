/**
 * Create the first public form, "Submit music" (plan 13), and its page at /submit-music. Skips anything that
 * already exists, so staff edits are never overwritten. Staff notifications go to FORMS_NOTIFY_TO if set;
 * otherwise add a recipient later in Admin → Forms → Submit music → Emails.
 *   pnpm tsx --env-file=.env.local scripts/seed-forms.ts --dry-run
 */
import config from "@payload-config";
import { getPayload } from "payload";

const dryRun = process.argv.includes("--dry-run");

/** Plain paragraphs as Payload's rich text (Lexical) JSON. */
const rich = (...paras: string[]) => ({
  root: {
    type: "root", format: "", indent: 0, version: 1, direction: "ltr",
    children: paras.map((text) => ({
      type: "paragraph", format: "", indent: 0, version: 1, direction: "ltr", textFormat: 0,
      children: [{ type: "text", text, format: 0, style: "", mode: "normal", detail: 0, version: 1 }],
    })),
  },
});

const GENRES = ["Hip-hop", "R&B", "Soul", "Neo-soul", "Afrobeats", "Jazz", "House and dance", "Gospel", "Something else"];
const slugOf = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function main() {
  const payload = await getPayload({ config });
  const notifyTo = process.env.FORMS_NOTIFY_TO?.trim();

  const found = await payload.find({ collection: "forms", where: { title: { equals: "Submit music" } }, limit: 1, depth: 0 });
  let formId = found.docs[0]?.id ?? null;
  if (!formId && !dryRun) {
    const form = await payload.create({
      collection: "forms",
      data: {
        title: "Submit music",
        submitButtonLabel: "Send my music",
        confirmationType: "message",
        confirmationMessage: rich("Got it. Thanks for sending your music to HYFIN.", "Our music team listens to everything. If it's a fit, we'll reach out by email."),
        fields: [
          { blockType: "text", name: "name", label: "Your name", required: true },
          { blockType: "text", name: "artist", label: "Artist or band name", required: true },
          { blockType: "email", name: "email", label: "Email", required: true },
          { blockType: "text", name: "link", label: "Link to the track (Spotify, SoundCloud, Bandcamp, YouTube…)", required: true },
          { blockType: "select", name: "genre", label: "Genre", required: true, options: GENRES.map((label) => ({ label, value: slugOf(label) })) },
          { blockType: "checkbox", name: "milwaukee", label: "I'm a Milwaukee artist" },
          { blockType: "textarea", name: "about", label: "Tell us about the song" },
        ],
        emails: notifyTo
          ? [{ emailTo: notifyTo, emailFrom: '"HYFIN Forms" <forms@mail.hyfin.org>', replyTo: "{{email}}", subject: "New music submission: {{artist}}", message: rich("A new music submission on hyfin.org:", "{{*:table}}") }]
          : [],
      } as never,
    });
    formId = form.id;
  }

  const page = await payload.find({ collection: "pages", where: { slug: { equals: "submit-music" } }, limit: 1, depth: 0 });
  const pageExists = Boolean(page.docs[0]);
  if (!pageExists && !dryRun && formId) {
    await payload.create({
      collection: "pages",
      data: {
        title: "Submit music",
        slug: "submit-music",
        body: rich(
          "HYFIN plays new Black music: hip-hop, R&B, soul, Afrobeats, jazz, house and everything around them, with Milwaukee artists front and center.",
          "Send us one track. Our music team listens to every submission.",
        ),
        form: formId,
      } as never,
    });
  }
  console.log({ dryRun, formId, formCreated: !found.docs[0] && !dryRun, pageExisted: pageExists, notifies: notifyTo ? "FORMS_NOTIFY_TO" : "nobody yet" });
}
main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
