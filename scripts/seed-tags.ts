/** Upsert the draft tag list by slug. Safe to rerun. Usage: pnpm seed:tags  (loads .env.local) */
import config from "@payload-config";
import { getPayload } from "payload";
import { SEED_TAGS } from "../lib/taxonomy";

const payload = await getPayload({ config });
for (const tag of SEED_TAGS) {
  const { docs } = await payload.find({ collection: "tags", where: { slug: { equals: tag.slug } }, limit: 1 });
  if (docs[0]) await payload.update({ collection: "tags", id: docs[0].id, data: tag });
  else await payload.create({ collection: "tags", data: tag });
}
const { totalDocs } = await payload.count({ collection: "tags" });
process.stdout.write(`tags: ${totalDocs}\n`);
process.exit(0);
