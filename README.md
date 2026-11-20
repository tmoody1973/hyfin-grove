# hyfin-grove

> The new home of HYFIN, Radio Milwaukee's urban-alternative station: the full hyfin.org archive, new stories from NPR's content system, the live playlist and the program schedule, in one site that staff run from Payload CMS.

**Live test site:** https://hyfin-grove.vercel.app · **Admin:** https://hyfin-grove.vercel.app/admin
**Public beta:** 2026-12-01, at its own address. hyfin.org stays on WordPress until the domain switch.

Plans 1–5 of 7 are built and live (see [Status and roadmap](#status-and-roadmap)). The design is [`docs/superpowers/specs/2026-11-18-hyfin-site-launch-design.md`](docs/superpowers/specs/2026-11-18-hyfin-site-launch-design.md); every non-obvious choice has a plain-English record in [`docs/decisions/`](docs/decisions/).

---

## How it works

The site pulls from four places. Only one of them is ours to edit; the others are read.

```
 hyfin.org (WordPress) ──one-time import──►┐
                                           │
 NPR CDS (Brightspot stories) ──every 15 min──►  Payload CMS  ──►  the site
                                           │   (Postgres + Blob)     (Next.js on Vercel)
 Staff in the admin ──────────edit────────►┘          ▲
                                                       │ read live, never stored
 rm-playlist-v2 (songs, concerts, NPR Cadence schedule)┘
```

1. **The WordPress archive was imported once.** All 1,252 hyfin.org posts, their images and embeds now live in Payload. Every old address still works: `/2024/04/07/some-post` sends a permanent redirect to the new page.
2. **New stories arrive from NPR's Content Distribution Service (CDS)**, the shared content system NPR stations publish into from Brightspot. A scheduled job copies HYFIN's stories into Payload every 15 minutes, as read-only posts.
3. **The playlist, concerts and schedule are read live** from rm-playlist-v2, Radio Milwaukee's separate playlist app. It also caches HYFIN's NPR Cadence schedule (Cadence is NPR's on-air scheduling system). None of this is stored in Payload.
4. **Staff own everything else in Payload:** categories and tags, show descriptions and artwork, host photos and bios, redirects.

## The site at launch

| Page | Address | What it shows | Status |
|---|---|---|---|
| Story | `/<category>/<slug>` | An archive or CDS story, its embeds and audio | Live |
| Old links | every hyfin.org address in Google Analytics (3,883) | Permanent redirect to where the content lives now, or the content page at its old address | Live |
| Content pages | `/thewiz`, `/harlem`, `/mkemade`, `/aboutus`… | hyfin.org's content pages (Admin → Pages) | Live |
| Playlist | `/listen/playlist` | The last 24 hours of songs, live-updating, album art, 30-second previews, upcoming concerts in Milwaukee, Chicago and Madison | Live |
| Schedule | `/listen/schedule` | This week's programs in Central time, who's on now, hosts | Live |
| Shows | `/shows`, `/shows/<slug>` | Description, hosts, latest-episode tracklist, past episodes, the show's stories | Live |
| Hosts | `/hosts/<slug>` | Photo, bio, shows, recent sets, stories by the host | Live |
| Events | `/events`, `/events/<id>`, `/events/past` | Concerts by artists HYFIN plays plus HYFIN's own events: type and metro filters, month calendar, a page per event (recap and photos once it's over), and a past-events archive | Live |
| Home | `/` | Lead story beside a live "Signal log" of the last 12 songs, the latest stories, HYFIN's shows, the next concerts by artists HYFIN plays, and Milwaukee Made | Live |
| Sections | `/music`, `/culture`, `/milwaukee` | A lead story, then 24 stories a page (`?page=2`); Music adds its series and links to shows and DJs; Culture's first page and the homepage's Latest mix in NPR's newest Race stories by date ([decision 010](docs/decisions/010-npr-race-display-only.md)) | Live |
| NPR stories | `/npr/<id>` | An NPR story shown on HYFIN: read live from CDS, never stored, credited to NPR, canonical npr.org | Live |
| Tags | `/tag/<slug>` | A tag's definition and its stories, 24 a page | Live |
| RSS | `/feed.xml` | The 30 newest stories (replaces hyfin.org's `/feed/`) | Live |

A persistent player sits at the top of every page. It plays the live stream by default, switches to a story's audio when asked, and keeps playing as you move between pages.

## Payload CMS

Payload 3 runs inside this Next.js app; the admin is at `/admin`. Data lives in Neon Postgres, files in Vercel Blob.

### Collections

| Collection | Holds | Notes |
|---|---|---|
| **Posts** | Every story | One category (Music, Culture or Milwaukee), up to 2 tags, optional show, optional audio, a `source` of `wordpress` or `cds`. CDS-owned fields (title, text, byline, audio…) are read-only on CDS and station posts, so an edit can't be lost on the next sync. A post saved without a feature photo takes the first photo in its text. |
| **Tags** | The shared tag list | 12 tags with written definitions (Business, Entertainment, Politics & Policy, History & Heritage, Tech & AI, Food, Community, Arts, New Releases, Interviews, Live & Concerts, Industry) |
| **Shows** | Radio programs and editorial series | Description, artwork, hosts, and the exact NPR Cadence program name that links it to the schedule |
| **Hosts** | People on air | Photo, bio, and the name Cadence uses for them |
| **Media** | Images and files | Stored in Vercel Blob; uploads go from the editor's browser straight to Blob |
| **Users** | Staff accounts | Roles `admin` and `editor` (see [Signing in](#signing-in-to-the-admin)) |
| **CDS sync status** (global) | Last sync run, last success, last error | Read-only; powers the health check |
| **Front page** (global) | The pinned lead story for the homepage, Music, Culture and Milwaukee | Any signed-in editor can change it. An empty, withdrawn or deleted pin falls back to the newest story with an image. |

Plugins: SEO (titles, descriptions, share images), Search (one index for admin and future site search), Redirects (one-off addresses staff manage), a media gallery for bulk image work, Vercel Blob storage, and `payload-oauth2` for Google sign-in.

### Schema changes go through migrations

Automatic schema syncing is off (`push: false`), so the dev server can never quietly change the shared database. Every change is a migration file in `migrations/`:

```bash
pnpm payload migrate:create <name>   # generate from the config; read it line by line before applying
printf 'y\n' | pnpm payload migrate  # apply (the prompt warns about dev mode; answering yes is expected)
```

Local development and production use **the same Neon database**, so a migration you apply locally is live immediately. Migrations here only add columns or tables, so code that hasn't deployed yet keeps working.

### Signing in to the admin

Staff sign in with **Google Workspace**. Only verified `@radiomilwaukee.org` accounts get in; the check is server-side code with its own tests ([decision 007](docs/decisions/007-google-workspace-sign-in.md)).

- **New staff become editors** automatically on first sign-in. Editors edit content; only admins manage users and roles.
- **Passwords are for admins only.** Editors can't log in with a password, reset one or set one, so turning off someone's Google account locks them out.
- **Sessions end at most 8 hours after sign-in**, however active the tab is; then Google checks the person again. An hour idle also signs you out.
- Preview deployments can't use Google sign-in (their addresses change every push); use the admin password there.

## The WordPress migration

Run once on 2026-11-18 from the hyfin.org REST API ([decision 003](docs/decisions/003-import-all-wordpress-posts-sorted-by-jev.md), full numbers in [`docs/migration/import-summary.md`](docs/migration/import-summary.md)).

| | |
|---|---|
| Posts on hyfin.org | 1,264 |
| Imported | **1,252** (Ladies First's 12 posts excluded: CDS owns that show) |
| Failed | 0 |
| Images copied to Blob | 2,784 files, about 1.0 GB |
| Categories | Music 628 · Culture 400 · Milwaukee 224 |
| Bylines | 1,251 of 1,252, read from each author's `<meta name="author">` (the WordPress API hides names) |

- **Sorting by Jev.** Jev is TypeSafe's model; it returns a category and tags with a confidence score instead of free text. Code keeps the rules: posts where Jev is less than 70% sure, posts from the last 18 months, and the 100 most-viewed posts go to a review queue (433 posts) for Tarik.
- **Embeds became real blocks.** YouTube, Spotify, Spreaker, NPR, PRX, Bandcamp, Apple Music, SoundCloud, Mixcloud players and Instagram/X/TikTok posts are recognized and rebuilt from an allowlist; anything unrecognized never becomes an iframe.
- **Old links.** Anywhere the site would answer "not found", one resolver (`lib/legacy/resolve.ts`) first checks Admin → Redirects (staff's one-offs), then pattern rules (`lib/legacy/patterns.ts`): dated stories, categories, tags, authors, events, podcasts, charts, feeds, `/wp-content/uploads/` images and more. It only ever sends people to this site, radiomilwaukee.org or our image storage.
- **Checking them.** `pnpm tsx scripts/check-old-links.ts --csv <GA export> [--base <url>]` requests all 3,883 Google Analytics addresses and writes a report to `.superpowers/link-check/`. Addresses allowed to fail, each with a reason, live in `data/link-check-exclusions.txt`. The GA export is never committed (public repo).
- **The switch** is a written runbook: [`docs/runbooks/domain-switch.md`](docs/runbooks/domain-switch.md).

Re-run tools: `pnpm import:wp --slug <slug>` for one post, `--all --refresh` to re-import (reviewed posts keep their category and tags).

## CDS sync

A Vercel cron calls `/api/cron/cds-sync` every 15 minutes ([decision 005](docs/decisions/005-cds-sync-design.md)).

- **What counts as HYFIN.** CDS has no HYFIN flag, so stories are found by Radio Milwaukee's owner ID plus the `HYFIN` tag or a HYFIN series: Ladies First, In The Mix, La Alternativa ([decision 001](docs/decisions/001-hyfin-content-by-series-id.md)). DJ Takeover is not HYFIN.
- **Skipped:** premium NPR content, and CDS copies of WordPress posts (`hyfin-<id>`), which are already imported.
- **Withdrawn, not deleted.** A story that disappears from CDS is hidden from the site but kept in the database.
- **Bylines.** Read from CDS biography records. When CDS names no author, the series default applies (Ladies First → Element Everest-Blanks, La Alternativa → Paula Lovo).
- **Health.** `/api/cron/cds-sync/health` answers 200 when the last success is under an hour old, 503 otherwise. A GitHub Action checks it hourly and fails loudly.
- **Players.** Brightspot HTML blocks are dropped, except an iframe on the embed allowlist (Mixcloud, YouTube, Spotify…), which becomes a player. `scripts/refresh-cds-bodies.ts` rebuilds stored text after a converter change.
- Run by hand: `pnpm cds:sync --dry-run`, then `pnpm cds:sync`.

### Uniquely Milwaukee from radiomilwaukee.org

Uniquely Milwaukee pages never reach CDS, so the same cron then reads `radiomilwaukee.org/tags/hyfin.rss` ([decision 009](docs/decisions/009-uniquely-milwaukee-from-station-feed.md)). Uniquely Milwaukee items in it become Milwaukee stories on the Uniquely Milwaukee show (`source: station`); their text and audio come from the episode's podcast-feed copy in CDS, matched by title and date. Tag an episode HYFIN on radiomilwaukee.org and it arrives within 15 minutes. The feed holds only the 10 newest HYFIN items. Run by hand: `pnpm tsx --env-file=.env.local scripts/station-sync.ts [--dry-run]`.

## Listen: playlist, schedule, shows, hosts

All from rm-playlist-v2's public queries ([decision 006](docs/decisions/006-listen-data.md)). rm-playlist-v2 caches HYFIN's NPR Cadence schedule and returns real airings (start and end times), so this site does no time-zone arithmetic. Everything shows Central time.

- **Playlist.** Opens on the last 24 hours; 60 songs at first, "Show earlier songs" for more; the ← → picker shows full past days. New songs appear without a reload. Songs with an Apple Music ID get a 30-second preview that pauses the live stream and resumes it afterwards. Upcoming concerts appear as a red LIVE row under the song, with a Tickets button.
- **Schedule, shows and hosts** join Cadence's airings to what staff keep in Payload; Payload's text and photos win. Episode tracklists come from the playlist over the airing's time window.
- **Seeding.** `scripts/seed-listen.ts` creates shows and hosts from Cadence's program list, the lineup sheet (`data/hyfin-lineup.json`) and the staff pages on radiomilwaukee.org. It only creates and fills empty fields; it never overwrites a staff edit. Dry run first: `pnpm tsx --env-file=.env.local scripts/seed-listen.ts --dry-run`.

## Support page

`/support` (plans 8 and 10, decision 012). Every word, the prices and which Funraise form each opens, the tee photo, impact numbers (with an on/off switch), social links, the legal line and the thank-you shipping line are edited in Admin → Support page. Anything left empty shows the built-in copy (`lib/supportContent.ts`), so the page never goes blank. The admin refuses a Funraise form number that isn't a whole number and a fallback link that isn't a `https://funraise.org/give/Radio-Milwaukee/…` page. `scripts/seed-support-page.ts` fills only empty sections.

## Events

One Events collection in Payload ([decision 013](docs/decisions/013-events-in-payload.md), which replaces 008's live reads). The 15-minute cron syncs rm-playlist-v2's concerts (every upcoming date for artists in HYFIN's last 30 days of rotation, Milwaukee, Chicago and Madison) into it: it writes only the fields it owns (read-only to staff), never deletes, and looks up a future concert that drops off the list so a cancellation reaches its page. Staff add HYFIN's own events in Admin → Events, with six types: concert, HYFIN event, community, workshop or panel, party or DJ night, live broadcast. Staff can hide or feature any event, swap its image, and add a description, a recap and photos. `/events` has type chips, metro tabs, a month calendar and "Coming up"; `/events/past` lists past events, newest first. Each event has a page at `/events/<slug>` (synced concerts keep their rm-playlist id as the slug), with schema.org event data; past, cancelled and postponed events keep their pages but say so and aren't indexed. The home page's "Heard on HYFIN" block and the playlist's "In town" box show concerts from the same collection. `pnpm tsx --env-file=.env.local scripts/events-sync.ts --dry-run` runs the sync by hand.

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.4 (App Router), React 19, TypeScript |
| CMS | Payload 3.94 (inside the Next.js app), Lexical rich text |
| Database and files | Neon Postgres, Vercel Blob |
| Styling | Tailwind CSS 4; Archivo, Archivo Black and IBM Plex Mono |
| Player controls | UI SDK (beta) for accessible buttons and sliders ([decision 004](docs/decisions/004-ui-sdk-for-the-player.md)) |
| Live data | Convex client reading rm-playlist-v2's public queries |
| Sorting | Jev (TypeSafe) for categories and tags |
| Sign-in | Google Workspace via `payload-oauth2` (PKCE) |
| Hosting | Vercel; Vercel Cron for the CDS sync |
| Tests and CI | Vitest; GitHub Actions for typecheck, tests, build, post-deploy smoke checks, and the hourly CDS heartbeat |

## Run it locally

**Prerequisites:** Node 24, pnpm, and access to the shared Neon database (`vercel env pull` if you're on the Vercel project).

```bash
pnpm install
cp .env.example .env.local   # fill in the values below
pnpm dev -p 3007             # http://localhost:3007 (port 3000 is often taken)
```

| Variable | What it is | Required |
|---|---|---|
| `DATABASE_URL` | Neon Postgres (pooled), set by the Vercel Neon integration | Yes |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob, set by the Blob integration | Yes |
| `PAYLOAD_SECRET` | Signs admin sessions; any long random string | Yes |
| `NPR_CDS_TOKEN` | CDS bearer token (from NPR Member Partnership) | Yes |
| `NPR_SERVICE_ID` | Radio Milwaukee's CDS service ID (`s921`) | Yes |
| `NPR_LADIES_FIRST_SERIES_ID` | Ladies First's CDS collection (`g-s921-13049`), for the early homepage | Yes |
| `TYPESAFE_API_KEY` | Jev sorting, server-only | For the import and CDS sync |
| `NEXT_PUBLIC_HYFIN_STREAM_URL` | The live stream | Yes |
| `NEXT_PUBLIC_RM_PLAYLIST_CONVEX_URL` | rm-playlist-v2's Convex address | Yes |
| `NEXT_PUBLIC_SITE_URL` | Public address for canonical links, share links and Google sign-in; defaults to the vercel.app address | At launch |
| `CRON_SECRET` | Password Vercel Cron sends to the sync route | Production |
| `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` | Google sign-in; leave empty for password-only | Optional |
| `GOOGLE_OAUTH_SERVER_URL` | Local dev only: `http://localhost:3007` | With Google locally |

### Scripts

| Command | What it does |
|---|---|
| `pnpm dev` / `pnpm build` | Dev server / production build |
| `pnpm test` | All Vitest tests |
| `pnpm lint` | ESLint |
| `pnpm payload migrate:create <name>` / `pnpm payload migrate` | Create / apply a migration |
| `pnpm generate:types` | Regenerate `payload-types.ts` |
| `pnpm import:wp --slug <s>` / `--all` | WordPress import (writes `docs/migration/` reports) |
| `pnpm cds:sync [--dry-run]` | Run the CDS sync by hand |
| `pnpm seed:tags` | Seed the tag list |
| `pnpm census:wp` | Count what hyfin.org's posts contain (embeds, images) |
| `pnpm tsx --env-file=.env.local scripts/seed-listen.ts [--dry-run]` | Seed shows and hosts |
| `pnpm tsx --env-file=.env.local scripts/backfill-wp-bylines.ts [--dry-run]` | Fill archive bylines from hyfin.org |
| `pnpm tsx --env-file=.env.local scripts/assign-nmm.ts [--dry-run]` | Put New Music Mondays posts (matched by title) on the New Music Mondays show |
| `pnpm tsx --env-file=.env.local scripts/station-sync.ts [--dry-run]` | Import HYFIN-tagged Uniquely Milwaukee episodes from radiomilwaukee.org |
| `pnpm tsx --env-file=.env.local scripts/backfill-hero-from-body.ts [--dry-run]` | Give stories with no feature photo the first photo in their text |
| `pnpm tsx --env-file=.env.local scripts/refresh-cds-bodies.ts [--dry-run]` | Rebuild stored CDS story text after a converter change |

## Project structure

```
hyfin-grove/
├── app/
│   ├── (frontend)/        # the public site: stories, listen/, shows/, hosts/, legacy redirects
│   └── (payload)/         # admin, REST/GraphQL API, cron routes (cds-sync + health)
├── collections/           # Payload collections (Posts, Tags, Shows, Hosts, Media, Users)
├── globals/               # CdsSyncStatus, FrontPage
├── components/            # player/, story/, listen/, admin/
├── lib/
│   ├── cds/               # CDS client, mapping, sync plan and engine
│   ├── wordpress/         # import, HTML → Lexical, embeds
│   ├── listen/            # rm-playlist reads, time helpers, playlist/schedule logic
│   ├── sorting/           # Jev questions and rules
│   └── auth/              # Google staff check, password and session guards
├── migrations/            # every schema change, in order
├── scripts/               # import, sync, seeds, backfills
├── data/                  # hyfin-lineup.json
├── tests/                 # Vitest
└── docs/                  # spec, plans, decisions, learning log, migration reports, mockups
```

## Things that will bite you

- **This is Next.js 16.** APIs changed (for example, `searchParams` is a promise). Read `node_modules/next/dist/docs/` before writing routes; see `AGENTS.md`.
- **jsdom must never reach the live server.** The WordPress import uses jsdom to parse HTML; importing it from anything the site or Payload config loads 500'd production once. `tests/serverBundle.test.ts` fails the build if it happens.
- **One shared database.** Local scripts write to the same Neon database production reads. Use `--dry-run` first; seeds and backfills only fill empty fields.
- **CDS filters fail silently.** A wrong ID returns HTTP 200 and an empty list. Check one known story before trusting a count ([learning log](docs/LEARNING-LOG.md)).
- **Payload's Local API skips access rules by default.** Field access only applies when a Local API call passes `overrideAccess: false`, and partial group updates merge with stored values.

## Docs

- **Design:** [`docs/superpowers/specs/2026-11-18-hyfin-site-launch-design.md`](docs/superpowers/specs/2026-11-18-hyfin-site-launch-design.md)
- **Plans** (one per step of work): [`docs/superpowers/plans/`](docs/superpowers/plans/)
- **Decisions**, in plain English, with a "what actually happened" line Tarik fills in later:
  1. [HYFIN content by series ID](docs/decisions/001-hyfin-content-by-series-id.md)
  2. [Payload as the content store](docs/decisions/002-payload-as-the-content-store.md)
  3. [Import all WordPress posts, sorted by Jev](docs/decisions/003-import-all-wordpress-posts-sorted-by-jev.md)
  4. [UI SDK for the player](docs/decisions/004-ui-sdk-for-the-player.md)
  5. [CDS sync design](docs/decisions/005-cds-sync-design.md)
  6. [Where the Listen pages get their data](docs/decisions/006-listen-data.md)
  7. [Google Workspace sign-in](docs/decisions/007-google-workspace-sign-in.md)
  8. [Events from rm-playlist-v2](docs/decisions/008-events-from-rm-playlist.md)
- **Learning log:** [`docs/LEARNING-LOG.md`](docs/LEARNING-LOG.md): what we expected, what happened, what we now believe.
- **Editor's guide** to labeling HYFIN content in Brightspot: [`docs/editor-guide-organizing-hyfin-content.md`](docs/editor-guide-organizing-hyfin-content.md)
- **Mockups:** Figma `ivuHFQdgrfMAxldRrsq3nP` (the reference); runnable HTML copies in [`docs/mockups-html/`](docs/mockups-html/)

## Status and roadmap

| Step | What | Status |
|---|---|---|
| 1 | First slice: one post end to end, story page, player, old-link redirect | Done |
| 2 | All 1,252 posts, embeds, images, SEO, search | Done |
| 3 | CDS sync every 15 minutes, with health check | Done |
| 4 | Listen: playlist, schedule, show and host pages | Done |
| — | Google Workspace sign-in for staff | Done |
| 5 | Events page and event pages (concerts by artists HYFIN plays) | Done |
| 6 | Homepage, Music / Culture / Milwaukee, tag pages, New Music Mondays show, RSS | Done |
| 7 | Every old hyfin.org address lands somewhere; content pages; sitemap; domain switch runbook | Done (switch pending) |

Before the beta: wipe the shared database's test posts, set `NEXT_PUBLIC_SITE_URL`, and finish Tarik's review queue. After launch: artist pages (from play history, stories and concerts), drops, podcasts, listener accounts.

## The CDS spec and MCP server

NPR documents CDS in prose but publishes no machine-readable spec. We wrote one while building this site and moved it to its own repo, [npr-cds-openapi](https://github.com/tmoody1973/npr-cds-openapi), so other stations can use it. From it, [Cortex](https://github.com/cortex-docs/cortex) generates an MCP server (a tool AI assistants can call) with one tool per CDS operation.

```bash
npx -y npr-cds-mcp setup                                 # asks for your CDS token once
claude mcp add npr-cds -s user -- npx -y npr-cds-mcp
```

Then ask Claude things like "what are the three newest Ladies First episodes?" Details are in that repo's README.

## Contributing

Issues and pull requests are welcome, especially from other NPR member stations using CDS. Work happens on branches with a pull request; CI must pass, and every deploy is smoke-tested with real page requests. Decisions that could reasonably have gone another way get a record in `docs/decisions/`; the "what actually happened" line is written by a human, after the fact.

## License

MIT for the code and docs we wrote. Use of CDS content is governed by NPR's API Terms of Use for Stations.
