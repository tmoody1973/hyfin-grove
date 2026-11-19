/**
 * Seed HYFIN shows and hosts (plan 4, task 6). Exact Cadence names come from rm-playlist's cache, show copy
 * from data/hyfin-lineup.json, host photos and bios from radiomilwaukee.org staff pages. Creates missing rows
 * and fills empty fields only; never overwrites what staff typed.
 *   pnpm tsx --env-file=.env.local scripts/seed-listen.ts --dry-run
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import config from "@payload-config";
import { getPayload, type Payload } from "payload";
import { normalizeName } from "@/lib/listen/attach";
import { planSeed } from "@/lib/listen/seedPlan";
import { profileFromHtml, profileLinks } from "@/lib/listen/staffPage";

type Lineup = { shows: Array<{ slug: string; name: string; description: string; hostSlugs: string[] }>; hosts: Array<{ slug: string; name: string; cadenceHostName: string }> };
type HostSeed = { slug: string; name: string; cadenceHostName: string | null; bio: string | null; photo: number | null };
type ShowSeed = { slug: string; name: string; description: string | null; cadenceProgramName: string | null; hosts: number[] };
const lineup = JSON.parse(readFileSync(path.resolve("data/hyfin-lineup.json"), "utf8")) as Lineup;
const dryRun = process.argv.includes("--dry-run");
const STAFF_PAGE = "https://radiomilwaukee.org/radio-milwaukee-staff";
/** HYFIN's Cadence channel (public: it is in every Cadence widget URL). */
const CADENCE_PROGRAMS = "https://cadence.nprstations.org/api/cadence/widget/61e85d0c-5f85-402a-8898-1fc1206a390a/programs";
/** Looser than normalizeName, for the sheet's spellings: "90's @ Night" ~ "90s at Night". */
const key = (s: string) => normalizeName(s).replace(/@/g, "at").replace(/[^a-z0-9]/g, "");

async function text(url: string): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function uploadOnce(payload: Payload, url: string, alt: string): Promise<number> {
  const { docs } = await payload.find({ collection: "media", where: { sourceUrl: { equals: url } }, limit: 1, depth: 0 });
  if (docs[0]) return docs[0].id;
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`photo HTTP ${res.status}`);
  const data = Buffer.from(await res.arrayBuffer());
  const doc = await payload.create({
    collection: "media",
    data: { alt, sourceUrl: url },
    file: { data, mimetype: res.headers.get("content-type") ?? "image/jpeg", name: `${alt.toLowerCase().replace(/\W+/g, "-")}.jpg`, size: data.length },
  });
  return doc.id;
}

// Every HYFIN program in Cadence, including the lineup that starts 2026-11-27 (no login needed).
const programs = ((JSON.parse(await text(CADENCE_PROGRAMS)) as Array<{ programName: string }>).map((p) => p.programName));
if (programs.length === 0) {
  console.error("Cadence returned no HYFIN programs.");
  process.exit(1);
}
console.log(`Cadence: ${programs.length} HYFIN programs`);

const payload = await getPayload({ config });

// Hosts first: shows link to them.
const links = profileLinks(await text(STAFF_PAGE));
const incomingHosts: HostSeed[] = [];
for (const h of lineup.hosts) {
  const cadenceHostName = h.cadenceHostName;
  const profileUrl = links.get(normalizeName(h.name));
  const profile = profileUrl ? profileFromHtml(await text(profileUrl)) : { photoUrl: null, bio: null };
  console.log(`host ${h.name}: cadence=${cadenceHostName ?? "(no match)"} photo=${profile.photoUrl ? "yes" : "MISSING"} bio=${profile.bio ? "yes" : "none"}`);
  const photo = profile.photoUrl && !dryRun ? await uploadOnce(payload, profile.photoUrl, h.name) : null;
  incomingHosts.push({ slug: h.slug, name: h.name, cadenceHostName, bio: profile.bio, photo });
}
const existingHosts = (await payload.find({ collection: "hosts", pagination: false, depth: 0 })).docs;
const hostPlan = planSeed<HostSeed>(
  existingHosts.map((h) => ({ slug: h.slug, name: h.name, cadenceHostName: h.cadenceHostName ?? null, bio: h.bio ?? null, photo: typeof h.photo === "object" ? h.photo?.id ?? null : h.photo ?? null })),
  incomingHosts,
);

for (const h of hostPlan.create) console.log(`${dryRun ? "would create" : "create"} host ${h.slug}`);
for (const u of hostPlan.update) console.log(`${dryRun ? "would fill" : "fill"} host ${u.slug}: ${Object.keys(u.data).join(", ")}`);
if (!dryRun) {
  for (const h of hostPlan.create) await payload.create({ collection: "hosts", data: { ...h, photo: h.photo ?? undefined, cadenceHostName: h.cadenceHostName ?? undefined, bio: h.bio ?? undefined } });
  for (const u of hostPlan.update) {
    const id = existingHosts.find((e) => e.slug === u.slug)!.id;
    await payload.update({ collection: "hosts", id, data: u.data as Record<string, unknown> });
  }
}

const hostIds = new Map((await payload.find({ collection: "hosts", pagination: false, depth: 0 })).docs.map((h) => [h.slug, h.id]));
const incomingShows: ShowSeed[] = lineup.shows.map((s) => ({
  slug: s.slug,
  name: s.name,
  description: s.description,
  cadenceProgramName: programs.find((p) => key(p) === key(s.name)) ?? null,
  hosts: s.hostSlugs.map((slug) => hostIds.get(slug)).filter((id): id is number => id !== undefined),
}));
for (const s of incomingShows) console.log(`show ${s.name}: cadence=${s.cadenceProgramName ?? "(no match)"}`);
const unmatchedPrograms = programs.filter((p) => !lineup.shows.some((s) => key(s.name) === key(p)));
if (unmatchedPrograms.length) console.log(`Cadence programs with no show page: ${unmatchedPrograms.join(" | ")}`);

const existingShows = (await payload.find({ collection: "shows", pagination: false, depth: 0 })).docs;
const showPlan = planSeed<ShowSeed>(
  existingShows.map((s) => ({ slug: s.slug, name: s.name, description: s.description ?? null, cadenceProgramName: s.cadenceProgramName ?? null, hosts: (s.hosts ?? []).map((h) => (typeof h === "object" ? h.id : h)) })),
  incomingShows,
);
for (const s of showPlan.create) console.log(`${dryRun ? "would create" : "create"} show ${s.slug}`);
for (const u of showPlan.update) console.log(`${dryRun ? "would fill" : "fill"} show ${u.slug}: ${Object.keys(u.data).join(", ")}`);
if (!dryRun) {
  for (const s of showPlan.create) await payload.create({ collection: "shows", data: { ...s, description: s.description ?? undefined, cadenceProgramName: s.cadenceProgramName ?? undefined } });
  for (const u of showPlan.update) {
    const id = existingShows.find((e) => e.slug === u.slug)!.id;
    await payload.update({ collection: "shows", id, data: u.data as Record<string, unknown> });
  }
}
console.log(dryRun ? "dry run: nothing written" : "done");
process.exit(0);
