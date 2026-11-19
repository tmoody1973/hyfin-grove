/** Import WordPress posts by slug. Usage: pnpm import:wp --slug <slug> [--slug <slug> ...]  (loads .env.local) */
import config from "@payload-config";
import { getPayload } from "payload";
import { fetchPostBySlug } from "../lib/wordpress/client";
import { importPost } from "../lib/wordpress/importPost";

const slugs = process.argv.flatMap((arg, i, all) => (arg === "--slug" && all[i + 1] ? [all[i + 1]] : []));
const apiKey = process.env.TYPESAFE_API_KEY;
if (!slugs.length) throw new Error("Pass at least one --slug <slug>");
if (!apiKey) throw new Error("TYPESAFE_API_KEY is not set (add it to .env.local; run via pnpm import:wp, which loads that file)");

const payload = await getPayload({ config });
let failed = 0;
for (const slug of slugs) {
  try {
    const wp = await fetchPostBySlug(slug);
    if (!wp) throw new Error("not found on hyfin.org");
    const r = await importPost(payload, wp, apiKey, (m) => process.stderr.write(`  ${m}\n`));
    process.stdout.write(`${slug}: post ${r.postId} ${r.created ? "created" : "updated"} · ${r.category} (confidence ${r.categoryConfidence.toFixed(2)}${r.needsReview ? ", NEEDS REVIEW" : ""}) · images new ${r.images.uploaded}, reused ${r.images.reused}, failed ${r.images.failed.length}\n`);
  } catch (error) {
    failed++;
    process.stderr.write(`${slug}: FAILED ${(error as Error).message}\n`);
  }
}
process.exit(failed ? 1 : 0);
