/**
 * New Music Mondays as a show (plan 6, task 4). hyfin.org has no WordPress category, tag or CDS series for it,
 * so its posts are found by title (isNmmTitle). Creates the show if missing and sets `show` only where empty.
 *   pnpm tsx --env-file=.env.local scripts/assign-nmm.ts --dry-run
 */
import config from "@payload-config";
import { getPayload } from "payload";
import { visible } from "@/lib/postQueries";
import { isNmmTitle } from "@/lib/stories";

const dryRun = process.argv.includes("--dry-run");
const SHOW = {
  slug: "new-music-mondays",
  name: "New Music Mondays",
  description: "Every Monday, the new releases HYFIN is playing: albums, singles and videos worth your time.",
};

async function main() {
  const payload = await getPayload({ config });
  const existing = (await payload.find({ collection: "shows", where: { slug: { equals: SHOW.slug } }, limit: 1, depth: 0 })).docs[0];
  console.log(existing ? `show exists: #${existing.id}` : dryRun ? "would create show" : "creating show");
  const show = existing ?? (dryRun ? null : await payload.create({ collection: "shows", data: SHOW }));

  // Payload `like` matches words, so narrow with it, then apply the exact title rule.
  const { docs } = await payload.find({ collection: "posts", where: visible({ title: { like: "new music monday" } }), pagination: false, depth: 0, select: { title: true, show: true } });
  const matches = docs.filter((p) => isNmmTitle(p.title));
  const empty = matches.filter((p) => !p.show);
  console.log({ candidates: docs.length, nmmTitles: matches.length, alreadyHaveAShow: matches.length - empty.length, toAssign: empty.length });
  for (const p of matches.filter((p) => p.show && p.show !== show?.id)) console.log(`  keeps its show #${String(p.show)}: ${p.title.slice(0, 70)}`);
  if (dryRun || !show) return;
  for (const p of empty) await payload.update({ collection: "posts", id: p.id, data: { show: show.id }, depth: 0 });
  console.log(`assigned ${empty.length} posts to #${show.id}`);
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  },
);
