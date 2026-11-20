/**
 * Fill Admin → Support page with today's copy (plan 10), so staff see the current text instead of empty fields.
 * Only empty sections are filled; anything staff typed is kept. Uploads the member tee photo to Media once.
 *   pnpm tsx --env-file=.env.local scripts/seed-support-page.ts --dry-run
 */
import config from "@payload-config";
import { readFileSync } from "node:fs";
import { getPayload } from "payload";
import { DEFAULT_SUPPORT as D } from "@/lib/supportContent";

const dryRun = process.argv.includes("--dry-run");
const texts = (xs: string[]) => xs.map((text) => ({ text }));

const isEmpty = (v: unknown): boolean =>
  v == null || v === "" || v === false || (Array.isArray(v) ? v.length === 0 : typeof v === "object" && Object.entries(v as object).every(([k, x]) => k === "id" || isEmpty(x)));

async function main() {
  const payload = await getPayload({ config });
  const stored = (await payload.findGlobal({ slug: "support-page", depth: 0 })) as unknown as Record<string, unknown>;

  let teeId: number | null = null;
  const existing = await payload.find({ collection: "media", where: { filename: { equals: "member-tee.jpg" } }, limit: 1, depth: 0 });
  if (existing.docs[0]) teeId = existing.docs[0].id;
  else if (!dryRun && isEmpty(stored.gear)) {
    const data = readFileSync("public/support/member-tee.jpg");
    teeId = (await payload.create({ collection: "media", data: { alt: D.gear.imageAlt, credit: "Nehemiah R. Edwards" }, file: { data, mimetype: "image/jpeg", name: "member-tee.jpg", size: data.length } })).id;
  }

  const defaults: Record<string, unknown> = {
    hero: D.hero,
    share: { ...D.share, perks: texts(D.share.perks) },
    member: { ...D.member, perks: texts(D.member.perks) },
    hyfin100: { ...D.hyfin100, perks: texts(D.hyfin100.perks) },
    plans: D.plans.map(({ tier, price, donateLabel, formId, fallbackUrl }) => ({ tier, price, donateLabel, formId, fallbackUrl })),
    gear: { eyebrow: D.gear.eyebrow, headline: D.gear.headline, body: D.gear.body, image: teeId, facts: D.gear.facts, buttonLabel: D.gear.buttonLabel },
    who: { ...D.who, paragraphs: texts(D.who.paragraphs) },
    pillars: D.pillars,
    impact: { show: false, headline: D.impact.headline, stats: [] },
    social: D.social,
    closing: D.closing,
  };
  const fill = Object.fromEntries(Object.entries(defaults).filter(([k]) => isEmpty(stored[k])));
  console.log({ dryRun, filling: Object.keys(fill), keptAsTyped: Object.keys(defaults).filter((k) => !(k in fill)), teeId });
  if (!dryRun && Object.keys(fill).length) await payload.updateGlobal({ slug: "support-page", data: fill as never });
}
main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
