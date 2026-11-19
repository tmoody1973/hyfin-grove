# Launch plan 6: Homepage, section pages, tag pages and RSS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The front door: a homepage built from real posts, live playlist, shows and concerts, plus Music, Culture and Milwaukee section pages, tag pages, a New Music Mondays show page, and the RSS feed old `/feed/` links need.

**Architecture:** Server-rendered pages reading Payload (posts, shows, tags) and the plan 4–5 rm-playlist reads (playlist, concerts). A small Payload global, **Front page**, lets editors pin the lead story for the homepage and each section; without a pin, the newest post with an image leads. One `StoryCard` component and one paged post query serve every list.

**Tech Stack:** Next.js 16.4.6, Payload 3.94.0 (globals, migrations with `push: false`), Vitest.

**Spec:** `docs/superpowers/specs/2026-11-18-hyfin-site-launch-design.md` ("Pages at launch"; "Settled after the builder check": tag pages, Culture and Milwaukee reuse the Music layout; "WordPress freeze": New Music Monday's show page combines WordPress archive episodes and new CDS episodes; "Old links": `/feed/` → the new RSS feed). **Design:** Figma `ivuHFQdgrfMAxldRrsq3nP` (wins); HTML fallback `docs/mockups-html/screens/01-home/homepage.html`, `docs/mockups-html/screens/04-music/music-page.html`.

## Global Constraints

- Sections: `/music`, `/culture`, `/milwaukee` (the `Category` values in `lib/taxonomy.ts`); story pages stay at `/<category>/<slug>`.
- Every post list hides withdrawn CDS posts (`visible()` from `lib/postQueries.ts`).
- A story card's image: `heroImage` (Media) first, then `cds.imageUrl`, else a same-size placeholder. 1,344 posts today; about 10% have no image.
- Leaving out (with a reason in the PR): the mockup's Win banner and Win tickets (post-launch "Win"), Listening Room and "Review of the week" (post-launch; no review data), "From the feed" (no Instagram source), "On demand" (podcasts are post-launch), newsletter signup (no email provider), DJs tab (hosts are on the schedule page).
- rm-playlist failures never break the homepage: the playlist and concert blocks hide or show a one-line message.
- Old `/category/...`, `/tag/...` and `/feed/` addresses are redirected in plan 7; this plan creates their destinations.
- Concert accents use the site's red #ff0040 (Tarik, 2026-11-19).
- Schema changes: `pnpm payload migrate:create`, read it, `printf 'y\n' | pnpm payload migrate` (shared Neon database; additive only).

## Review Focus

1. A pinned lead story that is later withdrawn or deleted: the page falls back to the newest post with an image, never errors. (Task 2 test.)
2. A post with no image, a very long title, no excerpt, or no byline in every card layout. (Task 2 render tests.)
3. Paging past the end (`?page=999`), `?page=0`, `?page=abc`, an unknown section or tag: 404, not an empty page or a 500. (Task 3 and 4 tests.)
4. rm-playlist down: homepage still renders stories and shows; playlist and concert blocks degrade. (Task 5 check with a fake client.)
5. RSS: titles with `&`, quotes or emoji; CDS HTML bodies; the feed validates and links to `/<category>/<slug>`. (Task 6 tests.)

---

### Task 1: Front page global (pinned leads)

**Files:**
- Create: `globals/FrontPage.ts`; migration via `pnpm payload migrate:create front_page`
- Modify: `payload.config.ts` (`globals: [CdsSyncStatus, FrontPage]`)
- Test: `tests/frontPage.test.ts`

**Interfaces:**
- Produces: global slug `front-page` with optional relationship fields to `posts`: `homeLead`, `musicLead`, `cultureLead`, `milwaukeeLead`. Read: anyone (the site reads it); update: any logged-in editor.

- [ ] **Step 1: Failing test:** the global has the four optional `relationTo: "posts"` fields, public read, editor update.
- [ ] **Step 2–4:** FAIL, implement, generate and read the migration (additive), apply it, PASS.
- [ ] **Step 5:** Commit `feat: Front page global for pinned lead stories`.

### Task 2: Story cards and post queries

**Files:**
- Create: `components/stories/StoryCard.tsx`, `components/stories/LeadStory.tsx`, `lib/stories.ts`
- Test: `tests/stories/storyCard.test.ts`, `tests/stories/stories.test.ts`

**Interfaces:**
- Consumes: `visible`, `postPath`, `Category`.
- Produces:
  - `type Card = { id: number; title: string; href: string; excerpt: string | null; byline: string | null; publishedAt: string | null; imageUrl: string | null; imageAlt: string; label: string | null }` (`label` = show name, else first tag name)
  - `toCard(post): Card` (pure; image rule from Global Constraints)
  - `getPostPage({ category?, tagSlug?, showId?, page, perPage }): Promise<{ cards: Card[]; page: number; totalPages: number }>` (newest first, `visible()`, depth 1 for show, tags and hero image)
  - `getLead(pin: number | Post | null | undefined, category?): Promise<Card | null>` (the pinned post if it still exists and is visible, else the newest visible post with an image in that category)
  - `<StoryCard card size="sm" | "md" />`, `<LeadStory card label />`

- [ ] **Step 1: Failing tests:** `toCard` prefers `heroImage.url`, falls back to `cds.imageUrl`, then null; label is the show name, else the first tag; `StoryCard` renders a placeholder with the same box when there's no image, the full 200-character title, and no empty byline or date line; `getLead` (fake Payload) returns the pinned post, falls back when the pin is withdrawn or missing.
- [ ] **Step 2–4:** FAIL, implement, PASS.
- [ ] **Step 5:** Commit `feat: story cards and paged post queries`.

### Task 3: Section pages (Music, Culture, Milwaukee)

**Files:**
- Create: `app/(frontend)/[category]/page.tsx`, `lib/stories/params.ts`
- Modify: `tests/serverBundle.test.ts`
- Test: `tests/stories/params.test.ts`

**Interfaces:**
- Produces: `parsePage(sp): number | null` (positive integer, else `null` → 404 when > `totalPages`).

Page (mockup `music-page.html`, minus the post-launch parts): big title, tabs Stories / Shows / Milwaukee (Shows → `/shows`, Milwaukee → `/milwaukee`); the lead (`getLead(frontPage.<category>Lead, category)`); "Latest in <Section>" grid of 24 `StoryCard`s with `?page=` paging (prev/next links); a "Series" row of shows that have posts in this section (Music only); "Shows and DJs" links (Music only) to `/shows` and `/listen/schedule`. Culture and Milwaukee reuse the same layout without the Music-only rows. Unknown category → `notFound()` (the `[category]` segment already exists for stories). Metadata: title, description, canonical with `?page` only when > 1.

- [ ] **Step 1: Failing tests:** `parsePage` → 1 for missing; 3 for `"3"`; null for `"0"`, `"-1"`, `"abc"`, `"2.5"`, `["2","3"]` uses the first.
- [ ] **Step 2–4:** FAIL, implement, PASS; typecheck, lint, bundle guard.
- [ ] **Step 5:** Dev: `/music`, `/culture`, `/milwaukee` show real posts; `/music?page=2` works; `/music?page=999` and `/nope` 404; screenshots at 1440 and 390. Commit `feat: Music, Culture and Milwaukee pages`.

### Task 4: Tag pages and the New Music Mondays show

**Files:**
- Create: `app/(frontend)/tag/[slug]/page.tsx`, `scripts/assign-nmm.ts`
- Test: `tests/stories/tagPage.test.ts` (unknown tag → `notFound`, via an exported `resolveTag(slug)` with a fake Payload)

Tag page (spec: simple lists): title = tag name, its definition (`tagDescription`), 24 `StoryCard`s per page with paging; unknown slug → 404.

New Music Mondays (spec "WordPress freeze"): create a `new-music-mondays` show and assign it to (a) WordPress posts in New Music Monday's WordPress category (find the id from `docs/wp-census.md` or the WordPress API; `Shows.wpCategoryIds` holds it) and (b) CDS posts in its CDS series, if one exists (look it up with the npr-cds MCP `find_collection`; if found, add it to `SERIES_MAP` in `lib/cds/scope.ts` so new episodes get the show). The script has `--dry-run`, only sets `show` where it is empty, and prints counts.

- [ ] **Step 1: Failing test:** `resolveTag("nope")` → null; `resolveTag("new-releases")` → the tag.
- [ ] **Step 2–4:** FAIL, implement, PASS.
- [ ] **Step 5:** Run `scripts/assign-nmm.ts --dry-run`, check the count against the WordPress category's post count, then run it. Dev: `/tag/new-releases` and `/shows/new-music-mondays` list posts. Commit `feat: tag pages; New Music Mondays show combining archive and CDS`.

### Task 5: The homepage

**Files:**
- Modify: `app/(frontend)/page.tsx` (replace the early Ladies First page)
- Create: `components/home/SignalLog.tsx` (client; live, `useLiveQuery` on `plays:recentByStation`, 12 songs), `components/home/Originals.tsx`, `components/home/HeardLive.tsx`
- Delete: `listStories`, `metaLine` and their helpers in `lib/cds.ts` if nothing else uses them (check with grep); keep what `lib/cds/*` uses
- Test: `tests/home/home.test.ts`

Page (mockup `homepage.html`, minus the post-launch parts), in order:
1. **Signal log** beside the **lead story** (`getLead(frontPage.homeLead)`).
2. **Latest:** the 8 newest stories, all sections.
3. **Originals:** shows that have posts, newest first, each with its weekly slot when on the schedule.
4. **Heard on HYFIN. Live in Milwaukee.:** the next 4 concerts (plan 5 `inTown(upcomingOnly(...))`), Tickets, "All events".
5. **Milwaukee Made:** the Milwaukee lead plus 3 more Milwaukee stories.

Metadata: site title and description; schema.org `RadioStation` JSON-LD (name HYFIN, url, parent organization Radio Milwaukee, `sameAs` hyfin.org).

- [ ] **Step 1: Failing tests:** `SignalLog` renders the given plays newest first with times and links to `/listen/playlist`; `HeardLive` renders nothing for an empty list; the RadioStation JSON-LD builder has `@type: "RadioStation"` and escapes `<`.
- [ ] **Step 2–4:** FAIL, implement, PASS; typecheck, lint, bundle guard.
- [ ] **Step 5:** Dev: homepage shows real stories, live songs, Originals, concerts and Milwaukee Made; with `NEXT_PUBLIC_RM_PLAYLIST_CONVEX_URL` unset it still renders stories. Screenshots at 1440 and 390. Commit `feat: homepage from real stories, playlist, shows and concerts`.

### Task 6: RSS feed

**Files:**
- Create: `app/feed.xml/route.ts`, `lib/feed.ts`
- Test: `tests/feed.test.ts`

**Interfaces:**
- Produces: `renderFeed(items: FeedItem[], site: string): string` (RSS 2.0: channel title "HYFIN", link, description, `atom:link rel="self"`; per item `title`, `link`, `guid isPermaLink="true"`, `pubDate` RFC 822, `description` = excerpt, `dc:creator` = byline). Route: the 30 newest visible posts, `Content-Type: application/rss+xml; charset=utf-8`, cached 15 minutes.

- [ ] **Step 1: Failing tests:** XML-escapes `&`, `<`, quotes in titles and excerpts; emoji survive; `pubDate` like `Thu, 19 Nov 2026 14:00:00 GMT`; links are absolute `/<category>/<slug>`.
- [ ] **Step 2–4:** FAIL, implement, PASS.
- [ ] **Step 5:** Dev: `/feed.xml` parses (`xmllint --noout`). Add `<link rel="alternate" type="application/rss+xml">` to the root layout. Commit `feat: RSS feed`.

### Task 7: Navigation, smoke check, README

- [ ] **Step 1:** Header: the site name links home; nav already lists Music, Culture, Milwaukee, Listen, Events. Footer: Schedule, Playlist, Events, RSS.
- [ ] **Step 2:** `smoke.yml`: `/music 200`, `/culture 200`, `/milwaukee 200`, `/feed.xml 200`, `/tag/new-releases 200`.
- [ ] **Step 3:** README: pages table and roadmap (plan 6 done); Front page global in the Payload section.
- [ ] **Step 4:** Full suite, typecheck, lint, `pnpm build`. Commit; open the PR.
