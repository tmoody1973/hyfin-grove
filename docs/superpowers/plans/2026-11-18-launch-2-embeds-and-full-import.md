# HYFIN launch, plan 2 of 7: embeds and the full WordPress import — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** All ~1,252 WordPress posts are in Payload with their YouTube, Spotify, Spreaker, NPR, PRX, Bandcamp and other players working, sorted by Jev, and the ~273 posts that need Tarik's eyes are queued for review.

**Architecture:** One Payload rich-text block, `embed`, holds a validated player URL; an `audio` block holds an MP3 that plays in the persistent player. The importer pulls every embed out of the WordPress HTML before conversion, leaving a marker paragraph, converts the rest with `convertHTMLToLexical`, then swaps each marker for its block node. The story page renders blocks through an allowlist: only known providers become iframes. A bulk runner imports every post with per-post timeouts, reuses setup across posts, skips already-imported posts unless asked, and writes a report.

**Tech Stack:** Payload 3.94.0 (`BlocksFeature` in `@payloadcms/richtext-lexical`), Next.js 16.4.6, jsdom, Vitest. Same Neon database and Blob store as plan 1.

**Spec:** `docs/superpowers/specs/2026-11-18-hyfin-site-launch-design.md` (order of work, step 2). **Design:** Figma `ivuHFQdgrfMAxldRrsq3nP`; HTML fallback `docs/mockups-html/screens/05-stories/article-with-audio-player.html`. **Evidence:** `docs/wp-census.md`, plan 1 ledger at `.superpowers/sdd/2026-11-18-launch-1-first-slice/progress.md`.

**Scope change from the spec, for Tarik to confirm:**
- The 3,883-path old-link check and the one-off redirects move to the launch-checks plan. Most of their targets (category, events, schedule and host pages) are built in plans 4–6. The check gates the domain switch, not the Dec 1 beta.
- WordPress **pages are Elementor layouts**: the REST API even emits Elementor HTML ahead of its JSON. They can't be converted automatically, so the few with real content (`/thewiz/`, `/harlem/`, `/mkemade/`, `/blackity-black-holiday-market/`, `/aboutus/`) are a hand rebuild, listed for Tarik, and not in this plan.

## Global Constraints

- Every `payload` / `@payloadcms/*` package stays exactly `3.94.0`. No Payload 4 beta.
- Embed allowlist (iframe providers): YouTube, Spotify, Spreaker, NPR, PRX, Bandcamp, Odesli, Apple Music, Apple Podcasts, SoundCloud, Mixcloud. Anything else renders as a plain link.
- Social posts (Instagram, Twitter/X, TikTok) render as a link card. **No third-party scripts load on story pages.**
- YouTube renders from `https://www.youtube-nocookie.com/embed/<id>`. Every iframe has `loading="lazy"` and a `title`.
- Review rule (spec + Tarik): `needsReview` when Jev's category confidence < `0.7`, OR the post is in the top 100 by CSV views, OR it was published on/after `2025-05-18` (last 18 months). A post Tarik has reviewed is never re-sorted.
- The WordPress import still skips category `1169` (Ladies First).
- Scripts load `.env.local` via `pnpm import:wp` / `pnpm seed:tags` (`tsx --env-file`).
- Port 3000 is another app on Tarik's machine: use port 3007 for dev, and stop only this repo's server.
- Work on branch `feat/launch-2-embeds-import` from `main`. Never commit to `main`.

## Review Focus

1. **An embed inside a list item or a paragraph with other text.** The surrounding text must survive; the embed becomes its own block right after that paragraph. Test in Task 3.
2. **A YouTube URL in any of its shapes** (`/embed/ID?enablejsapi=1&…`, `youtu.be/ID`, `watch?v=ID`, `/shorts/ID`) must yield the same clean player. Test in Task 1.
3. **A post whose only content is an embed** (no paragraphs) must still import with a valid body. Test in Task 3.
4. **The bulk run hitting a bad post** (timeout, Jev error, broken HTML) must record the failure and carry on, and a rerun must retry only the failures. Test in Task 5.
5. **An `http:` or protocol-relative (`//`) iframe source** must be normalized to `https:` or rejected, never rendered as-is. Test in Task 1.

---

### Task 1: Embed detection and the allowlist

**Files:**
- Create: `lib/embeds.ts`
- Test: `tests/embeds.test.ts`

**Interfaces:**
- Produces:
  - `type EmbedProvider = "youtube" | "spotify" | "spreaker" | "npr" | "prx" | "bandcamp" | "odesli" | "apple-music" | "apple-podcasts" | "soundcloud" | "mixcloud" | "instagram" | "twitter" | "tiktok"`
  - `type Embed = { provider: EmbedProvider; url: string; title: string | null }`. `url` is the cleaned player URL, or for social providers the post's permalink.
  - `embedFromUrl(raw: string, title?: string | null): Embed | null`: null for unknown hosts or non-http(s) URLs. Protocol-relative and `http:` become `https:`.
  - `isSocial(p: EmbedProvider): boolean`
  - `playerHeight(e: Embed): number | "16:9"`: `"16:9"` for YouTube; Spotify 152 (track) or 352 (album/artist/playlist); Spreaker 200; NPR 235; PRX 200; Bandcamp 120; Odesli 152; Apple 175; SoundCloud 166; Mixcloud 120.

- [ ] **Step 1: Write failing tests** with the real URLs from the census (post IDs in comments):
  ```ts
  // 438884
  expect(embedFromUrl("https://www.youtube.com/embed/fEpUD3mHFJU?enablejsapi=1&autoplay=0")).toEqual({ provider: "youtube", url: "https://www.youtube-nocookie.com/embed/fEpUD3mHFJU", title: null });
  for (const u of ["https://youtu.be/fEpUD3mHFJU", "https://www.youtube.com/watch?v=fEpUD3mHFJU&t=3", "https://www.youtube.com/shorts/fEpUD3mHFJU", "//www.youtube.com/embed/fEpUD3mHFJU"])
    expect(embedFromUrl(u)?.url).toBe("https://www.youtube-nocookie.com/embed/fEpUD3mHFJU");
  expect(embedFromUrl("https://open.spotify.com/embed/artist/2CQAfzpwwaMxj3YNlb4Gbj?utm_source=generator")?.provider).toBe("spotify"); // 73009
  expect(embedFromUrl("https://widget.spreaker.com/player?episode_id=68726131&theme=light")?.provider).toBe("spreaker"); // 438884
  expect(embedFromUrl("https://www.npr.org/player/embed/nx-s1-4526570/nx-s1-9546829")?.provider).toBe("npr"); // 438891
  expect(embedFromUrl("https://play.prx.org/e?ge=prx_13461_4b6e")?.provider).toBe("prx"); // 441423
  expect(embedFromUrl("https://bandcamp.com/EmbeddedPlayer/album=954092468/size=large/")?.provider).toBe("bandcamp"); // 438379
  expect(embedFromUrl("https://odesli.co/embed/?url=https%3A%2F%2Falbum.link%2Fi%2F1839850101&theme=dark")?.provider).toBe("odesli"); // 438937
  expect(embedFromUrl("http://open.spotify.com/embed/track/abc")?.url.startsWith("https://")).toBe(true);
  expect(embedFromUrl("https://evil.example.com/embed/x")).toBeNull();
  expect(embedFromUrl("javascript:alert(1)")).toBeNull();
  expect(embedFromUrl("https://www.instagram.com/p/CxOJNsNRzub/?utm_source=ig_embed")).toEqual({ provider: "instagram", url: "https://www.instagram.com/p/CxOJNsNRzub/", title: null });
  expect(playerHeight({ provider: "youtube", url: "x", title: null })).toBe("16:9");
  ```
- [ ] **Step 2:** Run `pnpm test tests/embeds.test.ts`. Expected: FAIL, module missing.
- [ ] **Step 3:** Implement with `new URL()`. Match providers by hostname suffix, never by substring. Strip tracking parameters (`utm_*`, `enablejsapi`, `autoplay`, `cc_*`, `iv_load_policy`, `loop`, `rel`, `modestbranding`). Keep the parameters a player needs (`episode_id` for Spreaker, `ge` and `uf` for PRX, `url` for Odesli).
- [ ] **Step 4:** Run tests. Expected: PASS. Run `pnpm test`. Expected: all green.
- [ ] **Step 5: Commit.** `git commit -m "feat: embed detection with a provider allowlist"`

### Task 2: Embed and audio blocks, and how the story page draws them

**Files:**
- Create: `blocks/Embed.ts`, `blocks/Audio.ts`, `components/story/EmbedBlock.tsx`, `components/story/AudioBlock.tsx`
- Modify: `payload.config.ts` (editor: `lexicalEditor({ features: ({ defaultFeatures }) => [...defaultFeatures, BlocksFeature({ blocks: [Embed, Audio] })] })`), `app/(frontend)/[category]/[slug]/page.tsx` (add `blocks: { embed, audio }` to the existing `converters`), `app/(frontend)/globals.css`
- Test: `tests/blocks.test.ts`

**Interfaces:**
- Consumes: Task 1's `Embed`, `embedFromUrl`, `isSocial` and `playerHeight`; plan 1's `PlayButton({ url, title, href })`.
- Produces:
  - Block slug `embed`, fields `url` (text, required, validated: `embedFromUrl(value) !== null` or the message "Not a supported embed (YouTube, Spotify, Spreaker, NPR, PRX, Bandcamp, Odesli, Apple, SoundCloud, Mixcloud, Instagram, Twitter, TikTok)"), `provider` (select, read-only, set by a `beforeValidate` hook from `url`), `title` (text).
  - Block slug `audio`, fields `url` (text, required, http(s) only), `title` (text).
  - `EmbedBlock({ url, provider, title })` (server component): renders an allowlisted iframe, or for social providers a link card ("View on Instagram →", mono, white border). Unknown providers render a plain link.
  - `AudioBlock({ url, title, href })`: a `PlayButton` labelled with the title.

- [ ] **Step 1: Write failing tests:**
  ```ts
  const validate = Embed.fields.find((f) => "name" in f && f.name === "url")!.validate as (v: string) => true | string;
  expect(validate("https://youtu.be/abc12345678")).toBe(true);
  expect(validate("https://evil.example.com/x")).toMatch(/Not a supported embed/);
  // provider hook
  const hook = (Embed.fields.find((f) => "name" in f && f.name === "provider") as any).hooks.beforeValidate[0];
  expect(hook({ siblingData: { url: "https://open.spotify.com/embed/track/x" } })).toBe("spotify");
  ```
  Also render tests with `react-dom/server`'s `renderToStaticMarkup`:
  ```ts
  const yt = renderToStaticMarkup(EmbedBlock({ url: "https://www.youtube.com/embed/abc12345678", provider: "youtube", title: "Clip" }));
  expect(yt).toContain('src="https://www.youtube-nocookie.com/embed/abc12345678"'); expect(yt).toContain('loading="lazy"'); expect(yt).toContain('title="Clip"');
  expect(renderToStaticMarkup(EmbedBlock({ url: "https://evil.example.com/x", provider: "youtube", title: null }))).not.toContain("<iframe");
  expect(renderToStaticMarkup(EmbedBlock({ url: "https://www.instagram.com/p/x/", provider: "instagram", title: null }))).toContain("View on Instagram");
  ```
- [ ] **Step 2:** Run `pnpm test tests/blocks.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - `EmbedBlock` **re-runs `embedFromUrl` on the stored URL**, so the allowlist is enforced at render time, not just on save.
  - YouTube is `aspect-video w-full`. Other providers use `playerHeight`. Iframes get no `allow-*` beyond `encrypted-media; picture-in-picture; fullscreen`.
  - Read ui-sdk and Figma for the link-card look. If Figma is unreachable, use the article mockup's "See it on Instagram" button style.
- [ ] **Step 4:** Run `pnpm payload generate:types`, then `pnpm payload generate:importmap`, then tests. Expected: PASS. No migration is needed: rich text is stored as JSON. Confirm `pnpm payload migrate:create` reports no changes.
- [ ] **Step 5: Verify in the admin.** Open the SZA post, insert an Embed block with `https://youtu.be/dp45V_M4Akw`, and save. Expected: the provider shows "youtube". Open the story page. Expected: a 16:9 player. Revert the edit afterwards.
- [ ] **Step 6: Commit.** `git commit -m "feat: embed and audio blocks rendered through the allowlist"`

### Task 3: Importer turns WordPress embeds into blocks

**Files:**
- Create: `lib/wordpress/embedsInHtml.ts`
- Modify: `lib/wordpress/transform.ts` (`prepareBodyHtml` also strips `[irp …]` shortcodes, `wp-block-yoast-seo-related-links`, `<script>`, `<style>`, `<noscript>`, and decorative `<svg>`; gallery figures are unwrapped into their inner image figures), `lib/wordpress/importPost.ts`
- Test: `tests/embedsInHtml.test.ts`, fixtures `tests/fixtures/wp-embeds/*.html` (real snippets from posts 438884, 73009, 438891, 441423, 438379, 438937, 72761, 73002, 71908, 27571, 73020, 72216)

**Interfaces:**
- Consumes: Task 1's `embedFromUrl`; Task 2's block slugs `embed` and `audio`.
- Produces:
  - `extractEmbeds(html: string): { html: string; embeds: Array<{ kind: "embed"; embed: Embed } | { kind: "audio"; url: string; title: string | null }> }`. Each embed's element (its `figure.wp-block-embed` / `figure.wp-block-audio` wrapper when present, else the bare `iframe` / `audio` / social `blockquote`) becomes `<p>HYFIN-EMBED-<n></p>`. Iframes from non-allowlisted hosts become a link paragraph, as in plan 1.
  - `insertEmbedBlocks(state, embeds): state`: replaces each paragraph whose only text is `HYFIN-EMBED-<n>` with `{ type: "block", version: 2, format: "", fields: { id: <24 hex>, blockName: "", blockType: "embed" | "audio", ...fields } }` (shape verified in `node_modules/@payloadcms/richtext-lexical/dist/features/blocks/server/nodes/BlocksNode.js`). Returns a new state; it never mutates.

- [ ] **Step 1: Write failing tests**, one per fixture, asserting the embed list and the markers. For example:
  ```ts
  const r = extractEmbeds(fixture("438884-youtube-spreaker"));
  expect(r.embeds.map((e) => e.kind === "embed" ? e.embed.provider : "audio")).toEqual(["youtube", "spreaker"]);
  expect(r.html).toContain("<p>HYFIN-EMBED-0</p>"); expect(r.html).not.toContain("<iframe");
  expect(extractEmbeds(fixture("72761-audio")).embeds[0]).toMatchObject({ kind: "audio", url: expect.stringContaining("megaphone.fm") });
  expect(extractEmbeds(fixture("73002-instagram")).html).not.toContain("<script");
  expect(prepareBodyHtml(fixture("72216-irp"), new Map())).not.toMatch(/\[irp/);
  ```
  Review Focus 1: `<p>Text before <iframe src="https://youtu.be/x1234567890"></iframe> after</p>` keeps "Text before" and "after", with the marker in its own paragraph right after.

  Review Focus 3: a body that is only an iframe gives one marker paragraph; `insertEmbedBlocks` on its converted state gives a root holding exactly one block node.
- [ ] **Step 2:** Run `pnpm test tests/embedsInHtml.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement**, then wire into `importPost`. The order is `extractEmbeds` → `prepareBodyHtml` → `convertHTMLToLexical` → `numericUploadIds` → `insertEmbedBlocks`.
- [ ] **Step 4:** Run `pnpm test`. Expected: all green.
- [ ] **Step 5: Re-import post 438884** with `pnpm import:wp --slug <its slug>` and open it on port 3007. Expected: a YouTube player and a Spreaker player in place of links. Then re-import SZA. Expected: two YouTube players where the screenshot showed bare links.
- [ ] **Step 6: Commit.** `git commit -m "feat: importer turns WordPress embeds into Payload blocks"`

### Task 4: The review queue

**Files:**
- Create: `lib/reviewRules.ts`, `lib/traffic.ts`
- Modify: `collections/Posts.ts` (in the `sorting` group: `reasons`, a select with `hasMany`: `low-confidence`, `top-traffic`, `recent`; `reviewed` checkbox; a `beforeChange` hook sets `reviewedAt` when `reviewed` turns true from an editor, i.e. `req.user` is present; admin `defaultColumns` gains the category and `sorting.needsReview`), `lib/wordpress/importPost.ts`
- Test: `tests/reviewRules.test.ts`

**Interfaces:**
- Produces:
  - `loadPostViews(csvPath = "docs/Pages_and_screens_Page_path_and_screen_class.csv"): Map<string /*wpSlug, lowercase*/, number>`
  - `topSlugs(views: Map<string, number>, n = 100): Set<string>`
  - `reviewReasons(p: { categoryConfidence: number; wpSlug: string; publishedAt: string }, ctx: { top: Set<string>; recentSince: string /* "2025-05-18" */ }): Array<"low-confidence" | "top-traffic" | "recent">`. `needsReview` is `reasons.length > 0`.

- [ ] **Step 1: Write failing tests:**
  ```ts
  const ctx = { top: new Set(["sza"]), recentSince: "2025-05-18" };
  expect(reviewReasons({ categoryConfidence: 0.9, wpSlug: "x", publishedAt: "2024-01-01T00:00:00Z" }, ctx)).toEqual([]);
  expect(reviewReasons({ categoryConfidence: 0.5, wpSlug: "sza", publishedAt: "2025-06-01T00:00:00Z" }, ctx)).toEqual(["low-confidence", "top-traffic", "recent"]);
  const v = loadPostViews(); expect(v.get("szas-lyrics-validate-my-experience-as-a-black-woman")).toBe(31389); expect(topSlugs(v).size).toBe(100);
  ```
- [ ] **Step 2:** Run `pnpm test tests/reviewRules.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement. Sum views across path variants: trailing slash or not, any case.
- [ ] **Step 4:** Run tests. Expected: PASS. Then `pnpm payload migrate:create review-reasons` and `pnpm payload migrate` (new columns). Expected: a migration file is created, and `migrate` reports Done.
- [ ] **Step 5: Verify in the admin.** Posts list → filter `Needs review = true`. Expected: the Milt Newton post (low-confidence) and SZA (top-traffic) appear. Tick "Reviewed" on Milt Newton and save. Expected: `reviewedAt` is set; rerunning `pnpm import:wp --slug <milt slug>` leaves its category untouched.
- [ ] **Step 6: Commit.** `git commit -m "feat: review queue for unsure, high-traffic and recent posts"`

### Task 5: Bulk import runner

**Files:**
- Create: `lib/wordpress/bulk.ts`
- Modify: `lib/wordpress/importPost.ts` (takes an `ImportContext` built once per run), `scripts/import-wp.ts` (`--all`, `--refresh`, `--retry-failed`, `--limit <n>`, `--concurrency <n>`, default 2)
- Test: `tests/bulk.test.ts`

**Interfaces:**
- Produces:
  - `type ImportContext = { tags; shows; editorConfig; top: Set<string>; recentSince: string; apiKey: string }`, built by `buildImportContext(payload, apiKey)`.
  - `runBulk(items: WpPost[], run: (wp: WpPost) => Promise<ImportResult>, opts: { concurrency: number; perPostTimeoutMs: number; onResult(r: BulkRow): void }): Promise<BulkSummary>`, where `BulkRow = { wpId; slug; status: "created" | "updated" | "skipped" | "excluded" | "failed"; category?; confidence?; reasons?; embeds?; imagesFailed?; error? }`.
  - `selectPosts(all: WpPost[], existingWpIds: Set<number>, failedWpIds: Set<number>, flags): WpPost[]`.
  - Reports go to `docs/migration/import-report.csv` (one row per post, overwritten each full run) and `docs/migration/import-summary.md`: totals, per-category counts, per-tag counts with tags under 10 flagged, review-set size, failures.

- [ ] **Step 1: Write failing tests** with fake `run` functions:
  ```ts
  // Review Focus 4: one post hangs, one throws; the rest finish and both failures are recorded
  const rows: BulkRow[] = [];
  const summary = await runBulk([a, b, c], async (wp) => wp === b ? new Promise(() => {}) : wp === c ? Promise.reject(new Error("Jev 500")) : ok(wp), { concurrency: 2, perPostTimeoutMs: 50, onResult: (r) => rows.push(r) });
  expect(summary).toMatchObject({ total: 3, failed: 2 });
  expect(rows.find((r) => r.wpId === b.id)?.error).toMatch(/timed out after 50ms/);
  expect(selectPosts([a, b, c], new Set([a.id]), new Set([b.id]), { retryFailed: true })).toEqual([b]);
  expect(selectPosts([a, b, c], new Set([a.id]), new Set(), {})).toEqual([b, c]); // skips imported unless --refresh
  ```
- [ ] **Step 2:** Run `pnpm test tests/bulk.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement. The concurrency limit is a small promise pool, with no new dependency. The per-post timeout uses `Promise.race` against a timer that is cleared on settle.
- [ ] **Step 4:** Run `pnpm test`. Expected: all green.
- [ ] **Step 5: Dry run on 20 posts** with `pnpm import:wp --all --limit 20`. Expected: 20 rows in the report, the summary shows category counts, and no unhandled errors. Spot-check 3 of the 20 in the browser.
- [ ] **Step 6: Commit.** `git commit -m "feat: bulk WordPress import with timeouts, resume and report"`

### Task 6: Run the full import (ask Tarik first)

**Files:** none changed. The output goes to `docs/migration/`.

- [ ] **Step 1: Stop and ask Tarik.** This writes ~1,250 posts to the shared Neon database, uploads roughly 1–1.5 GB of images to Vercel Blob (billable), and makes ~1,250 Jev calls (about 3M input tokens at ~2,400 per post; TypeSafe pricing not checked). Proceed only on an explicit yes.
- [ ] **Step 2:** Run `pnpm import:wp --all` in the background. Then run `pnpm import:wp --all --retry-failed` once. Expected: failures at most 1% of posts, each with a reason in the report.
- [ ] **Step 3: Verify.**
  - `select count(*) from posts where source = 'wordpress'` ≈ 1,252 minus failures.
  - Review set ≈ 273 plus low-confidence posts.
  - In the browser, check one post of each embed type (YouTube, Spotify, Spreaker, NPR, PRX, Bandcamp, Odesli, audio, Instagram) at 1440 px and 390 px. No sideways scroll; players load.
- [ ] **Step 4: Report the tag counts to Tarik.** List tags under 10 posts as merge candidates; he decides. Commit `docs/migration/` with `git commit -m "docs: WordPress import report"`.
