# Launch plan 9: One Events collection: synced concerts plus HYFIN's own events

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every event lives in Payload. The rm-playlist concerts sync in every 15 minutes, staff add HYFIN's own events of any type, and past events stay on the site with an archive, a "This event has passed" page, and room for a recap.

**Architecture:** An `events` collection holds both kinds, told apart by `source` (`rm-playlist` or `staff`). The existing 15-minute cron gains an events step: upsert each upcoming rm-playlist concert by its event id. It never deletes. If a future concert drops off the list, one single-event lookup refreshes its status. All four places that show concerts read Payload instead of rm-playlist: /events, the event page, the home concerts block, and the playlist's "In town". This supersedes decision 008's "read live" (decision 013).

**Tech Stack:** Payload 3 (Postgres, migrations with `push: false`), Next.js 16 App Router, Vitest. rm-playlist reads stay in `lib/events/rmEvents.ts` (`getConcerts`, `getConcert`).

**Spec:** `docs/superpowers/specs/2026-11-18-hyfin-site-launch-design.md`, "Playlist and events", as amended by decision 008. Tarik, 2026-11-20: "an events collection that brings in the playlist events and we then can add our own custom events and event types beyond concerts", and asked how past events appear.

## Global Constraints
- **Addresses never break.** Synced events keep `/events/<rm eventId>` (their `slug` is the rm event id). Staff events get `/events/<slugified-title>-<yyyy-mm-dd>`. An rm id that isn't stored yet still renders live, the way it does today.
- **Event types** (select; changing the list means a code change, which Tarik can request): `concert` "Concert", `hyfin-event` "HYFIN event", `community` "Community", `workshop` "Workshop or panel", `party` "Party or DJ night", `broadcast` "Live broadcast". Synced events are always `concert`.
- **Synced fields are read-only to staff:** title, startsAt, dateOnly, venue, city, metro, ticketUrl, imageUrl, artist, headliners, supports, status, playCount. The sync owns them. Staff may set, on any event: `hidden`, `featured`, `image` (overrides `imageUrl`), `description`, `recap`, `gallery`, `relatedPosts`.
- **Sync never deletes.** A concert absent from the list stays, so a past concert remains with its page.
- **Drafts:** events use `versions: { drafts: true }` (staff prepare an event before it shows). Public reads filter `_status = published` and `hidden != true`. Synced events are created published.
- **Upcoming vs past:** the existing rule in `lib/events/eventPage.ts`. A timed event is over 6 hours after it starts (`SHOW_LENGTH_MS`), or at `endsAt` if set. A date-only event is over when its day ends (America/Chicago).
- **Channel color:** events are green `#00ff9f` (Signal: "Milwaukee and events").

## Review Focus
1. **A concert cancelled after it synced:** it vanishes from rm-playlist's upcoming list. The next sync's lookup sets `status = cancelled`; the list drops it; its page says "Cancelled". Test in Task 2.
2. **Staff edits a synced event** (adds a recap, hides it, swaps the image): the next sync must not overwrite those fields. Test in Task 2 (the update data contains only sync-owned keys).
3. **Two concerts with the same title on different nights:** synced slugs are rm ids, so no clash. Staff slugs carry the date. Test in Task 1 (slug builder).
4. **rm-playlist down during a sync:** `getConcerts` returns `{ ok: false }`. The sync writes nothing and reports the error, and the pages keep showing stored events. Test in Task 2.
5. **Past-event archive growth:** synced concerts pile up (about 28 upcoming at a time). `/events/past` pages 24 at a time, and the type filter works there. Test in Task 3 (`pastWhere` + pagination params).

---

### Task 1: The Events collection

**Files:**
- Create: `collections/Events.ts`, `lib/events/slug.ts`, a migration via `pnpm payload migrate:create events`
- Modify: `payload.config.ts` (register), `collections/access.ts` or the file that holds `cdsLocked` (add `rmLocked`)
- Test: `tests/events/collection.test.ts`

**Interfaces:**
- Produces:
  - `EVENT_TYPES: readonly { value: EventType; label: string }[]` and `type EventType = "concert" | "hyfin-event" | "community" | "workshop" | "party" | "broadcast"` (in `lib/events/types.ts`)
  - `staffEventSlug(title: string, startsAt: string): string`, e.g. `("Anti-Gala: Harlem Nights!", "2026-12-05T01:00:00Z")` → `"anti-gala-harlem-nights-2026-12-04"` (date in America/Chicago)
  - `rmLocked`: a field `access.update` that returns false when `doc.source === "rm-playlist"`
  - The collection `events` with fields: `title`, `slug` (unique, indexed), `type`, `source` (`rm-playlist` | `staff`, default `staff`, read-only), `externalId` (unique, nullable, admin-hidden), `startsAt` (date + time), `endsAt` (optional), `dateOnly`, `venue`, `address`, `city`, `metro`, `ticketUrl`, `priceText`, `image` (upload), `imageUrl` (text, synced), `artist`, `headliners` (text, hasMany), `supports` (text, hasMany), `playCount`, `status` (`scheduled` | `cancelled` | `postponed`), `description` (rich text), `recap` (rich text), `gallery` (upload, hasMany), `relatedPosts` (relationship to posts, hasMany), `featured`, `hidden`.
  - Admin list: `defaultColumns: ["title", "type", "startsAt", "source", "hidden"]`; `listSearchableFields: ["title", "venue", "artist"]`.

- [ ] **Step 1: Failing tests.** `staffEventSlug` (example above; non-ASCII stripped; date taken in Chicago, so `2026-12-05T01:00:00Z` → `12-04`). `rmLocked` returns false for `{ source: "rm-playlist" }` and true for `{ source: "staff" }`. `EVENT_TYPES` values are exactly the six in Global Constraints.
- [ ] **Step 2:** `pnpm vitest run tests/events/collection.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement. The slug field fills from `staffEventSlug` in a `beforeValidate` hook when empty and `source === "staff"`. Read access: public reads see `_status = published` and `hidden != true`; signed-in users see all.
- [ ] **Step 4:** Tests pass. `pnpm payload migrate:create events`; read the generated SQL (one `events` table, `events_rels` for gallery and relatedPosts, the hasMany text tables, `_events_v` for versions); run `pnpm payload migrate`. **This writes to the shared database:** ledger it.
- [ ] **Step 5:** `pnpm tsc --noEmit && pnpm lint`. Commit `feat: events collection`.

### Task 2: Sync rm-playlist concerts into Events

**Files:**
- Create: `lib/events/sync.ts`, `scripts/events-sync.ts` (`--dry-run`)
- Modify: `app/(payload)/api/cron/cds-sync/route.ts` (an events step with its own try/catch, like `runStation`)
- Test: `tests/events/sync.test.ts`

**Interfaces:**
- Consumes: `getConcerts`, `getConcert`, `Concert` (`lib/events/rmEvents.ts`); `eventState` (`lib/events/eventPage.ts`).
- Produces:
  - `concertToEvent(c: Concert): SyncedEventData`: only sync-owned keys, plus `type: "concert"`, `source: "rm-playlist"`, `externalId: c.id`, `slug: c.id`, `_status: "published"`. `status` maps rm `cancelled`/`postponed`, else `scheduled`.
  - `planEventSync(stored: StoredEvent[], concerts: Concert[], now: number): { create: SyncedEventData[]; update: { id: number; data: Partial<SyncedEventData> }[]; recheck: string[] }`. Update only when a sync-owned value differs (stable comparison, like `lib/station/sync.ts`). `recheck` = stored synced events still upcoming but missing from the list.
  - `syncEvents(payload, deps: { list: () => Promise<Result<Concert[]>>; lookup: (id: string) => Promise<Result<Concert | null>>; now: number; log: (l: string) => void }): Promise<{ created: number; updated: number; rechecked: number; failed: number; error?: string }>`

- [ ] **Step 1: Failing tests:**
  - A new concert → create with `slug === externalId` and `type: "concert"`.
  - The same concert again → no update.
  - Venue changed → an update whose data contains only `venue`.
  - A stored event with `recap` / `hidden: true` / `image` set: the update data never contains those keys.
  - A future stored concert missing from the list → in `recheck`. The lookup says cancelled → updated to `status: "cancelled"`. The lookup errors → left unchanged, `failed` counted.
  - A past stored concert missing from the list → not rechecked, never deleted.
  - `list` returns `{ ok: false }` → nothing written, `error` set.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. One `payload.find` for stored synced events (`source = rm-playlist`, `select` sync-owned keys + `startsAt`, no pagination). Lookups capped at 10 per run.
- [ ] **Step 4:** Tests pass. Wire into the cron route as `events` in the JSON response. `scripts/events-sync.ts --dry-run`, then for real. Expected: created ≈ the current upcoming count (28 on 2026-11-19). **Shared DB write**, ledger it.
- [ ] **Step 5:** Commit `feat: rm-playlist concerts sync into Events every 15 minutes`.

### Task 3: Reading events, the /events list and the past archive

**Files:**
- Create: `lib/events/store.ts`, `app/(frontend)/events/past/page.tsx`, `components/events/EventRow.tsx`, `components/events/TypeFilter.tsx`
- Modify: `app/(frontend)/events/page.tsx`, `components/events/MonthCalendar.tsx` (take `EventView`), `lib/events/params.ts` (`type`, `page`)
- Test: `tests/events/store.test.ts`

**Interfaces:**
- Produces:
  - `type EventView = { id: number; slug: string; href: string; title: string; type: EventType; typeLabel: string; startsAt: string; dateOnly: boolean; endsAt: string | null; venue: string | null; city: string | null; imageUrl: string | null; ticketUrl: string | null; status: "scheduled" | "cancelled" | "postponed"; featured: boolean; artist: string | null; headliners: string[]; supports: string[]; source: "rm-playlist" | "staff" }`
  - `upcomingEvents(db, { now: number; type?: EventType; limit?: number }): Promise<EventView[]>`: soonest first, featured first within the same day, cancelled/postponed excluded.
  - `pastEvents(db, { now: number; type?: EventType; page: number; perPage?: 24 }): Promise<{ events: EventView[]; totalPages: number }>`: newest first.
  - `eventBySlug(db, slug: string): Promise<EventFull | null>` (`EventView` plus description, recap, gallery, relatedPosts as cards).
  - `upcomingWhere(now, type?)` / `pastWhere(now, type?)`: pure Payload `Where` builders (published, not hidden, time window, type).

- [ ] **Step 1: Failing tests** for the two `Where` builders: published, not hidden, the 6-hour rule as an `or` of timed and date-only conditions, the optional type. Plus `toEventView` (image override beats `imageUrl`; `href` is `/events/<slug>`).
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. Then build the pages:
  - `/events`: type filter chips (All + six types, `?type=`), the "Coming up" list (`EventRow`: date block, green type label, title, venue · city, Tickets link), the month calendar, and a "Past events" link.
  - `/events/past`: the same rows, newest first, `pageHref` pagination, type chips, `metadata` title "Past events".
- [ ] **Step 4:** Tests pass. In dev: `/events`, `/events?type=concert`, `/events/past` render. Screenshots at 1440 and 390.
- [ ] **Step 5:** Commit `feat: events list, type filter and past archive from Payload`.

### Task 4: The event page

**Files:**
- Modify: `app/(frontend)/events/[id]/page.tsx`, `lib/events/eventPage.ts` (`eventState` and `eventJsonLd` accept `EventView`)
- Test: `tests/events/eventPage.test.ts` (extend)

- [ ] **Step 1: Failing tests:**
  - `eventState` on an `EventView` (upcoming, passed after 6h or after `endsAt`, cancelled, postponed).
  - `eventJsonLd` uses `MusicEvent` for `concert` and `Event` for the other types, `eventStatus` `EventCancelled`/`EventPostponed`, and `location` only when a venue exists.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Page order:
  1. `eventBySlug(db, id)`.
  2. Otherwise, if `id` looks like an rm id, the live `getConcert` path as today.
  3. Otherwise `legacyOr404`.

  Render the type label; the passed / cancelled / postponed banner (existing `LABEL`, plus "This event has passed" for every type); the description; the **recap** and **gallery** when the event has passed and they exist; related stories; Tickets only while upcoming. For concerts, "<artist> on HYFIN" plays stays as today.
- [ ] **Step 4:** Tests pass. Dev check: a synced concert, a staff event created in the admin (upcoming), and the same event with `startsAt` set in the past plus a recap.
- [ ] **Step 5:** Commit `feat: event pages for every type, with recaps for past events`.

### Task 5: Home, playlist, sitemap, decision record

**Files:**
- Modify: `app/(frontend)/page.tsx` (`ConcertsBlock` → upcoming events, any type, 4), `app/(frontend)/listen/playlist/page.tsx` + `components/events/InTown.tsx` (Payload concerts whose `artist`/`headliners`/`supports` match recent plays, via `artistMatches`), `lib/sitemap.ts` (upcoming + past `staff` events), `.github/workflows/smoke.yml` (`/events/past 200`), `README.md` (Events section)
- Create: `docs/decisions/013-events-in-payload.md` (supersedes 008's live reads; keeps rm-playlist as the concert source)

- [ ] **Step 1:** Failing test for the sitemap: an upcoming synced event and a past staff event are listed; a hidden one is not.
- [ ] **Step 2:** Implement the four changes. Decision 013 in the CLAUDE.md format, with "What actually happened" blank.
- [ ] **Step 3:** `pnpm vitest run && pnpm tsc --noEmit && pnpm lint && pnpm build`. Expected: all pass. Old-link check against a local production build: FAIL 0.
- [ ] **Step 4:** Commit `feat: home, playlist and sitemap read Events; decision 013`. Final whole-branch review, then PR.

## For Tarik before or during the build
- Are the six event types right? Rename or add now: it's one list.
- Who should be able to add events in the admin: every editor, or admins only? (Default: every editor, like posts.)

### Task 6: A quick "Add an event" link for staff (added 2026-11-20, Tarik)

Staff open one link, sign in with their Radio Milwaukee Google account, and see only a short event form. They never land in the full Payload admin.

**Files:**
- Create: `app/(frontend)/staff/add-event/page.tsx` (server: who is signed in), `app/(frontend)/staff/add-event/actions.ts` (server action `createEvent`), `components/staff/EventForm.tsx` (`"use client"`), `app/(frontend)/staff/sign-in/route.ts`, `lib/staff/returnTo.ts`
- Modify: `lib/auth/google.ts` (`successRedirect(req)` returns the saved return path), `app/robots.ts` (disallow `/staff`)
- Test: `tests/staff/returnTo.test.ts`, `tests/staff/eventInput.test.ts`

**Interfaces:**
- `safeReturnTo(value: string | undefined): string`: only `/staff/...` paths survive; anything else (full URLs, `//host`, `/admin`, control characters) → `"/admin"`, today's behaviour.
- `parseEventInput(form: FormData): { ok: true; data: StaffEventData } | { ok: false; errors: Record<string, string> }`: title (required, ≤ 140), type (one of `EVENT_TYPES`), date + start time (required; Chicago local → ISO), end time (optional, after start), venue, address, city, ticket URL (`https://` only), price text, description (plain text → rich text paragraphs), `publish` checkbox.
- `createEvent(prev, form)`: re-reads the signed-in user (`payload.auth({ headers })`), returns "Please sign in" if none. Calls `payload.create({ collection: "events", data, user, overrideAccess: false, draft: !publish })`, so staff permissions apply (payload skill: Local API + user requires `overrideAccess: false`). Returns the new event's address.

**Flow:**
1. `/staff/add-event` with nobody signed in shows "Sign in with your Radio Milwaukee Google account".
2. That goes to `/staff/sign-in?next=/staff/add-event`, which sets a 10-minute `hyfin-return` cookie and sends them to `/api/users/oauth/google`.
3. After Google, `successRedirect` reads the cookie through `safeReturnTo` and lands them back on the form.
4. On success, the page shows "Event added" with a link to `/events/<slug>` and "Add another".

- [ ] **Step 1: Failing tests:**
  - `safeReturnTo` cases: `/staff/add-event` kept; `https://evil.com`, `//evil.com`, `/admin`, `/staff/../admin`, `/staff/%0d` → `/admin`.
  - `parseEventInput` cases: required title, type, date; end before start rejected; `javascript:` ticket URL rejected; Chicago 7:00 pm on 2026-12-06 → `2026-12-07T01:00:00.000Z`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. The form uses the site's Signal styling: big labels, black fields, one green submit button, and "Publish now" ticked by default (unticked = saved as a draft for an admin to finish). No image upload in this first pass. Staff add a photo later in the admin, or it's handled in a follow-up (phone photos exceed Vercel's 4.5 MB request limit, so it needs browser-side resizing).
- [ ] **Step 4:** Tests pass. Browser check: signed out → the sign-in button. Sign in with Google on dev (port 3007, the local Google callback). Back on the form; submit an event; it appears on `/events` and in the admin with the submitter as creator. Then delete the test event.
- [ ] **Step 5:** Commit `feat: staff quick-add event link with Google sign-in`.
