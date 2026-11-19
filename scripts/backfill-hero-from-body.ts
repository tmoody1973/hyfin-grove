/**
 * Give stories with no feature photo the first photo in their text (plan 6b, task 6). Only fills empty fields.
 *   pnpm tsx --env-file=.env.local scripts/backfill-hero-from-body.ts --dry-run
 */
import config from "@payload-config";
import { getPayload } from "payload";
import { firstUploadId } from "@/lib/heroFromBody";

const dryRun = process.argv.includes("--dry-run");

async function main() {
  const payload = await getPayload({ config });
  const { docs } = await payload.find({ collection: "posts", where: { heroImage: { exists: false } }, pagination: false, depth: 0, select: { title: true, body: true } });
  const found = docs.map((d) => ({ id: d.id, title: d.title, photo: firstUploadId(d.body) })).filter((d) => d.photo !== null);
  console.log({ withoutFeaturePhoto: docs.length, photoInText: found.length, dryRun });
  for (const d of found) {
    console.log(`  #${d.id} ← media #${d.photo}: ${d.title.slice(0, 70)}`);
    if (!dryRun) await payload.update({ collection: "posts", id: d.id, data: { heroImage: d.photo }, depth: 0 });
  }
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
