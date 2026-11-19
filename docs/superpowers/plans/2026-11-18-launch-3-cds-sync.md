# Launch 3: CDS Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every 15 minutes, copy HYFIN's stories from NPR CDS into Payload as read-only posts. They then appear on the site, sorted, playable and searchable, with no one touching the admin.

**Architecture:** A Vercel Cron calls a protected route. The route asks CDS for Radio Milwaukee stories in the HYFIN tag or the three HYFIN series. It drops WordPress copies and premium items, then compares what came back with what Payload already holds, and creates, updates or withdraws posts to match. CDS story bodies are stored as the same block list the current `/stories/[id]` page already renders, **not** converted to Lexical rich text. Converting needs an HTML parser (jsdom), and jsdom in the live server is what took production down on 2026-11-18. A sync-status record in Payload (a global) is the heartbeat. An hourly GitHub workflow reads it and fails when the sync stops; a failed workflow emails Tarik.

**Tech Stack:** Next.js 16.4.6, Payload 3.94.0 (Postgres, `push:false` + migrations), Vercel Cron (team plan is Pro, so a 15-minute interval is allowed), Vitest, the existing Jev sorter (`lib/sorting/sortPost.ts`).

**Spec:** `docs/superpowers/specs/2026-11-18-hyfin-site-launch-design.md` (CDS sync; "Category on CDS stories"; anti-goals). Also decision 002 and its terms-of-use addendum, and decision 001.

## Global Constraints

- Load the `payload` skill before Payload work. It applies to everything except new `slug` fields: keep the existing `slug` field and `canonicalSlug` hook.
- Nothing imported by `payload.config.ts` or a page may reach `jsdom`. `tests/serverBundle.test.ts` must stay green, and its walk adds the new cron route as an entry.
- Scope (decision 001, `docs/editor-guide-organizing-hyfin-content.md`): owner `https://organization.api.npr.org/v4/services/s921`, in **any** of these collections: HYFIN tag `g-s921-16131`, Ladies First `g-s921-13049`, In The Mix `g-s921-8151`, La Alternativa `g-s921-3487`. **DJ Takeover `g-s921-1281` is not HYFIN** (Tarik, 2026-11-18). It is synced only if an editor tags a story HYFIN.
- **Never sync a document whose id starts with `hyfin-`.** These are WordPress posts that a WordPress→CDS feed copied in. Checked 2026-11-18: `hyfin-440659`, `-440620`, `-440587` and `-440143` are already imported posts, with `legacy.wpId` = the number.
- Terms of use (002 addendum): skip anything with the `has-premium-audio` profile; audio stays a link (never download MP3s); keep `webPages[canonical]`; a stored document that CDS no longer returns by id is withdrawn.
- Mapping (Tarik, 2026-11-18): Ladies First → **Music**, show `ladies-first` (also a podcast; `podcastFeedUrl` is filled after launch). In The Mix → Music, `in-the-mix`. La Alternativa → Music, `la-alternativa`. HYFIN-tag-only stories → Jev picks category and tags exactly as the archive import did; confidence < 0.7 goes to the review queue.
- Site-owned fields (`category`, `tags`, `show`, `sorting.*`) are set on create only. The sync never overwrites them. CDS-owned fields (`title`, `excerpt`, `cdsBody`, `audio`, `publishedAt`, `byline`, `cds.*`) are locked in the admin and rewritten by the sync.
- Withdrawal hides a post (`cds.withdrawnAt` set, story page 404s). It never deletes rows.
- Secrets: `NPR_CDS_TOKEN`, `CRON_SECRET`, `TYPESAFE_API_KEY` stay server-only and are never logged.
- CDS exact-match filters fail silently (HTTP 200, empty). Every count is preceded by checking one known story: **Ladies First: Qing Madi, `g-s921-17816`**.

## Review Focus

1. **Story HTML from CDS is rendered raw** (`dangerouslySetInnerHTML`, as `/stories/[id]` already does). It is our own Brightspot output, but a pasted `<script>` or `onerror=` would run on hyfin.org. Expect the mapper to strip `<script>`, `<style>`, `on*=` attributes and `javascript:` links (Task 2 test).
2. **CDS returns 0 stories** (token expired, filter silently broken): the sync must not read an empty list as "everything was withdrawn". Expect zero results with stored posts present to count as a failed run, with nothing withdrawn (Task 4 test).
3. **An editor recategorizes a synced post, then the story is edited in Brightspot.** Expect the next sync to update the title and body and keep the editor's category (Task 4 test).
4. **A story is in two scoped collections** (Ladies First and the HYFIN tag). Expect one post, mapped by the series, not by Jev (Task 1 test).
5. **Cron fires twice at once** (a retry overlapping a slow run): `cds.id` is unique, so a duplicate create fails on that row only. Expect the run to log and continue, and the next run to see the row as existing (Task 4 test).

---

### Task 1: Scope and mapping config

**Files:**
- Create: `lib/cds/scope.ts`
- Test: `tests/cds/scope.test.ts`

**Interfaces:**
- Produces:
  - `HYFIN_OWNER: string`
  - `SCOPE_COLLECTION_IDS: readonly string[]` (the four IDs above)
  - `SERIES_MAP: Record<string, { category: Category; showSlug: string; showName: string }>`
  - `isWordPressCopy(id: string): boolean`
  - `mapByCollections(collectionIds: string[]): { category: Category; showSlug: string; showName: string } | null` (the first series hit wins, so a series beats the bare tag)

- [ ] **Step 1: Write the failing tests**
  - `isWordPressCopy("hyfin-440659") === true`; `isWordPressCopy("g-s921-17816") === false`.
  - `mapByCollections(["g-s921-13049","g-s921-16131"])` → `{category:"music", showSlug:"ladies-first", showName:"Ladies First"}`.
  - `mapByCollections(["g-s921-16131","319418027"])` → `null` (tag only, so Jev decides).
  - `mapByCollections(["g-s921-1281"])` → `null` (DJ Takeover is not mapped).
- [ ] **Step 2:** `pnpm test tests/cds/scope.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3:** Implement `lib/cds/scope.ts`. Plain constants only, no imports except the `Category` type from `lib/taxonomy.ts`.
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5:** Commit: `feat: HYFIN CDS scope and series-to-category mapping`.

### Task 2: CDS client and mapper

**Files:**
- Create: `lib/cds/client.ts`, `lib/cds/toPost.ts`, `tests/fixtures/cds/qing-madi.json` (one real document, fetched once and committed; it holds no secrets)
- Modify: `lib/cds.ts` (keep `getStory`/`listStories` working until Task 6 removes their last caller; move `toBody` and the asset helpers into `lib/cds/toPost.ts` and import them back)
- Test: `tests/cds/toPost.test.ts`, `tests/cds/client.test.ts`

**Interfaces:**
- Consumes: Task 1 constants.
- Produces:
  - `fetchScopedDocuments(token: string, fetchImpl?: typeof fetch): Promise<CdsDocument[]>`: pages `limit=100` with `ownerHrefs`, `collectionIds` (all four), `profileIds=story`, `excludedProfileIds=has-premium-audio`, sorted `publishDateTime:desc`; stops at an empty page; drops `isWordPressCopy` ids; throws on a non-2xx response.
  - `fetchByIds(token: string, ids: string[], fetchImpl?): Promise<Set<string>>`: ids CDS still returns, in batches of 50.
  - `toPostData(doc: CdsDocument): CdsPostData`, where `CdsPostData = { cdsId; title; excerpt: string|null; publishedAt: string; byline: string|null; audio: {url; durationSeconds}|null; imageUrl: string|null; canonicalUrl: string|null; editorialLastModified: string; cdsBody: BodyBlock[]; collectionIds: string[]; premium: boolean }`.

- [ ] **Step 1: Write the failing tests** against the fixture:
  - `toPostData(fixture).cdsId === "g-s921-17816"`; `title === "Ladies First: Qing Madi"` (the series prefix stays in the stored title; display trims it as `lib/cds.ts` does today); `audio.durationSeconds === 909`; `audio.url` starts `https://dovetail.prxu.org/`; `canonicalUrl` starts `https://radiomilwaukee.org/show/ladies-first/`.
  - Sanitizing: a text asset `<p onclick="x()">a</p><script>bad()</script><a href="javascript:x">l</a>` becomes HTML with no `onclick`, no `<script>` and no `javascript:`, using string or regex replacement only (no DOM library).
  - Client: with a fake `fetch` returning page 1 = `[g-s921-1, hyfin-9]` and page 2 = `[]`, the result ids are `["g-s921-1"]`. A fake 401 rejects with a message containing `401`.
- [ ] **Step 2:** Run both tests. Expected: FAIL, modules not found.
- [ ] **Step 3:** Implement. `server-only` goes in `client.ts` only (pure `toPost.ts` must stay testable).
- [ ] **Step 4:** Run both tests, plus `pnpm test tests/serverBundle.test.ts`. Expected: PASS.
- [ ] **Step 5:** Commit: `feat: CDS client and story-to-post mapper with HTML sanitizing`.

### Task 3: Posts schema for synced stories

**Files:**
- Modify: `collections/Posts.ts`
- Create: `globals/CdsSyncStatus.ts`, `lib/cds/fieldAccess.ts`, a migration via `printf 'n\n' | pnpm payload migrate:create cds_sync`
- Modify: `payload.config.ts` (register the global)
- Test: `tests/cds/fieldAccess.test.ts`

**Interfaces:**
- Produces on `posts`:
  - group `cds`: `id` (text, unique, indexed), `canonicalUrl`, `imageUrl`, `editorialLastModified` (date), `lastCheckedAt` (date), `withdrawnAt` (date).
  - `cdsBody` (json, hidden in the admin, readOnly).
- Produces the global `cds-sync-status`: `lastRunAt`, `lastSuccessAt`, `lastError` (text), `lastCounts` (json).
- Produces `cdsLocked: FieldAccess` (`({ doc }) => doc?.source !== "cds"`), applied as `access.update` on the CDS-owned fields. The sync writes through the Local API with the default `overrideAccess: true`, so it is not blocked.

- [ ] **Step 1: Write the failing test:** `cdsLocked({doc:{source:"cds"}})` is `false`; `{source:"wordpress"}` is `true`; `undefined` doc (create) is `true`.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3:** Implement the access function, fields, global and migration. Hero: CDS posts keep `heroImage` empty and use `cds.imageUrl` (brightspotcdn is already in `remotePatterns`).
- [ ] **Step 4:** Test PASS. `pnpm exec tsc --noEmit` clean. Apply the migration with `pnpm payload migrate`. Expected: one migration applied; `pnpm payload migrate:status` shows none pending.
- [ ] **Step 5:** Commit: `feat: posts hold synced CDS stories; CDS fields locked in admin`.

### Task 4: The sync engine

**Files:**
- Create: `lib/cds/plan.ts` (pure), `lib/cds/sync.ts` (applies the plan)
- Test: `tests/cds/plan.test.ts`

**Interfaces:**
- Consumes: Tasks 1–3, `sortPost` / `interpretSort` from `lib/sorting/sortPost.ts`.
- Produces:
  - `planSync(remote: CdsPostData[], stored: StoredCds[], stillPresent: Set<string>): SyncPlan`, where `StoredCds = { postId: number; cdsId: string; editorialLastModified: string|null; withdrawnAt: string|null }` and `SyncPlan = { create: CdsPostData[]; update: {postId; data: CdsPostData}[]; withdraw: number[]; restore: number[] }`.
  - `runCdsSync(payload: Payload, env: { token: string; typesafeKey: string }, now?: Date): Promise<SyncCounts>`, where `SyncCounts = { fetched; created; updated; withdrawn; restored; failed; toReview }`.

- [ ] **Step 1: Write the failing tests** for `planSync`:
  - A new id is in `create`.
  - A known id with a newer `editorialLastModified` is in `update`; the same timestamp is in neither list.
  - A stored id missing from `remote` **and** from `stillPresent` is in `withdraw`. Missing from `remote` but present by id (tag removed) is **not** withdrawn.
  - A stored, withdrawn id that is back in `remote` is in `restore`.
  - `remote = []` with stored rows present makes `planSync` throw `"CDS returned no stories"` (Review Focus 2).
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement `planSync`. Then `runCdsSync`:
  1. fetch scoped documents;
  2. load stored CDS posts (`select` only the `cds` group);
  3. `fetchByIds` for stored ids not in the remote list;
  4. plan;
  5. apply each item in its own try/catch (a failed row increments `failed` and logs `cdsId` and the error; a unique-constraint clash counts as failed, not a crash: Review Focus 5).

  Creates set `category`/`show` from `mapByCollections`, find-or-creating the show by slug; otherwise they call `sortPost` and set `sorting.needsReview` + `reasons:["low-confidence"]` below 0.7. Updates send **only** CDS-owned fields (Review Focus 3). Finally, write `cds-sync-status`: `lastSuccessAt` only when `failed === 0`.
- [ ] **Step 4:** Tests PASS. Then a local dry run against the shared database: `pnpm tsx --env-file=.env.local scripts/cds-sync.ts --dry-run` prints the plan counts without writing. Expected: the plan includes `g-s921-17816` in `create`, and no `hyfin-` ids.
- [ ] **Step 5:** Commit: `feat: CDS sync engine (create, update, withdraw, restore)`.

### Task 5: Schedule, route and heartbeat

**Files:**
- Create: `app/(payload)/api/cron/cds-sync/route.ts`, `app/(payload)/api/cron/cds-sync/health/route.ts`, `vercel.json`, `scripts/cds-sync.ts`, `.github/workflows/cds-heartbeat.yml`
- Modify: `.env.example` (`CRON_SECRET=`), `tests/serverBundle.test.ts` (add the route as an entry)

**Interfaces:**
- `GET /api/cron/cds-sync`: 401 unless `Authorization: Bearer ${CRON_SECRET}`; otherwise runs `runCdsSync`, answering 200 + counts, or 500 + a message (no secrets). `maxDuration = 300`.
- `GET /api/cron/cds-sync/health`: public; 200 `{ok:true, lastSuccessAt}` when `lastSuccessAt` is under 60 minutes old, else 503 `{ok:false, lastSuccessAt, lastError}`. `lastError` is truncated to 200 characters.
- `vercel.json`: `{"crons":[{"path":"/api/cron/cds-sync","schedule":"*/15 * * * *"}]}`.
- `scripts/cds-sync.ts`: same engine from the terminal; `--dry-run` prints the plan only.
- Heartbeat workflow: `schedule: '17 * * * *'` and `workflow_dispatch`; `curl -fsS` the production health URL; a non-2xx fails the job.

- [ ] **Step 1: Write the failing test** (`tests/cds/route.test.ts`): calling the route handler without the header returns 401; with a wrong bearer it returns 401. The engine is injected, so no network is used.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. Add `CRON_SECRET` to Vercel (Production + Preview) with `openssl rand -hex 32 | vercel env add CRON_SECRET production` (and the same for `preview`). Never echo it.
- [ ] **Step 4:** Tests and `serverBundle` PASS. Then `pnpm build` succeeds.
- [ ] **Step 5:** Commit: `feat: run the CDS sync every 15 minutes with an hourly heartbeat check`.

### Task 6: Show synced stories on the site

**Files:**
- Modify: `app/(frontend)/[category]/[slug]/page.tsx`, `lib/posts.ts` (exclude `cds.withdrawnAt` posts)
- Create: `components/story/CdsBody.tsx` (moved from `stories/[id]/page.tsx`'s block renderer)
- Modify: `app/(frontend)/stories/[id]/page.tsx` → `permanentRedirect` to the synced post's `postPath`, else 404
- Delete: `listStories`/`getStory` in `lib/cds.ts` once nothing imports them
- Test: `tests/cds/storyRoute.test.ts`

- [ ] **Step 1: Write the failing tests:** `getPostBySlug` ignores a post with `cds.withdrawnAt` set (mock the payload `find` and assert the `where` contains `cds.withdrawnAt: { exists: false }`); the `/stories/g-s921-17816` lookup maps to `/music/<slug>`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. A post with `source:"cds"` renders `cdsBody` through `CdsBody`, `cds.imageUrl` as the hero, the existing `PlayButton` when `audio.url` is set, and "Originally published at radiomilwaukee.org" linking `cds.canonicalUrl`.
- [ ] **Step 4:** Tests PASS. Dev server on port 3007: `curl -s localhost:3007/stories/g-s921-17816 -o /dev/null -w '%{http_code} %{redirect_url}'`. Expected: `308 …/music/ladies-first-qing-madi`. That page shows the audio player and no script tags.
- [ ] **Step 5:** Commit: `feat: synced CDS stories render on story pages; old /stories links redirect`.

### Task 7: First production run, records, verification

**Files:**
- Create: `docs/decisions/005-cds-sync-design.md` (the "What actually happened" section stays blank for Tarik)
- Modify: `docs/LEARNING-LOG.md`

- [ ] **Step 1: STOP and ask Tarik** before the first real run: it writes to the shared production database. Show the dry-run counts.
- [ ] **Step 2:** On "go": `pnpm tsx --env-file=.env.local scripts/cds-sync.ts`. Expected: `failed: 0`. `created` equals the dry-run plan. `g-s921-17816` exists as a post in category `music`, show `ladies-first`.
- [ ] **Step 3:** Duplicates check: zero posts share a title within 3 days across `source` values (query and print the count). Expected: 0.
- [ ] **Step 4:** After merge and deploy: the Vercel cron runs once (`vercel logs` shows the route at :00/:15/:30/:45); `/api/cron/cds-sync/health` answers 200; triggering `cds-heartbeat` by hand passes.
- [ ] **Step 5:** Decision 005: (a) bodies stored as blocks, not Lexical, (b) Vercel Cron plus a GitHub heartbeat, (c) skipping `hyfin-` copies. Each gets its options, cost and what we gave up. Add a learning-log entry for the CDS-holds-WordPress-copies finding. Commit: `docs: decision 005 CDS sync design; learning log`.
