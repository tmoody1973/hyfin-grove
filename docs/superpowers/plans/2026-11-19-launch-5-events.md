# Launch plan 5: Events (list and event pages) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Visitors can see upcoming concerts by artists HYFIN plays in Milwaukee, Chicago and Madison, open a page for each show, and get tickets; playlist concert rows link to those pages.

**Architecture:** Concerts are read live from rm-playlist-v2 (never stored in Payload, spec "Playlist and events"). The list comes from its public `concerts:upcomingByStation` (every upcoming date for artists in HYFIN's last 30 days of rotation, refreshed every 3 hours). rm-playlist-v2 gets two additive changes: `metro` and `playCount` on that query's rows, and a public `concerts:eventById` so an event page works for any event, including past ones reached from an old link. Event pages add HYFIN's own context (recent plays, stories) and schema.org event data for search.

**Tech Stack:** Next.js 16.4.6, Payload 3.94.0, `convex` 1.51 (`ConvexHttpClient`), Vitest; rm-playlist-v2 (Convex, bun test).

**Spec:** `docs/superpowers/specs/2026-11-18-hyfin-site-launch-design.md` (Goals 5; "Playlist and events"; order of work step 5). **Design:** Figma `ivuHFQdgrfMAxldRrsq3nP` (wins); HTML fallback `docs/mockups-html/screens/06-events-and-win/events-calendar.html`. **Earlier work this builds on:** plan 4 (`lib/listen/rmPlaylist.ts` `read()`/`Result`, `EventRow`, `PlayRow`, time helpers).

## Global Constraints

- Station `hyfin`; Convex URL `NEXT_PUBLIC_RM_PLAYLIST_CONVEX_URL`; public queries only. Live Convex deployment is `precise-fish-444` (labelled "dev"; CI deploys rm-playlist-v2 `main` there).
- Concerts are not stored in Payload. A failed read never 500s a page; it renders a one-line message.
- All dates and times in `America/Chicago`. A date-only event (`dateOnly: true`) is stored as that date at midnight UTC: show its UTC date and "Time TBA" (`formatEventDate` from plan 4 already does the date).
- Metros: Milwaukee, Chicago, Madison (rm-playlist's names; Gary and Rosemont belong to Chicago).
- Ticket links are buttons only when `https?://` (reuse `safeTicketUrl` from `components/listen/EventRow.tsx`, moved to `lib/events/links.ts`). No ticket button for a passed or cancelled show.
- Concert rows use the site's live red (#ff0040), as in the playlist (Tarik, 2026-11-19).
- Not in this plan: "HYFIN Presents" and "Giveaways" filters from the mockup (no data source yet: HYFIN's own events will be entered by hand as custom events in rm-playlist-v2, Tarik 2026-11-19, then the filter is a follow-up; giveaways are the post-launch "Win" section); old WordPress event/venue URLs (plan 7 redirects them to `/events`); site search across events (spec: not at launch).
- jsdom never in the live bundle: add new pages to `tests/serverBundle.test.ts`.

## Review Focus

1. An event page reached from an old or shared link after the show: page still answers, says "This show has passed", no Tickets button, `robots: noindex`. A cancelled or postponed show says so. A garbage id is a 404, never a 500. (Task 1 `eventById` tests; Task 4 `eventState` tests.)
2. Date-only events and the DST change: a date-only Dec 4 show reads "Dec 4 · Time TBA" on every page, and the calendar puts it on Dec 4 (not Dec 3). (Task 2 tests.)
3. rm-playlist unreachable or HYFIN's cache empty: `/events` answers 200 with "Concerts are unavailable right now" or "No upcoming shows"; an event page shows "unavailable" with `noindex`. (Task 2 `ok:false` test; Task 3 empty-state test.)
4. Bad `?metro=`, `?month=` (past, far future, `../x`): fall back to all metros and the current month. (Task 3 params tests.)
5. Real event data: `*SOLD OUT*` titles, no title (fall back to "<artist> live"), no image (placeholder), very long lineups, the same artist on several dates. (Task 3 and 4 render tests.)

---

### Task 1: rm-playlist-v2 — metro, play count, and one event by id (separate repo)

**Repo:** `~/Documents/Projects/rm-playlist-v2`. Work in a worktree from `origin/main` (the main checkout has someone's local changes; leave it alone). Tarik merges; CI deploys.

**Files:**
- Modify: `packages/convex/convex/concerts.ts`
- Test: `packages/convex/test/concerts.test.ts` (use `test/fakeDb.ts` if it fits; otherwise test an extracted pure helper)

**Interfaces:**
- Produces:
  - `concerts:upcomingByStation` rows gain `metro: string` and `playCount: number`, copied from the cached show (additive; the widget ignores unknown fields).
  - `concerts:eventById({ eventId: string })` → `(LiveEventSummary & { status: "scheduled" | "cancelled" | "postponed" | "rescheduled" | null; region: string }) | null`. Validates the id with `ctx.db.normalizeId("events", eventId)` (bad id → `null`, never a throw); follows `duplicateOf` to the canonical event; returns past and cancelled events (the page decides what to show). `matchedArtistName` = first headliner; `role` = "headliner".

- [ ] **Step 1: Failing tests:** `upcomingByStation` rows carry `metro` and `playCount` from the cache; `eventById` returns a past event; returns the canonical event for a duplicate id; returns `null` for `"not-an-id"` and for a well-formed id that doesn't exist; includes `status: "cancelled"` for a cancelled event.
- [ ] **Step 2:** `cd packages/convex && bun test test/concerts.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement. Reuse `toLiveEventSummary`.
- [ ] **Step 4:** Run the repo's CI checks: `bun run typecheck`, `bunx eslint packages/convex/convex`, `bun run format:check`, `bun run test`. Expected: all pass (lint warnings in untouched files are pre-existing).
- [ ] **Step 5:** Commit, push, open the PR (`feat: metro and play count on station concerts; public event lookup by id`), noting both changes are additive. **Stop: Tarik merges.** Verify after deploy: `npx convex run concerts:eventById '{"eventId":"<an id from upcomingByStation>"}'` returns the event; `concerts:upcomingByStation '{"stationSlug":"hyfin"}'` rows have `metro`.

### Task 2: Concert reads and date helpers

**Files:**
- Create: `lib/events/rmEvents.ts`, `lib/events/links.ts`, `lib/events/calendar.ts`
- Modify: `lib/listen/rmPlaylist.ts` (export `read` and `QueryClient` for reuse), `components/listen/EventRow.tsx` (import `safeTicketUrl` from `lib/events/links.ts`)
- Test: `tests/events/rmEvents.test.ts`, `tests/events/calendar.test.ts`

**Interfaces:**
- Consumes: Task 1 queries; plan 4 `read`, `Result`, `todayKey`, `formatEventDate`.
- Produces:
  - `type Concert = { id: string; title: string; artist: string; headliners: string[]; supports: string[]; venue: string; city: string; region: string | null; metro: string | null; startsAtMs: number; dateOnly: boolean; doorsAt: number | null; genre: string | null; imageUrl: string | null; ticketUrl: string | null; playCount: number | null; status: string | null }` (`title` falls back to `` `${artist} live` ``)
  - `getConcerts(client?): Promise<Result<Concert[]>>` (sorted by `startsAtMs`), `getConcert(id: string, client?): Promise<Result<Concert | null>>`
  - `safeTicketUrl(url: string | null): string | null`; `eventPath(id: string): string` (`/events/<id>`)
  - `concertDayKey(c: Pick<Concert, "startsAtMs" | "dateOnly">): string` (UTC date for date-only, Chicago date otherwise); `formatConcertWhen(c): string` ("Fri, Dec 4 · 8 pm", or "Fri, Dec 4 · Time TBA")
  - `METROS = ["Milwaukee", "Chicago", "Madison"] as const`

- [ ] **Step 1: Failing tests:** `getConcerts` maps rows (title fallback, `metro`/`playCount` null when absent) and returns `{ ok: false }` on error; `getConcert("x")` returns `{ ok: true, value: null }` when the query returns null; `concertDayKey` puts a date-only `2026-12-04T00:00Z` show on `2026-12-04` and a timed `2026-12-05T02:00Z` show on `2026-12-04`; `formatConcertWhen` gives "Fri, Dec 4 · 8 pm" and "Fri, Dec 4 · Time TBA"; `safeTicketUrl` rejects `javascript:` and accepts `https://`.
- [ ] **Step 2–4:** FAIL, implement, PASS (`pnpm vitest run tests/events tests/listen`).
- [ ] **Step 5:** Commit `feat: read HYFIN concerts from rm-playlist`.

### Task 3: The events page

**Files:**
- Create: `app/(frontend)/events/page.tsx`, `components/events/ConcertRow.tsx`, `components/events/MonthCalendar.tsx`, `lib/events/params.ts`
- Modify: `tests/serverBundle.test.ts`
- Test: `tests/events/params.test.ts`, `tests/events/concertRow.test.ts`

**Interfaces:**
- Consumes: Task 2.
- Produces: `parseEventsParams(sp, now): { metro: (typeof METROS)[number] | null; month: string }` (`month` = `YYYY-MM`, current month through 5 months ahead, else current); `eventsHref(p): string`.

Page (mockup `events-calendar.html`, minus the two deferred filters): title "Events", lede "Concerts by artists HYFIN plays, in Milwaukee, Chicago and Madison."; metro tabs All / Milwaukee / Chicago / Madison (`?metro=`); a month calendar (`?month=`, ← → between months that have shows) with days that have shows marked and linking to that day's spot in the list; "Coming up" list grouped by day: image (placeholder if none), date and time, title linking to the event page, venue · city, supports, an "In rotation · N plays" badge when `playCount`, Tickets. Empty: "No upcoming shows for these artists right now." Unavailable: "Concerts are unavailable right now." Per-request (`connection()`), like the Listen pages.

- [ ] **Step 1: Failing tests:** params: bad metro → null, `milwaukee` → "Milwaukee", past or 6-months-out month → current, `../x` → current; `ConcertRow` renders the event link `/events/<id>`, "Time TBA" for date-only, the play-count badge only when present, no Tickets for a non-http link, a 200-character title in full, a placeholder when no image.
- [ ] **Step 2–4:** FAIL, implement and build from Figma (HTML fallback), PASS; typecheck, lint, bundle guard.
- [ ] **Step 5:** Dev server (port 3007): `/events` shows today's real concerts; metro tabs filter; calendar marks the right days; screenshot at 1440 and 390. Commit `feat: events page`.

### Task 4: Event pages

**Files:**
- Create: `app/(frontend)/events/[id]/page.tsx`, `lib/events/eventPage.ts`
- Modify: `lib/posts.ts` (`getPostsMentioning(name: string, limit: number)`: title `like` name, `visible()`), `tests/serverBundle.test.ts`
- Test: `tests/events/eventPage.test.ts`

**Interfaces:**
- Consumes: Tasks 2–3; plan 4 `getPlays`, `PlayRow`, `StoryList`.
- Produces: `eventState(c: Concert, now: number): "upcoming" | "passed" | "cancelled" | "postponed"`; `eventJsonLd(c: Concert, url: string): Record<string, unknown>` (schema.org `MusicEvent`: `name`, `startDate` (date only for date-only), `eventStatus` (`EventScheduled`/`EventCancelled`/`EventPostponed`), `eventAttendanceMode` offline, `location` `Place` with `address` `addressLocality`/`addressRegion`, `performer` `MusicGroup` per headliner and support, `image`, `offers.url` only when upcoming and the link is safe).

Page: image, state label when not upcoming ("This show has passed", "Cancelled", "Postponed"), title, `formatConcertWhen`, doors time, venue and city, lineup (headliners, supports), genre, Get tickets (upcoming and safe link only); "On HYFIN": the matched artist's recent plays (`getPlays({ q: artist, limit: 10 })`, `PlayRow`) and stories that mention them (`getPostsMentioning`, 6). JSON-LD in a `<script type="application/ld+json">`. Metadata: title "<title> · <date>", description "<artist> at <venue>, <city>, <date>."; `robots: { index: false }` unless upcoming. `getConcert` → null → `notFound()`; `ok: false` → "This event is unavailable right now." with `noindex`.

- [ ] **Step 1: Failing tests:** `eventState` for a past show, a cancelled one, a postponed one, an upcoming one; `eventJsonLd` has `@type: "MusicEvent"`, a date-only `startDate` of `2026-12-04`, `EventCancelled` for a cancelled show, no `offers` for a passed show or a `javascript:` ticket link, and one `performer` per act.
- [ ] **Step 2–4:** FAIL, implement, PASS; typecheck, lint, bundle guard.
- [ ] **Step 5:** Dev server: open three real events (one Chicago, one Milwaukee, one date-only if any); `/events/not-an-id` → 404; view source shows the JSON-LD. Commit `feat: event pages with recent HYFIN plays and schema.org data`.

### Task 5: Link the playlist to event pages

**Files:**
- Modify: `components/listen/EventRow.tsx` (title links to `eventPath(event.eventId)`; Tickets unchanged), `app/(frontend)/listen/playlist/page.tsx` (sidebar "In rotation, in town": the next 4 concerts, Milwaukee first, linking to their pages, then "All events →")
- Test: `tests/listen/playRow.test.ts`

- [ ] **Step 1: Failing test:** a playlist row's concert title links to `/events/<eventId>`; Tickets still goes to the ticket site.
- [ ] **Step 2–4:** FAIL, implement, PASS. Dev check: click a concert title on `/listen/playlist?nearby=1` → its event page.
- [ ] **Step 5:** Commit `feat: playlist concerts link to event pages`.

### Task 6: Decision record, smoke check, README

- [ ] **Step 1:** Decision 008 `docs/decisions/008-events-from-rm-playlist.md` (template in `~/.claude/CLAUDE.md`; "What actually happened" blank): events read live from rm-playlist-v2 instead of imported into Payload, amending decision 002 (spec asks for this record); cost: search across stories and events isn't at launch; event pages exist for past shows but say so and aren't indexed.
- [ ] **Step 2:** `.github/workflows/smoke.yml`: `/events 200`.
- [ ] **Step 3:** README: Events rows in "The site at launch" and the roadmap marked live; one paragraph under a new "Events" heading.
- [ ] **Step 4:** Full suite, typecheck, lint, `pnpm build`. Commit `docs: decision 008, events smoke check, README`; open the PR.
