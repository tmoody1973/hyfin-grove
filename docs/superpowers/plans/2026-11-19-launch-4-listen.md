# Launch plan 4: Listen (playlist, schedule, show and host pages) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Visitors can see every song HYFIN plays as it plays, who is on air this week, and a page for each show and host, all from live data.

**Architecture:** Playlist and schedule are read live from rm-playlist-v2's public Convex queries (never stored in Payload). rm-playlist-v2 gets one new public query that returns real airings (start and end times) so all time-zone and midnight math stays in its already-tested `scheduleLogic.ts`. Payload holds what staff own: show descriptions and artwork, host photos and bios, which win over Cadence text. Pages are server-rendered; only the live playlist and the on-air card subscribe from the browser.

**Tech Stack:** Next.js 16.4.6 App Router, Payload 3.94.0, `convex` 1.51 (`ConvexHttpClient` on the server, `ConvexClient` in the browser, both with `anyApi`), Vitest.

**Spec:** `docs/superpowers/specs/2026-11-18-hyfin-site-launch-design.md` (order of work step 4; "Playlist and events", "Program schedule", "Persistent player", "Pages at launch"). **Design:** Figma `ivuHFQdgrfMAxldRrsq3nP` (wins); HTML fallback `docs/mockups-html/screens/02-listen/{playlist,program-schedule,specialty-show,dj-profile}.html`. **Source material:** `docs/_HYFIN WEEKLY LINE-UP .xlsx` (show descriptions), https://radiomilwaukee.org/radio-milwaukee-staff (host photos and bios; Tarik, 2026-11-19).

## Global Constraints

- Station slug `hyfin`; Convex URL from `NEXT_PUBLIC_RM_PLAYLIST_CONVEX_URL`. This site calls only public queries.
- All times shown in `America/Chicago`, labelled "All times Central" where a schedule is shown.
- Every playlist row shows album artwork (Tarik, 2026-11-19; the mockup omits it). Missing artwork renders a fixed-size square placeholder so rows never shift.
- No listener-account features at launch (spec non-goals): drop the mockups' Follow, Save, "your shelf", favorites, picks, lists, "most favorited".
- Payload Hosts and Shows win over rm-playlist / Cadence text and art when both exist. Cadence's `displayHost` flag stays ignored.
- jsdom never reaches the live server bundle: add every new page to `tests/serverBundle.test.ts`.
- Next 16 has breaking changes: read `node_modules/next/dist/docs/` for routing, `searchParams` and caching before writing pages.
- A failed rm-playlist read never 500s a page: pages render with an explanatory line instead.
- URLs: `/listen/playlist`, `/listen/schedule`, `/shows`, `/shows/<slug>`, `/hosts/<slug>`. `/listen` redirects to `/listen/playlist`.

## Review Focus

1. rm-playlist-v2 unreachable, or the `hyfin` schedule row not yet filled (`refreshedAt: null`): every Listen page answers 200 with a one-line message, never an error page. (Task 2 test `getAirings returns ok:false on network error`; Task 5 test `schedule renders the empty state`.)
2. A show that crosses midnight (Rhythm Lab Radio, Fri 10 pm to 12 am) and the DST change (2026-11-01 is 25 hours, 2026-03-08 is 23): the show sits on Friday, and day windows are the real local day. (Task 1 tests; Task 2 test `chicagoDayRange handles DST days`.)
3. Cadence names that differ from Payload's by case, spacing or a "DJ " prefix: match after normalizing, and when nothing matches, show the Cadence text with no photo rather than the wrong host. (Task 5 test `attachPayload normalizes names and never guesses`.)
4. Real playlist data: missing artwork, very long titles, "feat." credits, an artist with no Milwaukee date. (Task 4 tests.)
5. A search with no hits or with `&`, quotes or accents: "No songs found", the query round-trips through the URL intact. (Task 4 test `search query survives the URL`.)

---

### Task 1: rm-playlist-v2 serves HYFIN airings (separate repo)

**Repo:** `~/Documents/Projects/rm-playlist-v2` (its own branch and PR; Tarik merges; its CI deploys Convex from `main`).

**Files:**
- Modify: `packages/convex/convex/scheduleLogic.ts` (export `occurrencesBetween`; `occurrencesAround` calls it)
- Modify: `packages/convex/convex/alexa.ts` (new public query `stationAirings`)
- Modify: `packages/convex/convex/cadence.ts:281` (`SCHEDULE_STATIONS = ["88nine", "hyfin"] as const`)
- Test: `packages/convex/test/scheduleLogic.test.ts`

**Interfaces:**
- Produces: `alexa:stationAirings({ station: string, fromMs: number, toMs: number })` → `{ refreshedAt: number | null; airings: Array<{ name: string; hosts: string[]; description: string | null; link: string | null; imageUrl: string | null; startsAt: number; endsAt: number }> }`, sorted by `startsAt`, range clamped to 35 days, `{ refreshedAt: null, airings: [] }` when no row.

- [ ] **Step 1: Write failing tests** in `scheduleLogic.test.ts`:
  - `occurrencesBetween puts a 10 pm to midnight show on its start day`: program `{ airtimes: [{ dayOfWeek: 5, startMin: 1320, endMin: 1440 }] }`, range Fri 2026-11-20 00:00 CT to Sun 2026-11-22 00:00 CT → one occurrence, `startsAt` = 2026-11-20T22:00 CT, `endsAt` = 2026-11-21T00:00 CT.
  - `occurrencesBetween is DST-safe`: a Sunday 00:00 to 06:00 program on 2026-11-01 lasts 7 hours of real time.
  - `occurrencesBetween clips to the range`: occurrences ending before `fromMs` or starting at/after `toMs` are excluded.
- [ ] **Step 2:** Run `bun run test packages/convex/test/scheduleLogic.test.ts` (or the repo's documented test command). Expected: FAIL, `occurrencesBetween` not exported.
- [ ] **Step 3:** Implement `occurrencesBetween(programs: readonly ScheduleProgram[], fromMs: number, toMs: number): Occurrence[]` by generalizing `occurrencesAround` (iterate local days from `fromMs - 1 day` to `toMs`, reuse `civilToMs`). Add `stationAirings` in `alexa.ts`, decorating each occurrence with `description`, `link` and `showArt(...)` exactly as `stationSchedule` does. Add `"hyfin"` to `SCHEDULE_STATIONS`.
- [ ] **Step 4:** Run the repo's full test suite and typecheck. Expected: all pass.
- [ ] **Step 5:** Check the HYFIN Cadence channel is configured in the production Convex deployment, by name only: `npx convex env list --prod | cut -d= -f1 | grep CADENCE_CHANNEL_ID_HYFIN`. Expected: one line. If missing, stop and ask Tarik.
- [ ] **Step 6:** Commit, push, open the PR (`feat: cache HYFIN's schedule and serve airings by time range`). **Stop: Tarik merges.** After the deploy and one 15-minute refresh, verify: `npx convex run alexa:stationAirings '{"station":"hyfin","fromMs":<now>,"toMs":<now+7d>}' --prod` returns `refreshedAt` not null and a Friday 10 pm "Rhythm Lab Radio" airing (name as Cadence spells it).

### Task 2: Server reads and time helpers

**Files:**
- Create: `lib/listen/rmPlaylist.ts` (server reads; no `"use client"`)
- Create: `lib/listen/time.ts` (pure)
- Test: `tests/listen/rmPlaylist.test.ts`, `tests/listen/time.test.ts`

**Interfaces:**
- Consumes: `alexa:stationAirings` (Task 1), `plays:searchByStation`, `plays:recentByStation`, `plays:currentByStation` (rm-playlist-v2 `plays.ts`, `PublicPlay`).
- Produces:
  - `type Airing = { name: string; hosts: string[]; description: string | null; link: string | null; imageUrl: string | null; startsAt: number; endsAt: number }`
  - `type Play = { id: string; playedAt: number; artist: string; title: string; album: string | null; artworkUrl: string | null; spotifyTrackId: string | null; appleMusicSongId: string | null; liveEvent: { date: string; venue: string } | null }` (map `liveEvent` from rm-playlist's `LiveEventSummary`; read its shape in `plays.ts`)
  - `type Result<T> = { ok: true; value: T } | { ok: false }`
  - `getAirings(fromMs: number, toMs: number, client?): Promise<Result<{ refreshedAt: number | null; airings: Airing[] }>>`
  - `getPlays(opts: { afterMs?: number; beforeMs?: number; q?: string; limit?: number }, client?): Promise<Result<Play[]>>` (via `searchByStation`, `limit` ≤ 500)
  - `todayKey(now: number): string` (`YYYY-MM-DD` in Chicago), `chicagoDayRange(dateKey: string): { fromMs: number; toMs: number }`, `weekKeys(now: number): string[]` (Mon to Sun of the current Chicago week), `formatTime(ms: number): string` ("2:37 pm"), `formatRange(startMs: number, endMs: number): string` ("12 to 5 pm", "6 am to 12 pm", "10 pm to 12 am"), `isValidDayKey(s: string): boolean`

- [ ] **Step 1: Write failing tests.** `time.test.ts`: `chicagoDayRange handles DST days` (2026-11-01 spans 25 h, 2026-03-08 spans 23 h, 2026-11-19 spans 24 h); `formatRange` matches the three strings above; `weekKeys` for Thu 2026-11-19 returns 2026-11-16 … 2026-11-22; `isValidDayKey` rejects `2026-13-01` and `../x`. `rmPlaylist.test.ts` (inject a fake client): `getAirings returns ok:false on network error`; `getPlays maps PublicPlay to Play` (nulls kept, `_id` → `id`).
- [ ] **Step 2:** `pnpm vitest run tests/listen`. Expected: FAIL (modules missing).
- [ ] **Step 3:** Implement. Use `ConvexHttpClient` + `anyApi` (same `anyApi` style as `lib/nowPlaying.ts`); catch every error into `{ ok: false }` and log it server-side. Time helpers use `Intl.DateTimeFormat` with `timeZone: "America/Chicago"`; no new dependency.
- [ ] **Step 4:** `pnpm vitest run tests/listen`. Expected: PASS.
- [ ] **Step 5:** Commit `feat: read HYFIN airings and plays from rm-playlist`.

### Task 3: Group plays under the show that aired them

**Files:**
- Create: `lib/listen/group.ts`
- Test: `tests/listen/group.test.ts`

**Interfaces:**
- Produces: `groupPlaysByAiring(plays: Play[], airings: Airing[]): Array<{ airing: Airing | null; plays: Play[] }>` (newest group first, plays newest first inside a group; plays outside every airing go in an `airing: null` group per contiguous run).

- [ ] **Step 1: Failing tests:** plays at 2:37 pm and 11:56 am with airings 12 to 5 pm and 6 am to 12 pm → two groups in that order; a play exactly at an airing's `endsAt` belongs to the next airing; plays with no airing → `airing: null`; empty plays → `[]`.
- [ ] **Step 2:** Run, expect FAIL. **Step 3:** Implement. **Step 4:** Run, expect PASS.
- [ ] **Step 5:** Commit `feat: group playlist songs by show`.

### Task 4: Playlist page

**Files:**
- Create: `app/(frontend)/listen/playlist/page.tsx`, `app/(frontend)/listen/page.tsx` (redirect), `components/listen/ListenNav.tsx`, `components/listen/PlayRow.tsx`, `components/listen/OnAirCard.tsx` (client), `components/listen/LivePlaylist.tsx` (client)
- Modify: `next.config.ts` (image hosts for artwork), `tests/serverBundle.test.ts`
- Test: `tests/listen/playRow.test.tsx`, `tests/listen/playlistParams.test.ts`

**Interfaces:**
- Consumes: Task 2 reads and helpers, Task 3 `groupPlaysByAiring`, `PlayButton` / `usePlayer` (live source) from `components/player`.
- Produces: `parsePlaylistParams(sp: Record<string, string | string[] | undefined>, now: number): { day: string; q: string; mkeOnly: boolean }` in `lib/listen/params.ts`; `<PlayRow play={Play} />`; `<ListenNav active="playlist" | "schedule" | "shows" />`.

Page content (mockup `playlist.html`, account features removed):
- On-air card: the current song large (artwork, title, artist, Spotify and Apple Music links when the IDs exist, "In Milwaukee · date · venue" when `liveEvent`), plus "<host or show> until <time>" from the on-now airing, and Listen live. Live-updating in the browser (`ConvexClient.onUpdate` on `plays:currentByStation`, the same pattern as `useNowPlaying`).
- Day picker (last 7 days, "Today · Sat, Oct 3" style), search box ("Search artist or song"), toggle "Only artists with Milwaukee dates".
- Songs grouped under their show heading ("DJ Megan Mathews · 12 to 5 pm") with time, artwork, title, artist, Milwaukee date badge.
- Today: the list live-updates (`LivePlaylist` subscribes to `plays:recentByStation`, limit 100, merged ahead of the server-rendered rows). Other days: server-rendered only.

- [ ] **Step 1: Failing tests.** `playRow.test.tsx`: renders `<img alt="Album art: Umi Says by 6LACK">` when `artworkUrl` is set; renders a placeholder element with the same fixed size and no `<img>` when null; shows "MKE · <date>" only when `liveEvent`; a 300-character title renders in full (no truncation in markup). `playlistParams.test.ts`: `search query survives the URL` (`q=Beyoncé & "Jay-Z"` round-trips); invalid `day` falls back to today; `day` older than 7 days falls back to today; `mke=1` → `mkeOnly: true`.
- [ ] **Step 2:** Run, expect FAIL.
- [ ] **Step 3:** Build the components and page from the Figma frame (HTML fallback above). Query: `getPlays({ afterMs, beforeMs, limit: 500 })` for the day, or `getPlays({ q, limit: 100 })` when searching. No hits → "No songs found". `getPlays` `ok:false` → "The playlist is unavailable right now." List the artwork hostnames seen in 200 recent plays (`npx convex run plays:recentByStation '{"stationSlug":"hyfin","limit":100}' --prod`) and add exactly those to `images.remotePatterns`.
- [ ] **Step 4:** Run the tests, `pnpm tsc --noEmit`, `pnpm lint`. Expected: pass. Add the page to `tests/serverBundle.test.ts`; run it.
- [ ] **Step 5:** Run the dev server on port 3007 and check `/listen/playlist` against the Figma frame at 1440 and 390 wide: today's songs appear with artwork, a new song appears without reload, search for a recent artist finds it, the Milwaukee toggle filters. Screenshot both widths.
- [ ] **Step 6:** Commit `feat: live HYFIN playlist page`.

### Task 5: Schedule page

**Files:**
- Create: `lib/listen/attach.ts`, `app/(frontend)/listen/schedule/page.tsx`, `components/listen/AiringCard.tsx`
- Modify: `tests/serverBundle.test.ts`
- Test: `tests/listen/attach.test.ts`, `tests/listen/weekly.test.ts`

**Interfaces:**
- Consumes: Task 2, Payload `shows` and `hosts`.
- Produces:
  - `normalizeName(s: string): string` (lowercase, trim, collapse spaces, drop a leading "dj ")
  - `attachPayload(airings: Airing[], shows: ShowLite[], hosts: HostLite[]): ScheduledAiring[]` where `ShowLite = { slug: string; name: string; cadenceProgramName: string | null; description: string | null; artworkUrl: string | null }`, `HostLite = { slug: string; name: string; cadenceHostName: string | null; photoUrl: string | null }`, `ScheduledAiring = Airing & { show: ShowLite | null; hostCards: Array<{ name: string; slug: string | null; photoUrl: string | null }>; artUrl: string | null; blurb: string | null }` (Payload artwork and description win; Cadence `imageUrl` and `description` fall back)
  - `weeklyLabel(airings: Airing[]): string | null` ("Fridays, 10 pm to 12 am" when a show airs on exactly one weekday; null otherwise)

Page content (mockup `program-schedule.html`): week tabs Mon to Sun with today marked (`?day=YYYY-MM-DD`), "All times Central", the day's airings in order (time range, art or host photo, name, blurb, "Show page" link when matched, Listen live on the airing on now); "Every week" list of single-weekday shows with `weeklyLabel` and hosts; "Hosts" grid of Payload hosts linking to `/hosts/<slug>`. `export const revalidate = 300`.

- [ ] **Step 1: Failing tests.** `attach.test.ts`: `attachPayload normalizes names and never guesses` (`"DJ Megan Mathews "` matches host `cadenceHostName: "Megan Mathews"`; `"Megan"` matches nothing → host card with `slug: null, photoUrl: null`); Payload description wins over Cadence; Cadence `imageUrl` used when the show has no artwork. `weekly.test.ts`: Friday-only show → "Fridays, 10 pm to 12 am"; a Mon to Thu show → null. Page test `schedule renders the empty state` (`getAirings` → `{ ok: true, value: { refreshedAt: null, airings: [] } }` renders "The schedule is on its way." and no error).
- [ ] **Step 2:** Run, expect FAIL. **Step 3:** Implement and build from Figma. **Step 4:** Tests, typecheck, lint, bundle guard.
- [ ] **Step 5:** Dev server: `/listen/schedule` shows this week's HYFIN programs from the real cache (after Task 1 is live), tabs switch days, the on-now airing is marked. Screenshot.
- [ ] **Step 6:** Commit `feat: HYFIN program schedule page`.

### Task 6: Seed shows and hosts

**Files:**
- Create: `data/hyfin-lineup.json`, `lib/listen/seedPlan.ts`, `scripts/seed-listen.ts`
- Test: `tests/listen/seedPlan.test.ts`

**Interfaces:**
- Consumes: `getAirings` (next 7 days) for exact Cadence program and host names.
- Produces: `planSeed<T extends { slug: string }>(existing: T[], incoming: T[]): { create: T[]; update: Array<{ slug: string; data: Partial<T> }> }` (updates fill only fields that are empty in `existing`; never overwrite a staff edit).

Data:
- `data/hyfin-lineup.json`: the Friday sheet of `docs/_HYFIN WEEKLY LINE-UP .xlsx` transcribed (show, host, description), spelling fixed: "Rythum" → "Rhythm", "Paula Lova" → "Paula Lovo", "Brit" → "Britt". Commit the JSON, not the spreadsheet.
- Host display name, photo and bio from the host's `radiomilwaukee.org/people/<slug>` page, linked from the staff page (read its JSON-LD `Person` or `og:image`; if neither, leave empty). Photos upload to Media (Blob).
- `cadenceProgramName` / `cadenceHostName`: copied exactly from `getAirings`, never typed by hand.

- [ ] **Step 1: Failing tests:** `planSeed` creates missing slugs; fills an empty `description`; leaves a non-empty `description` alone; an incoming null never clears a value.
- [ ] **Step 2:** Run, expect FAIL. **Step 3:** Implement; the script takes `--dry-run` and prints one line per create and update. **Step 4:** Run, expect PASS.
- [ ] **Step 5:** `pnpm tsx --env-file=.env.local scripts/seed-listen.ts --dry-run`. Review: every Cadence program in the week maps to a show or is listed as unmatched; every host has a photo or is listed as missing. Then run it for real (it writes to the shared database; only creates and fills empty fields).
- [ ] **Step 6:** Commit `feat: seed HYFIN shows and hosts from Cadence, the lineup sheet and staff pages`.

### Task 7: Show pages

**Files:**
- Create: `lib/listen/episodes.ts`, `app/(frontend)/shows/page.tsx`, `app/(frontend)/shows/[slug]/page.tsx`
- Modify: `lib/posts.ts` (`getPostsByShow(showId: number, limit: number)` using `visible()`), `tests/serverBundle.test.ts`
- Test: `tests/listen/episodes.test.ts`

**Interfaces:**
- Consumes: Tasks 2, 5 (`attachPayload`, `weeklyLabel`, `normalizeName`), `getPostsByShow`.
- Produces: `episodesFor(airings: Airing[], cadenceProgramName: string, now: number, n: number): Airing[]` (airings of that program that have started, newest first; an in-progress airing comes first).

Page content (mockup `specialty-show.html`, account features removed): name, `weeklyLabel` with hosts, description, Listen live when on now; "Latest episode" tracklist (`getPlays` over the airing's window; `?episode=<startsAt>` selects a past one, validated against `episodesFor`); "Past episodes" (up to 4, links); "Hosted by" cards; "Stories" (posts whose `show` is this show, newest 12; this is where Ladies First CDS stories and WordPress archive episodes appear together). Shows with no Cadence program (editorial series) show description and stories only. Unknown slug → `notFound()`. `/shows` lists every show with art and `weeklyLabel`.

- [ ] **Step 1: Failing tests:** `episodesFor` excludes future airings, puts the in-progress airing first, matches names via `normalizeName`, returns at most `n`.
- [ ] **Step 2–4:** FAIL, implement, PASS; typecheck, lint, bundle guard.
- [ ] **Step 5:** Dev server: `/shows/ladies-first` shows its 23 stories; a show with a Cadence program shows a real latest-episode tracklist. Screenshot.
- [ ] **Step 6:** Commit `feat: show pages with episode tracklists and stories`.

### Task 8: Host pages

**Files:**
- Create: `app/(frontend)/hosts/[slug]/page.tsx`
- Modify: `lib/posts.ts` (`getPostsByByline(name: string, limit: number)`: `byline` `like` name, `visible()`), `tests/serverBundle.test.ts`
- Test: `tests/listen/hostPage.test.ts`

**Interfaces:**
- Consumes: Tasks 2, 5, 7 (`episodesFor`), `getPostsByByline`.

Page content (mockup `dj-profile.html`, account features removed): photo, name, "On air now · until <time>" when one of their airings is live, the shows they host with `weeklyLabel`, bio, Listen live; "Recent sets" (their last 3 airings, linking to `/shows/<slug>?episode=<startsAt>`); "Stories by <name>" (newest 12). Unknown slug → `notFound()`.

- [ ] **Step 1: Failing test:** `getPostsByByline` matches "Paula Lovo" inside "Kenny Perez, Paula Lovo" and excludes withdrawn CDS posts (use the existing posts-query test pattern).
- [ ] **Step 2–4:** FAIL, implement, PASS; typecheck, lint, bundle guard.
- [ ] **Step 5:** Dev server: `/hosts/<element's slug>` shows photo, Ladies First, and her stories. Screenshot.
- [ ] **Step 6:** Commit `feat: host pages`.

### Task 9: Navigation, smoke check, decision record

**Files:**
- Modify: `app/(frontend)/layout.tsx` (Listen nav link → `/listen/playlist`), `.github/workflows/smoke.yml` (add `/listen/playlist` 200, `/listen/schedule` 200, `/listen` 307 or 308)
- Create: `docs/decisions/006-listen-data.md`
- Modify: `docs/LEARNING-LOG.md`

- [ ] **Step 1:** Wire the nav link; add the smoke paths.
- [ ] **Step 2:** Decision 006 (template in `~/.claude/CLAUDE.md`, "What actually happened" left blank): rm-playlist-v2 gets a new airings query instead of the spec's one-line change, because no public query returned the full week; past episodes are inferred from the current weekly pattern, so a show moved in Cadence relabels its older windows; `/hosts/<slug>` instead of the mockup's `/djs/<slug>`, because not every host is a DJ.
- [ ] **Step 3:** Learning log entry: expected `stationSchedule` to serve the week; it serves now/next only.
- [ ] **Step 4:** Full suite, typecheck, lint, `pnpm build`. Expected: pass.
- [ ] **Step 5:** Commit `feat: Listen navigation, smoke paths, decision 006`; open the PR.

## Not in this plan

- Old addresses `/playlist-2/`, `/shows-schedule/`, `/author/...`: the staff Redirects collection exists but nothing serves it yet; plan 7 (old-link check) wires it.
- Artist and track pages: proposed as a post-launch plan (see the hand-off message of 2026-11-19).
- Google Workspace sign-in for the admin: its own plan, after this one, before the beta.
