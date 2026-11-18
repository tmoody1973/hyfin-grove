# HYFIN site launch: design

*2026-11-18. Agreed between Tarik and Claude in conversation. Items marked "Claude's call" were proposed by Claude and not separately confirmed.*

## Intent

Replace hyfin.org (WordPress) with the new HYFIN site built in this repo, so the station has one place that holds its archive, pulls in new stories from NPR CDS automatically, shows what is playing and what is coming to town, and plays the station everywhere on the site. **Dates:** a public **beta on 2026-12-01** at its own address, with hyfin.org staying on WordPress until the domain switch. *Claude's reading of "beta", to confirm.* WordPress hosting has no deadline; it can be cancelled any time after the switch. The beta must show all launch goals except two, which gate the domain switch and not the beta: the old-link check and the finished review of sorted posts.

Tarik will point the hyfin.org domain at the new site once four things work: the WordPress content is migrated, HYFIN stories sync from CDS, the playlist works, and events are live. Everything else follows launch.

## Goals (launch)

1. **All WordPress posts migrated**, re-sorted into three categories (Music, Culture, Milwaukee) with a short shared tag list.
2. **No old link breaks.** Every address in `docs/Pages_and_screens_Page_path_and_screen_class.csv` (3,883 real paths from Google Analytics, Jan 2023 to Nov 2026) answers with a page or a permanent redirect. The only 404s allowed are junk paths on an agreed exclusion list.
3. **HYFIN stories sync from NPR CDS** on a schedule, per decision 002 and its terms-of-use addendum.
4. **Playlist works**, read from rm-playlist-v2.
5. **Events are live**: upcoming concerts by artists HYFIN plays, read from rm-playlist-v2.
6. **Program schedule page** from NPR Cadence, with host photos staff upload.
7. **A persistent player** that keeps playing across page changes and matches the mockup.
8. **Pages follow the mockups**, now being moved into Figma, which is the design reference from here on.

## Non-goals (after launch)

Drops, the Listening Room, release pages, podcasts, the phone app, the staff music desk, listener accounts ("Your shelf"), contests ("Win"), and the Funraise support flow. The mockups for these exist and wait.

## Anti-goals (would be a failure even if it technically works)

- Any old hyfin.org link that people or search engines still follow returns a 404.
- The same story appears twice (once from WordPress, once from CDS).
- Editors edit the Payload copy of a CDS story and lose the change on the next sync.
- Premium NPR content is stored, or other stations' content is stored and never refreshed (NPR station API terms, clauses 4, 6, 7, 9).
- Pages look finished with mockup placeholder text and break on real content (long titles, missing images, embeds).

## Constraints

- **Stack is decided (decision 002):** Payload 3 running inside this Next.js app (Next 16, React 19), on Vercel; Postgres from Neon via the Vercel marketplace; files in Vercel Blob. Next 16 has breaking changes: read `node_modules/next/dist/docs/` before writing code (see `AGENTS.md`).
- **Vercel request bodies cap at 4.5 MB.** Media uploads use the Blob adapter's `clientUploads` so files go from the editor's browser straight to Blob.
- **CDS has no HYFIN flag.** HYFIN stories are found by series collection IDs and, since Sept 2026, a `HYFIN` tag (decision 001, `docs/editor-guide-organizing-hyfin-content.md`). Show IDs live in config, not code.
- **CDS exact-match filters fail silently** (HTTP 200, empty result). Verify one known story before trusting any count (`docs/LEARNING-LOG.md`).
- **UI SDK is beta** (released 2026-11-12, `@ui-sdk/react` + `@ui-sdk/core`, React 19+). Headless: we supply all styling. It has no audio components.
- **rm-playlist-v2 is a separate app** (Convex backend, `~/Documents/Projects/rm-playlist-v2`). This site only reads its public queries. One small change there is accepted: adding `hyfin` to its cached Cadence schedule (see Program schedule).

## Approaches considered

| | Approach | Trade-off |
|---|---|---|
| A | Back end first: Payload, import, sync, feeds; pages last | Real content early, but nothing visible for weeks, and model mistakes surface late |
| **B (chosen)** | **Riskiest slice end to end first, then widen** | Migration unknowns surface in week one and a real HYFIN page appears early; the content model may be adjusted once or twice |
| C | Design first with placeholder data, wire Payload after | Rejected: placeholder-filled mockups hide how real posts break layouts |

Tarik chose B. The project's real risk is the migration (format conversion, sorting quality, redirect coverage), not the pages, and B tests the migration first.

### Order of work under B

1. **First slice.** One WordPress post goes into Payload, is sorted into a category and tags, renders on a story page styled from the mockup, plays its audio (if any) in the persistent player, and its old dated address redirects to it.
2. **All posts and media**, plus the full 3,883-path redirect check.
3. **CDS sync.**
4. **Listen**: playlist page, schedule page, show and host pages.
5. **Events page.**
6. **Homepage and category pages.**
7. **Launch checks**, then the domain switch.

## What was decided

### Content model (Payload collections)

- **Posts.** One `category` (Music, Culture or Milwaukee). Any number of `tags`. Optional `show` (see Shows). Optional audio. A `source` of `wordpress` or `cds`. Legacy fields on imported posts: WordPress ID, slug, publish date, original URL. CDS posts are read-only in the admin.
- **Tags.** An editable collection, seeded with a shared list usable under any category: Business, Entertainment, Politics & Policy, History & Heritage, Tech & AI, Food, Community, Arts. Music-specific: New Releases, Interviews, Live & Concerts, Industry. This list is a draft: the import reports how many posts land on each tag; tags under about 10 posts get merged into another tag; posts that fit none are flagged for review.
- **Shows.** One collection for radio programs and recurring editorial series (HYFIN Verified, HYFINated Conversations, Diverse Disruptors, Yesterday Today Tomorrow, Ladies First). Fields: description, artwork, hosts, an optional Cadence program link (fills the schedule), and an optional podcast feed field reserved for after launch. *Claude's call:* one collection rather than separate Series and Shows, because Ladies First is both.
- **Hosts.** Name, photo, short bio, and the name or ID that matches the host in Cadence. Staff upload the photos: neither Cadence nor CDS biographies carry images.
- **Media.** Payload's upload collection, stored in Vercel Blob through `@payloadcms/storage-vercel-blob` with `clientUploads: true`. *Claude's call:* no Payload-generated image sizes for imported images (it would multiply ~10,600 files several times); Next.js resizes at display time.
- **Redirects.** Payload's official redirects plugin, for the one-off addresses staff manage (see Old links).
- **Editors** log in with Payload's built-in email and password. No listener accounts.

### WordPress import

- **Bring all posts:** about 1,248 (decision 002 count, 2026-09-11; recount at import time), **excluding** the Ladies First category (CDS owns that show) and the 833 podcast link-out entries, which carry no audio.
- **Pages:** only those in the CSV that have real content (examples: `/thewiz/`, `/harlem/`, `/mkemade/`, `/blackity-black-holiday-market/`, `/aboutus/`). Site-chrome pages are not imported.
- **Media:** about 10,600 files, ~1.5 GB, copied into Blob.
- **Sorting with Jev** (TypeSafe's model; Tarik's choice, already used in Backstory's `convex/jevTopics.ts`). Jev returns typed answers with probabilities, not free text:
  - Category is one pick from Music, Culture or Milwaukee.
  - Tags and show are each a yes/no with a score.
  - Code keeps the rules: posts where Jev is unsure (category probability below a threshold set during the first slice) go to the review queue whatever their traffic.
  - The builder reads TypeSafe's live docs (docs.typesafe.ai) before writing the integration.
- **Review:** Tarik reviews the sorted posts: the top ~100 by CSV traffic, every post from the last 18 months, and every low-confidence post. Older confident posts keep Jev's call.
- **WordPress freeze:** the only series still published on WordPress is New Music Monday, which moves to Brightspot/CDS after this week. The full import runs once after the last WordPress New Music Monday post; earlier runs (first slice) are rehearsals. From then on New Music Monday comes from CDS, mapped to Music. Its show page combines WordPress archive episodes and new CDS episodes.
- **Formatting:** WordPress HTML (embeds, shortcodes, galleries) converts to Payload rich text. How, and what to do with what doesn't convert, is found out in the first slice.

### Old links

- **Imported posts:** a pattern rule. Any request shaped `/YYYY/MM/DD/<slug>/` looks up the post by its WordPress slug and answers with a 301 to its new address. No per-post redirect rows.
- **New post addresses:** `/<category>/<slug>`, for example `/culture/szas-lyrics-validate-my-experience-as-a-black-woman`. *Claude's call.*
- **One-offs** go in the Redirects collection, editable by staff: `/playlist-2/` → playlist, `/shows-schedule/` → schedule, `/category/...` and `/tag/...` → the matching new category page, and similar.
- **Also covered:** `/wp-content/uploads/...` → the same file in Blob (other sites embed these), and `/feed/` → the new RSS feed.
- **Check:** before the domain switch, request all 3,883 CSV paths against the new site. Pass = every one answers 200 or 301, except paths on the junk exclusion list (see Settled after the builder check).

### CDS sync

Per decision 002 and its addendum: a scheduled job copies HYFIN stories (by series IDs and the `HYFIN` tag) into Payload as read-only posts. It skips premium content, re-checks stored stories regularly, and raises an alert if it stops running. HYFIN's own stories (owner s921) may be stored freely; anything else is stored only for display and kept refreshed.

### Playlist and events (from rm-playlist-v2)

- **Playlist:** read live from rm-playlist-v2's public Convex queries for station `hyfin`: `plays.currentByStation`, `plays.recentByStation`, `plays.searchByStation`. Not stored in Payload.
- **Events:** concerts by artists in HYFIN's last 30 days of rotation, from rm-playlist-v2. Read the public cached query `alexa:stationArtistShows` with `station: "hyfin"` (refreshed every 3 hours, Milwaukee shows ranked first), not the live `events.upcomingFromRotation`, which measured 6.7–11.5 s in October. HYFIN plays have been ingested since spring 2026, so rotation history is not the 3 days of Cadence push. Not verified yet: that the cache row for `hyfin` is filled. Not stored in Payload.
- **Change to decision 002:** that decision planned to import events into Payload from "a separate dataset". Events now come from rm-playlist-v2 and are read live. The cost is that search across stories and events, one of 002's success checks, is not at launch. Record this as a new decision.

### Program schedule (NPR Cadence)

rm-playlist-v2 already caches Cadence schedules every 15 minutes and serves them through the public query `alexa:stationSchedule` (programs, airtimes, hosts, show art, host profiles). Today it caches only 88Nine: `SCHEDULE_STATIONS = ["88nine"]` in `packages/convex/convex/cadence.ts`, with a comment that HYFIN joins once its Cadence schedule is current (HYFIN's schedule gaps were filled 2026-11-15). *Claude's call:* add `hyfin` there (a one-line PR in rm-playlist-v2) and have this site read `stationSchedule` rather than build a second Cadence client. Hosts in Payload hold the staff-uploaded photos and bios and win over rm-playlist's host profiles when both exist; Shows in Payload link to the Cadence program by name. Cadence's `displayHost` flag stays ignored.

### Persistent player

- Mounted in the root layout so it keeps playing as the visitor moves between pages.
- Plays the HYFIN live stream by default, with now-playing from `plays.currentByStation`. Pressing play on a story switches it to that story's audio. One bar for both.
- Controls (play, scrubber, volume, buttons) built from UI SDK behaviors (Slider, Button, Toggle) for keyboard and screen-reader support; playback through the browser's audio element; styling from the mockup.

### Pages at launch

Home; Music, Culture and Milwaukee category pages; story page; Listen (playlist, schedule, show page, host page); Events. Designs come from the Figma file. Where the mockups show placeholders, the builder uses real content and adjusts the layout to fit.

## Settled after the builder check (Claude's calls)

- **Category on CDS stories.** A mapping table in config sets category, tags and show from the CDS series or tag (for example Ladies First → Culture). Category, tags and show are site-owned fields: editors can change them and the sync never overwrites them. All CDS-owned fields stay locked. Tarik supplies the mapping; until then, unmapped CDS stories land in a review queue.
- **Bylines.** Posts get a byline: free text, with an optional link to a Host. CDS bylines are carried over. No author pages at launch.
- **Tag pages exist** at launch as simple lists (`/tag/<tag>`), since tags are on every post anyway.
- **Old addresses for content not imported:**
  - old event, venue and organizer pages → `/events`;
  - podcast link-out pages → the outside address they pointed to (a small lookup table kept from WordPress);
  - author and member pages → the matching host page, otherwise the schedule page;
  - dated Ladies First addresses (about 11) → their CDS copies, matched once by hand;
  - date-only archives (`/2025/01/17/`) → the homepage;
  - junk and malformed paths (`/wp-admin/`, `…/null`, `/404.html…`) → allowed to 404, under a written exclusion list reviewed once.

  The launch check becomes: every CSV path answers 200 or 301 except paths on the exclusion list.
- **Fonts and look:** the mockups' type (Archivo, Archivo Black, IBM Plex Mono and others) replaces the test site's Fraunces and Instrument Sans. Culture and Milwaukee have no mockups and reuse the Music page layout.
- **Until the Figma file is ready**, the HTML mockups in `docs/mockups-html/` are the reference. They hold the same designs. Once Figma exists, Figma wins where they disagree.

## Left to the builder

- Sync and job intervals, and where scheduled jobs run (Vercel cron or other).
- Exactly how WordPress HTML maps to Payload rich text, and handling for what doesn't convert.
- The Jev questions and confidence threshold, and the review screen or sheet Tarik works through.
- Caching strategy for rm-playlist-v2 reads and Cadence data.
- Test approach. The repo has CI (typecheck and build on push); this is going live, so tests run in CI before the domain switch.
- Decision records in `docs/decisions/` for: bringing all posts, events from rm-playlist-v2 (amends 002), UI SDK for the player, and Jev for sorting.

## How we'll know it worked

- Every CSV path answers 200 or 301, except paths on the agreed junk exclusion list.
- A new HYFIN story published in Brightspot appears on the site within one sync interval, untouched by anyone.
- No story appears twice; spot check the last 30 days.
- The player keeps playing across five page changes, and switches cleanly between live stream and story audio.
- The playlist page shows the song on air now; the events page shows concerts by artists HYFIN played this month.
- The schedule page shows this week's HYFIN programs with host photos.
