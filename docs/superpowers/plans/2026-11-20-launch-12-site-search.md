# Launch plan 12: Site search for visitors

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A visitor types anything (an artist, a show, a host, an event, a phrase from a story) into a search box on every page and gets the right HYFIN result first. Results come grouped, show their snippet with the match highlighted, survive typos ("kendirck"), and answer in well under a second.

**Architecture:** Search runs inside the Postgres database we already have; there's no new vendor. Payload's search plugin keeps one `search` row per searchable thing: stories, shows, hosts, events and pages. Each row carries its title, type, address, date, image and a plain-text body. A migration adds a weighted full-text column and two indexes: a GIN index (a lookup table so Postgres doesn't read every row) on that column, and a trigram index (word fragments, for typo matching) on titles. One server query ranks matches by text relevance, then title weight, then recency. Songs come from rm-playlist's existing play search (`getPlays({ q })`), shown as their own group. `/search?q=` renders on the server (shareable, works without JavaScript). The header gets a search button that opens a quick panel with results as you type.

**Tech Stack:** Payload 3 search plugin (`@payloadcms/plugin-search`, already installed), Postgres full-text search (`tsvector`, `websearch_to_tsquery`, `ts_rank_cd`, `ts_headline`), the `unaccent` and `pg_trgm` extensions on Neon, Next.js 16 App Router, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-18-hyfin-site-launch-design.md`. Search was a launch "nice to have" (the admin index was built in plan 2 "for public site search later", `payload.config.ts`). Tarik asked for strong visitor search on 2026-11-20. GitHub issue: see the issue linked in the PR.

## Global Constraints
- **No new service or vendor.** Postgres on Neon does the work. A hosted engine (Algolia, Typesense, Meilisearch, Upstash) is the fallback only if Task 5's measurements miss the targets below, and then goes through the Vercel Marketplace (decision record first).
- **What's searchable:**

  | Kind | Address |
  |---|---|
  | Stories | `visible()` only: never withdrawn or review-held |
  | Shows | `/shows/<slug>` |
  | Hosts | `/hosts/<slug>` |
  | Events | public only, through `upcomingWhere`/`pastWhere` visibility (published, not hidden) |
  | Pages | `/thewiz` etc. |
  | Songs | rm-playlist plays, last 30 days |

  NPR's own stories stay out (decision 010: display-only, canonical npr.org).
- **Ranking:** title matches beat body matches (weights A title, B excerpt/artist/venue, C body). Upcoming events get a boost. Among equal relevance, newer first.
- **Targets:** p95 server time under 150 ms for the search query on the production database. First keystroke to results in the quick panel under 400 ms on a phone.
- **Typos:** when full-text search returns fewer than 3 results, a trigram title match (`similarity > 0.3`) fills in, and the page offers "Did you mean …".
- **Privacy:** queries are logged without anything identifying the visitor (no IP, no user id): query text, result count, timestamp. That's enough to find zero-result searches.
- **Search pages are `noindex`.** The home page declares a schema.org `SearchAction`, so Google can show a search box for HYFIN.
- **Glitch rules apply** (headlines only). The search input and results are body text: no effects.

## Review Focus
1. **A query with Postgres-special characters** (`'`, `&`, `:*`, `!`, very long text): `websearch_to_tsquery` never throws, and input is capped at 100 characters. Test in Task 3.
2. **A withdrawn story or a hidden/draft event is never found.** The index only holds public items, and the read filter checks again. Test in Task 2 (sync hook) and Task 3 (query).
3. **An edit shows up in search.** A story edit, a withdrawal, an event hidden, a show renamed: each updates or removes its search row on save. Test in Task 2.
4. **Accents and case:** "Beyonce" finds "Beyoncé"; "TEMS" finds "Tems". Test in Task 3.
5. **Empty, one-letter and only-stopword queries** ("the") show the suggestions state, not an error or the whole archive. Test in Task 3.

---

### Task 1: Search rows for every kind of content
**Files:** modify `payload.config.ts` (`searchPlugin` collections: posts, shows, hosts, events, pages; `searchOverrides.fields` add `kind`, `href`, `date`, `imageUrl`, `body`, `excerpt`; `beforeSync`), create `lib/search/sync.ts` (`toSearchRow(collection, doc): SearchRow | null`, which returns null when the item isn't public), migration `pnpm payload migrate:create search_fields`.
- [ ] Failing tests (`tests/search/sync.test.ts`): a story produces kind `story` with `href` from `postPath` and plain text from Lexical `body` or `cdsBody`; a withdrawn story → null; an event hidden or in draft → null; a show and a host → their addresses; text over 20,000 characters is truncated.
- [ ] Implement; migrate (shared database: ledger it); reindex once from the admin (Search → Reindex) or with a script; count rows by kind.
- [ ] Commit `feat: search rows for stories, shows, hosts, events and pages`.

### Task 2: Keep rows in step with edits
**Files:** `lib/search/sync.ts`, collection hooks where the plugin's own sync can't see visibility (withdrawn CDS stories, hidden events).
- [ ] Failing tests: withdrawing a story deletes its row; hiding an event deletes its row, and unhiding re-adds it; renaming a show updates its row's title.
- [ ] Implement with `afterChange`/`afterDelete` hooks that pass `req` (same transaction) and use a `context` flag against loops (payload skill).
- [ ] Commit `feat: search index follows edits, withdrawals and hidden events`.

### Task 3: The ranked query
**Files:** migration `search_fts` (raw SQL: `CREATE EXTENSION IF NOT EXISTS unaccent, pg_trgm`; an immutable `unaccent` wrapper; a generated `tsvector` column weighted A/B/C; GIN index; trigram GIN index on title), `lib/search/query.ts`.
**Interfaces:** `searchSite(db, { q: string; kind?: Kind; limit?: number; offset?: number }): Promise<{ results: SearchHit[]; total: number; suggestion: string | null }>`; `SearchHit = { kind; title; href; date; imageUrl; snippet /* ts_headline, <mark> only */ }`; `normalizeQuery(raw): string | null` (trim, collapse spaces, cap 100, null when shorter than 2 or only stopwords).
- [ ] Failing tests: `normalizeQuery` cases from Review Focus 1, 4 and 5. Integration test against a Neon branch (not the shared database): seeded rows rank title over body and upcoming events up; "Beyonce" finds "Beyoncé"; "kendirck lamar" suggests "Kendrick Lamar"; snippets escape everything except `<mark>`.
- [ ] Implement; `EXPLAIN ANALYZE` on production-size data shows index scans; record p95 over 50 real queries.
- [ ] Commit `feat: ranked full-text search with typo suggestions`.

### Task 4: The /search page and the header search
**Files:** `app/(frontend)/search/page.tsx` (server, `?q=&kind=&page=`), `app/api/search/route.ts` (GET, JSON for the quick panel, rate-limited per IP in memory: 30/minute), `components/search/SearchPanel.tsx` (`"use client"`: ARIA combobox, debounced 200 ms, arrow keys, Esc, `/` shortcut), header button in `app/(frontend)/layout.tsx`, `SearchAction` JSON-LD on the home page, `robots` noindex on `/search`.
- [ ] Failing tests: the route returns 400 for an empty query and 429 past the limit; snippets are sanitized; the page groups results by kind, with Songs from `getPlays({ q })` (whole-name artist matches).
- [ ] Implement in the Signal style: big input, kind chips (All, Stories, Shows, Hosts, Events, Songs, Pages), results with the type label, date and snippet; empty state with popular searches and the newest stories.
- [ ] Browser: desktop and phone; keyboard-only run; screen reader announces the result count.
- [ ] Commit `feat: /search and the header search panel`.

### Task 5: Measure, log, decide
**Files:** `collections/SearchQueries.ts` (admin-only: query, results, createdAt; a 90-day cleanup in the cron), `docs/decisions/014-site-search-in-postgres.md`.
- [ ] Log each query (no visitor data). Admin list view sorted by count, with a "zero results" filter.
- [ ] Measure the targets on production (p95 query time, panel time on a phone). If either misses, the decision record compares a hosted engine before anything is added.
- [ ] Old-link check, smoke (`/search?q=tems 200`), final review, PR.

## Out of scope (later)
Semantic "search by meaning" (embeddings with pgvector on the same Neon database), searching inside audio transcripts, NPR stories, personalised results.
