/**
 * Request every old hyfin.org address from the Google Analytics export and report where each lands (plan 7).
 *   pnpm tsx scripts/check-old-links.ts --csv docs/Pages_and_screens_Page_path_and_screen_class.csv [--base https://…] [--only page,tag]
 * The CSV and the report never go into git (public repo): the report is written to .superpowers/link-check/.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { classify, isExcluded, judge, parseExclusions, parseGaCsv, type Landing } from "@/lib/linkcheck";

const arg = (name: string, fallback?: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : fallback;
};
const base = (arg("base", "https://hyfin-grove.vercel.app") as string).replace(/\/+$/, "");
const csvPath = arg("csv");
if (!csvPath) throw new Error("--csv <path to the GA export> is required");
const only = arg("only")?.split(",");
const exclusions = parseExclusions(readFileSync("data/link-check-exclusions.txt", "utf8"));
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

async function land(path: string): Promise<Landing> {
  let url = new URL(path, base).toString();
  for (let hops = 0; hops <= 5; hops++) {
    let res: Response;
    try {
      res = await fetch(url, { redirect: "manual", headers: { "User-Agent": "hyfin-link-check", ...(bypass ? { "x-vercel-protection-bypass": bypass } : {}) }, signal: AbortSignal.timeout(30_000) });
    } catch {
      return { status: 0, hops, finalUrl: url };
    }
    // Discard the body without waiting: a streamed page can keep cancel() pending.
    void res.body?.cancel().catch(() => {});
    const next = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && next) url = new URL(next, url).toString();
    else return { status: res.status, hops, finalUrl: url };
  }
  return { status: 0, hops: 6, finalUrl: url };
}

async function main() {
  const rows = parseGaCsv(readFileSync(csvPath!, "utf8")).map((r) => ({ ...r, kind: classify(r.path) })).filter((r) => !only || only.includes(r.kind));
  const results: Array<(typeof rows)[number] & Landing & { verdict: string }> = [];
  for (let i = 0; i < rows.length; i += 8) {
    const batch = await Promise.all(rows.slice(i, i + 8).map(async (r) => {
      // A hard cap per address, so one stuck response can never stall the whole run.
      const l = await Promise.race([land(r.path), new Promise<Landing>((ok) => setTimeout(() => ok({ status: 0, hops: 0, finalUrl: "timeout" }), 60_000))]);
      const verdict = judge(l, base) === "pass" ? "pass" : isExcluded(r.path, exclusions) ? "excluded" : "fail";
      return { ...r, ...l, verdict };
    }));
    results.push(...batch);
  }
  const table = new Map<string, { n: number; pass: number; excluded: number; fail: number; failViews: number }>();
  for (const r of results) {
    const t = table.get(r.kind) ?? { n: 0, pass: 0, excluded: 0, fail: 0, failViews: 0 };
    t.n++;
    t[r.verdict as "pass" | "excluded" | "fail"]++;
    if (r.verdict === "fail") t.failViews += r.views;
    table.set(r.kind, t);
  }
  console.log(`base ${base} · ${results.length} addresses`);
  console.table(Object.fromEntries([...table].sort((a, b) => b[1].n - a[1].n)));
  const fails = results.filter((r) => r.verdict === "fail");
  console.log(`FAIL ${fails.length} · excluded ${results.filter((r) => r.verdict === "excluded").length} · pass ${results.filter((r) => r.verdict === "pass").length}`);
  mkdirSync(".superpowers/link-check", { recursive: true });
  const out = `.superpowers/link-check/${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.csv`;
  const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
  writeFileSync(out, ["path,views,kind,verdict,status,hops,final", ...results.map((r) => [q(r.path), r.views, r.kind, r.verdict, r.status, r.hops, q(r.finalUrl)].join(","))].join("\n"));
  console.log(`report: ${out}`);
  process.exitCode = fails.length ? 1 : 0;
}

main();
