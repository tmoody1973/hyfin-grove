# Launch plan 7: Every old hyfin.org address lands somewhere, then the domain switch

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. TDD per task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** All 3,883 addresses in Google Analytics (`docs/Pages_and_screens_Page_path_and_screen_class.csv`, 2023-01-01 to 2026-11-15) answer 200 after at most 2 redirects, except an agreed junk list. Then a sitemap, absolute canonical links, and a written runbook for switching hyfin.org to the new site.

**Spec:** `docs/superpowers/specs/2026-11-18-hyfin-site-launch-design.md`, "Old links" and "Settled after the builder check" (junk and malformed paths may 404, under a written exclusion list reviewed once).

**Where we start (probed 2026-11-19, top 6 addresses of each kind, following redirects):** the homepage and the 1,390 dated story addresses (297k views) already land on the right story. Everything else 404s:

| Kind | Addresses | Views | Example |
|---|---|---|---|
| One-segment pages | 412 | 56k | `/playlist-2/`, `/thewiz/`, `/aboutus/` (top 30 = 94% of views) |
| Other multi-segment | ~514 | 10k | `/hyfin-event/rb-live-milwaukee/`, `/wpautoterms/privacy-policy/` |
| Podcast link-outs | 469 | 3k | `/podcast/the-original-rainbow-coalition-2/` |
| Events / event / venue / organizer | 282 / 24 / 112 / 92 | 12k | `/events/blackity-black-holiday-market/` |
| Categories / tags / authors | 202 / 137 / 116 | 7k | `/category/news/music/verified/`, `/author/elementradiomilwaukee-org/` |
| Date archives, `/page/N/`, `/feed/` | 73 / 24 / … | 4k | `/2025/01/17/`, `/page/2/` |
| `/members/`, `/radiochannel/`, old `/shows/` | 12 / 4 / 19 | 3k | `/members/kim-shine-2/` |

## Global constraints
- **The GA CSV is never committed** (public repo). Task 1 adds it to `.gitignore`. Reports derived from it go to the git-ignored `.superpowers/` folder, never `docs/`.
- One resolver, `resolveLegacy(path)`, decides every old address, in this order: (1) the Redirects collection (staff-editable one-offs), (2) pattern rules, (3) null → the page's normal 404. It is called only where the site would otherwise 404, so live pages never pay for it.
- Redirects are permanent (308, Next's permanent redirect) and land in one hop where possible; the checker allows at most 2 (the trailing-slash hop plus ours).
- No redirect sends people off-site except to Radio Milwaukee's own donate page.
- Content pages keep their old address (`/thewiz`), not a redirect.

## Review focus
1. Open-redirect: a crafted old address (`//evil.com`, `/category/%2F%2Fevil.com`, `\\evil.com`) must never redirect off-site.
2. A Redirects row pointing at itself, or two rows in a loop: no infinite redirect.
3. Old addresses with query strings or odd encoding (`%E2%80%9C`, `?amp`, `/null`) don't 500.
4. The resolver must not slow down or change any page that exists today (only runs on the 404 path).

---

### Task 1: The link checker and its baseline
**Files:** `.gitignore` (add `docs/Pages_and_screens_*.csv`, `.superpowers/`), create `scripts/check-old-links.ts`, `data/link-check-exclusions.txt` (committed; patterns + one-line reason each), `lib/linkcheck.ts` (pure: classify a path, apply exclusions, summarize).
- [ ] Failing tests (`tests/linkcheck.test.ts`): classifies the kinds above; an exclusion pattern matches; pass = final 200 within 2 redirects; a redirect to another host fails.
- [ ] Implement. The script: `--base <url>` (default the Vercel production URL), `--csv <path>`, 8 at a time, follows redirects manually, writes `.superpowers/link-check/<date>.csv` (path, views, kind, hops, final path, final status) and prints a per-kind table.
- [ ] Run against production for the baseline (expect ~2,490 failing). Commit `chore: old-link checker and junk exclusion list`.

### Task 2: One legacy resolver, served from the 404 paths
**Files:** create `lib/legacy/resolve.ts`; modify `app/(frontend)/[category]/page.tsx`, `app/(frontend)/[category]/[slug]/page.tsx` (before `notFound()`), create `app/(frontend)/[...legacy]/page.tsx` (3+ segments; resolves or 404s).
**Interfaces:** `resolveLegacy(path: string, db): Promise<string | null>`; `safeTarget(to: string): string | null` (same-site paths, or exactly `https://radiomilwaukee.org/...`).
- [ ] Failing tests: Redirects row wins; `//evil.com`, `\\evil.com`, `https://evil.com` rejected by `safeTarget`; a self-redirect row is ignored; unknown → null.
- [ ] Implement; wire the three call sites with `permanentRedirect`. Commit `feat: old hyfin.org addresses resolve before 404`.

### Task 3: Pattern rules
**File:** `lib/legacy/patterns.ts` (pure where possible; lookups take `db`).
| Old | New |
|---|---|
| `/category/<…>/` | map table → `/music`, `/culture`, `/milwaukee` or a `/tag/<slug>` (e.g. `news/music/verified` → `/music`, `interviews` → `/tag/interviews`); unknown → `/` |
| `/tag/<slug>/` | our tag if it exists → `/tag/<slug>`; else the category its posts mostly sit in (by WordPress tag → imported posts), else `/` |
| `/author/<wp-login>/` | matching host (`/hosts/<slug>`) via a small map of WordPress logins; else `/` |
| `/events/…`, `/event/…`, `/venue/…`, `/organizer/…`, `/hyfin-event/…` | `/events` |
| `/podcast/<slug>/` | an imported post with that WordPress slug if any; else `/shows` |
| `/members/<slug>/` | `/hosts/<slug>` if it exists; else `/listen/schedule` |
| `/radiochannel/…` | `/listen/playlist` |
| `/shows/<old>/` (not a current show) | `/shows` |
| `/YYYY/`, `/YYYY/MM/`, `/YYYY/MM/DD/`, `/page/<n>/` | `/` |
| `/feed/`, `/<anything>/feed/` | `/feed.xml` |
| `/wp-content/uploads/<file>` | the same file in Blob via `Media.sourceUrl`; else 404 |
- [ ] Failing tests per row (fake db); implement; commit `feat: pattern rules for old categories, tags, authors, events, podcasts`.

### Task 4: One-offs in the Redirects collection
**Files:** `data/legacy-redirects.json` (committed: from → to, with a note), `scripts/seed-redirects.ts` (`--dry-run`; creates missing rows, never edits staff's).
- [ ] Draft the list from the top one-segment and "other" addresses (e.g. `/playlist-2/` → `/listen/playlist`, `/shows-schedule/` and `/hyfin-schedule/` → `/listen/schedule`, `/team-members/` → `/listen/schedule`, `/rhythmlab/` → `/shows/rhythm-lab`, `/news-culture/` → `/culture`, `/support/` and `/support-hyfin/` → Radio Milwaukee's donate page, `/contacts/` → `/aboutus`, `/home-page-3-2/` and `/my-account/` → `/`). **Tarik reviews the list before seeding.**
- [ ] Seed; commit `feat: one-off old addresses in the Redirects collection`.

### Task 5: Content pages keep their addresses
**Files:** create `collections/Pages.ts` (title, slug, body rich text, hero image; drafts off, like Posts), migration, `scripts/import-wp-pages.ts` (reuses the WordPress import's body converter), modify `app/(frontend)/[category]/page.tsx` (a non-category slug that is a Page renders it).
- [ ] List hyfin.org pages from the WordPress API with real content among the CSV's one-segment addresses (expected: `/thewiz/`, `/harlem/`, `/blackity-black-holiday-market/`, `/antigala/`, `/mkemade/`, `/hyfin-100/`, `/hyfins-black-business-initiative/`, `/aboutus/`). **Tarik confirms the list.**
- [ ] Failing tests (page lookup; Pages never shadow a category); implement; import; check `/thewiz` in dev. Commit `feat: hyfin.org content pages at their old addresses`.

### Task 6: Sitemap, robots, absolute canonicals
**Files:** `app/sitemap.ts` (home, sections, tags, shows, hosts, events, every visible post, Pages; not `/npr/`), `app/robots.ts`, `app/(frontend)/layout.tsx` (`metadataBase: new URL(SITE_URL)`).
- [ ] Failing tests (sitemap includes a post and a page, excludes withdrawn posts and `/npr/`); implement; `canonical` renders absolute. Commit `feat: sitemap, robots, absolute canonical links`.

### Task 7: Full check, exclusions, smoke
- [ ] Run the checker against the Vercel preview. Fix real misses; everything still failing goes in `data/link-check-exclusions.txt` with a reason. **Tarik reviews the exclusion list once** (spec).
- [ ] `smoke.yml`: one address per pattern row (e.g. `/playlist-2/`, `/category/interviews/`, `/thewiz/`).
- [ ] README: Old links section. Final whole-branch review; PR.

### Task 8: Domain switch runbook (written, not executed)
**File:** `docs/runbooks/domain-switch.md`. Steps for Tarik, with checks after each: Vercel domain + DNS, `NEXT_PUBLIC_SITE_URL`, the Google OAuth redirect URI, Search Console sitemap, re-run the checker against hyfin.org, and the before-beta list (wipe test posts, review queue, staff roles). Rollback: point DNS back to WordPress.
- [ ] Write it; Tarik reads it. Commit `docs: domain switch runbook`.
