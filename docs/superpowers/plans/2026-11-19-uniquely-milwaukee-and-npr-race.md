# Plan 6b: Uniquely Milwaukee on the Milwaukee page, and "From NPR: Race" on Culture

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. TDD per task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** (1) Uniquely Milwaukee episodes that Radio Milwaukee tags HYFIN appear as Milwaukee stories on HYFIN, kept current every 15 minutes. (2) The Culture page shows the newest NPR stories on race, live from CDS, credited to NPR and linking to npr.org.

**Why this shape (Tarik, 2026-11-19, chosen from options):**
- Uniquely Milwaukee pages on radiomilwaukee.org are Brightspot `podcast-episode` pages. They carry the HYFIN tag on the site, but are never sent to CDS (their `nprStoryId`s, e.g. `g-s921-18227`, return nothing). The station site does publish `https://radiomilwaukee.org/tags/hyfin.rss` (10 newest HYFIN-tagged items). **Chosen: read that feed.** The feed has title, summary, author, photo, date and link, but no text or audio; the episode's podcast-feed copy in CDS (`fis-718414860-*`, same title and date) has the full description and the MP3.
- NPR's own CDS stories are marked "display-only: attribute via url, refresh regularly, do not store beyond display". **Chosen: a live block**, read from CDS when the page renders and cached 15 minutes, never stored in Payload.

**Tech:** Next.js 16.4.6, Payload 3.94.0, Vitest. Branch `feat/um-and-npr-race`, stacked on plan 6 (`feat/launch-6-home`, PR #14); rebase onto `main` after #14 merges.

## Global constraints
- Only items whose link is under `https://radiomilwaukee.org/podcast/uniquely-milwaukee/` are imported from the station feed. Ladies First and Rhythm Lab items in the same feed already come through CDS; never import them twice.
- Imported episodes: category `milwaukee`, show `uniquely-milwaukee` ("Uniquely Milwaukee"), `source: "station"`. The original radiomilwaukee.org address is kept and linked ("Listen on Radio Milwaukee").
- The station sync never overwrites a field an editor changed after import (category, tags, show), same rule as the CDS sync. Title, summary, photo, date, author, text and audio follow the source.
- A station-feed or CDS failure never fails the 15-minute cron: it is reported in the CDS sync status like the CDS counts.
- NPR stories are never written to the database. Cache ≤ 15 minutes. Each item links to its npr.org address and says "NPR".
- Schema changes: `pnpm payload migrate:create`, read it line by line, `printf 'y\n' | pnpm payload migrate` (shared Neon database; additive only).

## Review focus
1. A feed item whose CDS copy can't be found (or CDS is down): the episode still imports, with the summary as its text and no audio; the next run fills audio in when the copy appears.
2. The same episode in two runs, or with a changed title: one post, updated; never a duplicate (key: the radiomilwaukee.org address).
3. Feed is HTML (site error page), empty, or malformed XML: no posts created or changed; status records the error.
4. NPR block when CDS is down, slow (>4 s) or returns stories without images or canonical links: Culture page still renders; items without an npr.org link are dropped.
5. Titles with `&`, quotes, curly quotes or emoji, from both sources.

---

### Task 1: Decision records
**Files:** Create `docs/decisions/009-uniquely-milwaukee-from-station-feed.md`, `docs/decisions/010-npr-race-display-only.md` (house format: Decision, Why this came up, Options with costs, What we chose and why — Tarik chose, What we gave up, How we'll know, What actually happened left blank).
- [ ] Write both; commit `docs: decisions 009 and 010`.

### Task 2: Posts can come from the station site
**Files:** Modify `collections/Posts.ts` (`source` option `{ label: "Radio Milwaukee site", value: "station" }`; group `station` with `url` (text, unique, indexed, read-only in admin) and `cdsCopyId` (text, read-only)); migration `station_source`.
**Test:** `tests/station/postsSchema.test.ts`: `source` has `station`; `station.url` is unique and indexed.
- [ ] Failing test → implement → migration (read it: an enum value and two nullable columns only) → apply → pass. Commit `feat: posts can come from the Radio Milwaukee site`.

### Task 3: Read the station feed
**Files:** Create `lib/station/feed.ts`, fixture `tests/station/fixtures/hyfin-tag.rss` (the real feed saved 2026-11-19).
**Interfaces:** `type FeedEpisode = { url: string; title: string; summary: string | null; author: string | null; imageUrl: string | null; publishedAt: string }`; `parseStationFeed(xml: string): FeedEpisode[]` (Uniquely Milwaukee items only; throws on non-RSS); `fetchStationFeed(fetchImpl?): Promise<FeedEpisode[]>` (10 s timeout, `cache: "no-store"`).
- [ ] Failing tests: the fixture yields exactly the 3 Uniquely Milwaukee items (Kasi Lemmons, AfterDark, My Way Out) and none of the Ladies First / Rhythm Lab ones; image is the `media:content` URL; date is ISO; `&amp;`/curly quotes decode; an HTML page or empty string throws.
- [ ] Implement without a new dependency (the feed is small and flat; parse with a strict regex per `<item>` or `fast-xml-parser` only if already installed — check `package.json` first). Commit `feat: read Uniquely Milwaukee episodes from the station's HYFIN feed`.

### Task 4: Import them
**Files:** Create `lib/station/sync.ts`, `scripts/station-sync.ts` (`--dry-run`); modify `app/(payload)/api/cron/cds-sync/route.ts` (run after the CDS sync, own try/catch, counts into status), `app/(frontend)/[category]/[slug]/page.tsx` (station posts render `cdsBody` like CDS posts, plus a "Listen on Radio Milwaukee" link to `station.url`).
**Interfaces:** `syncStation(payload, deps: { fetchFeed, findCdsCopy })` → `{ created, updated, unchanged, withoutAudio }`. `findCdsCopy(title, publishedAt)`: CDS query `collectionIds=718414860`, owner s921, ±2 days, exact normalized-title match → `{ id, text, audioUrl } | null`.
- [ ] Failing tests (fake Payload, fake feed, fake CDS): new episode → one post (milwaukee, show Uniquely Milwaukee created once, source station, audio + text from the copy); second run → unchanged; title changed upstream → updated, same post; no copy → imported without audio, summary as text, counted in `withoutAudio`; copy appears later → audio filled; editor-changed category kept.
- [ ] Implement; wire the cron; `pnpm tsx --env-file=.env.local scripts/station-sync.ts --dry-run` → expect 3 to create; run it; check `/milwaukee` and one episode page in dev. Commit `feat: import HYFIN-tagged Uniquely Milwaukee episodes every 15 minutes`.

### Task 5: "From NPR: Race" on the Culture page
**Files:** Create `lib/npr/topic.ts`, `components/stories/FromNpr.tsx`; modify `app/(frontend)/[category]/page.tsx` (Culture, page 1, under `<Suspense fallback={null}>`, after "Latest in Culture").
**Interfaces:** `type NprItem = { id: string; title: string; teaser: string | null; url: string; imageUrl: string | null; publishedAt: string; byline: string | null }`; `getNprTopic(topicId = "1015", limit = 4, fetchImpl?)`: CDS `collectionIds=<topic>&ownerHrefs=s1&profileIds=story&sort=publishDateTime:desc`, `next: { revalidate: 900 }`, 4 s timeout, any failure → `[]`; items without an `https://www.npr.org/` canonical link are dropped.
- [ ] Failing tests: maps a saved CDS response (fixture) to items with npr.org URLs; drops one without a canonical link; failure/timeout → `[]`; `FromNpr` renders nothing for `[]`, shows "NPR" credit and links each item to its npr.org URL; nothing is imported from Payload in `lib/npr/topic.ts` (bundle guard: it never writes).
- [ ] Implement; dev: `/culture` shows the block; with `NPR_CDS_TOKEN` unset the page still renders. Commit `feat: From NPR: Race on the Culture page (display-only)`.

### Task 6: Smoke, README, PR
- [ ] `smoke.yml`: add one imported Uniquely Milwaukee story address (200) once Task 4 has run.
- [ ] README: CDS sync section gains "Station feed" paragraph; Culture row mentions the NPR block; decisions list 009–010.
- [ ] Full suite, typecheck, lint, build; final whole-branch review; PR.
