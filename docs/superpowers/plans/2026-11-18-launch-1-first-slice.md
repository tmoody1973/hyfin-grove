# HYFIN launch, plan 1 of 7: the first slice — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One WordPress post travels end to end: imported into Payload, sorted by Jev, shown on a story page styled from the mockup, playable through a persistent player, and reachable from its old hyfin.org address.

**Architecture:** Payload 3 is added to the existing Next.js app. The public site moves into an `app/(frontend)` route group and the admin lives in `app/(payload)`. A command-line import script reads hyfin.org's public WordPress API, uploads images to Vercel Blob through Payload, converts post HTML to Payload's rich text (Lexical), asks Jev for category and tags, and upserts the post by WordPress ID. Pages read Payload through its local API inside server components. One `<audio>` element in the frontend layout backs the persistent player.

**Tech Stack:** Next.js ≥16.4.5, React ≥19.2.9, Payload 3.94.0 (`@payloadcms/db-postgres`, `richtext-lexical`, `storage-vercel-blob`, `plugin-redirects`), Neon Postgres via the Vercel marketplace, Vercel Blob, TypeSafe Jev over HTTP, `@ui-sdk/react` 0.1.0-beta.10, Vitest, jsdom.

**Spec:** `docs/superpowers/specs/2026-11-18-hyfin-site-launch-design.md`. **Design:** Figma https://www.figma.com/design/ivuHFQdgrfMAxldRrsq3nP (read frames with the Figma MCP after loading the `figma:figma-design-to-code` skill); HTML fallback in `docs/mockups-html/`. This plan covers the spec's order-of-work step 1 only. Steps 2–7 get their own plans after this one ships.

## Global Constraints

- `next` ≥16.4.5 <17 (required by `@payloadcms/next` 3.94.0); `react` and `react-dom` ≥19.2.9 (required by `@payloadcms/richtext-lexical`).
- Every `payload` and `@payloadcms/*` package pinned to the same exact version, `3.94.0`.
- `@ui-sdk/react` and `@ui-sdk/core` pinned exactly to `0.1.0-beta.10` (beta; APIs may change).
- Next 16 has breaking changes: read the relevant guide in `node_modules/next/dist/docs/` before writing Next code (`AGENTS.md`).
- Package manager pnpm; CI runs Node 24 (`.github/workflows/ci.yml`).
- Categories are exactly `music`, `culture`, `milwaukee` (labels Music, Culture, Milwaukee). One per post.
- Seed tags, group `shared`: Business, Entertainment, Politics & Policy, History & Heritage, Tech & AI, Food, Community, Arts. Group `music`: New Releases, Interviews, Live & Concerts, Industry.
- New post address: `/<category>/<slug>`.
- The WordPress import skips any post in category ID `1169` (Ladies First).
- No Payload-generated image sizes on Media. Blob adapter uses `clientUploads: true`.
- Secrets (`TYPESAFE_API_KEY`, `PAYLOAD_SECRET`, `DATABASE_URI`, `BLOB_READ_WRITE_TOKEN`, `NPR_CDS_TOKEN`) are server-only: never `NEXT_PUBLIC_`, never sent to the browser.
- Work on branch `feat/launch-1-first-slice`, cut from `docs/site-launch-design`; never commit to `main`.

## Review Focus

1. **WordPress HTML entities in titles and excerpts** (`SZA&#8217;s`, `&amp;`) must come out as real characters, never raw entities. Test in Task 3.
2. **A post with no featured image** (`featured_media: 0`) or an image URL that 404s must still import, with no hero image and a logged warning. Test in Task 3 (planner) and Task 5 (verification).
3. **Old dated addresses with odd shapes**: trailing slash missing, uppercase, URL-encoded slug (`%e2%80%99`) must still find the post. Test in Task 7.
4. **Jev failing** (HTTP error, timeout) must fail that post's import loudly and never fall back to a guessed category. Test in Task 4.
5. **Player conflicts**: pressing play on a story while live is playing leaves exactly one source playing; a stream error shows "Stream unavailable" instead of a stuck loading state. Test in Task 8.

---

### Task 1: Upgrade, add Payload, provision the database and storage

**Files:**
- Modify: `package.json` (versions, `"type": "module"`, scripts `payload`, `test`), `next.config.ts` (wrap with `withPayload`, add `hyfin.org` and the Blob host to `images.remotePatterns`), `tsconfig.json` (path alias `@payload-config` → `./payload.config.ts`), `.env.example`, `.github/workflows/ci.yml` (add `pnpm test`; add build placeholders `DATABASE_URI`, `PAYLOAD_SECRET`)
- Move: `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `app/stories/` → `app/(frontend)/`
- Create: `app/(payload)/` from Payload's blank template (admin route, API routes, layout, `custom.scss`, `importMap.js`), `payload.config.ts`, `vitest.config.ts`
- Create: `docs/decisions/003-import-all-wordpress-posts-sorted-by-jev.md`

**Interfaces:**
- Produces: `payload.config.ts` default export (buildConfig) importable as `@payload-config`; `pnpm payload <cmd>` works; `pnpm test` runs Vitest.

- [ ] **Step 1: Ask Tarik before provisioning.** This step creates billable resources on his Vercel account. Load the `marketplace` skill and follow it to add Neon Postgres and Vercel Blob to the `hyfin-grove` Vercel project. Then pull env vars locally with `vercel env pull .env.local`. Create a Neon branch named `dev` for local work. Expected: `.env.local` contains `DATABASE_URI` (or the Neon-provided URL, which `payload.config.ts` reads) and `BLOB_READ_WRITE_TOKEN`. Add `PAYLOAD_SECRET` (32+ random bytes) and `TYPESAFE_API_KEY` to Vercel and `.env.local`.
- [ ] **Step 2: Bump versions and add packages.** `next@^16.4.5`, `react@^19.2.9`, `react-dom@^19.2.9`; add `payload@3.94.0 @payloadcms/next@3.94.0 @payloadcms/db-postgres@3.94.0 @payloadcms/richtext-lexical@3.94.0 @payloadcms/storage-vercel-blob@3.94.0 @payloadcms/plugin-redirects@3.94.0 graphql sharp`, and dev deps `vitest jsdom @types/jsdom tsx`. Run `pnpm install`. Expected: no peer-dependency errors.
- [ ] **Step 3: Move the frontend into `app/(frontend)/` and add `app/(payload)/`** from the `blank` template of the matching Payload version (`create-payload-app` template files). Read `node_modules/next/dist/docs/` on route groups first.
- [ ] **Step 4: Write `payload.config.ts`** with `postgresAdapter({ pool: { connectionString: process.env.DATABASE_URI } })`, `lexicalEditor()`, `secret: process.env.PAYLOAD_SECRET`, `typescript.outputFile: 'payload-types.ts'`, an empty `collections: []`, and the Users collection the template provides. Wrap `next.config.ts` with `withPayload`.
- [ ] **Step 5: Verify.** Run `pnpm dev` and open `http://localhost:3000/admin`. Expected: Payload's create-first-user screen. Create Tarik's editor account. Open `/` and `/stories/<an existing CDS story id>`. Expected: they render as before.
- [ ] **Step 6: Verify the build and CI commands locally.** Run `pnpm exec next typegen && pnpm exec tsc --noEmit && pnpm lint && pnpm build`. Expected: all pass.
- [ ] **Step 7: Draft decision 003** in the format from Tarik's CLAUDE.md: import all posts, not 18 months; sort with Jev plus Tarik's review. Leave "What actually happened" blank.
- [ ] **Step 8: Commit.** `git commit -m "feat: add Payload 3 to the app; frontend moves to (frontend) route group"`

### Task 2: Content model

**Files:**
- Create: `collections/Media.ts`, `collections/Tags.ts`, `collections/Shows.ts`, `collections/Hosts.ts`, `collections/Posts.ts`, `lib/taxonomy.ts`, `scripts/seed-tags.ts`
- Modify: `payload.config.ts` (register collections, `vercelBlobStorage`, `redirectsPlugin({ collections: ['posts'] })`)
- Test: `tests/taxonomy.test.ts`

**Interfaces:**
- Produces, in `lib/taxonomy.ts`:
  - `CATEGORIES: readonly ["music", "culture", "milwaukee"]`
  - `type Category = typeof CATEGORIES[number]`
  - `CATEGORY_LABELS: Record<Category, string>`
  - `SEED_TAGS: ReadonlyArray<{ name: string; slug: string; group: "shared" | "music" }>`
  - `isCategory(value: string): value is Category`
- Produces collection slugs `media`, `tags`, `shows`, `hosts`, `posts`, `redirects`, plus generated types in `payload-types.ts`.
- Posts fields:
  - `title` (text, required); `slug` (text, required, unique); `category` (select from `CATEGORIES`, required)
  - `tags` (relationship → tags, hasMany); `show` (relationship → shows)
  - `byline` (text); `bylineHost` (relationship → hosts)
  - `publishedAt` (date, required); `excerpt` (textarea); `heroImage` (upload → media)
  - `body` (richText); `audio` (group: `url` text, `durationSeconds` number)
  - `source` (select `wordpress` | `cds`, required)
  - `legacy` (group: `wpId` number unique, `wpSlug` text indexed, `wpDate` date, `wpUrl` text)
  - `sorting` (group: `categoryConfidence` number, `needsReview` checkbox, `reviewedAt` date)
- Media fields: `alt` (text), `caption` (text), `credit` (text), `sourceUrl` (text, indexed; the original hyfin.org URL, used later for `/wp-content/uploads` redirects). Media sets no `imageSizes`.
- Tags fields: `name`, `slug` (unique), `group` (select `shared` | `music`).
- Shows fields: `name`, `slug` (unique), `description`, `artwork` (upload), `hosts` (relationship → hosts, hasMany), `cadenceProgramName` (text), `podcastFeedUrl` (text), `wpCategoryIds` (number, hasMany; WordPress categories that map to this show).
- Hosts fields: `name`, `slug` (unique), `photo` (upload), `bio` (textarea), `cadenceHostName` (text).

- [ ] **Step 1: Write the failing test** `tests/taxonomy.test.ts`:
  ```ts
  expect(CATEGORIES).toEqual(["music", "culture", "milwaukee"]);
  expect(SEED_TAGS.filter((t) => t.group === "shared").map((t) => t.name)).toEqual(["Business", "Entertainment", "Politics & Policy", "History & Heritage", "Tech & AI", "Food", "Community", "Arts"]);
  expect(SEED_TAGS.filter((t) => t.group === "music").map((t) => t.name)).toEqual(["New Releases", "Interviews", "Live & Concerts", "Industry"]);
  expect(new Set(SEED_TAGS.map((t) => t.slug)).size).toBe(SEED_TAGS.length);
  expect(isCategory("culture")).toBe(true); expect(isCategory("news")).toBe(false);
  ```
- [ ] **Step 2:** Run `pnpm test tests/taxonomy.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3:** Implement `lib/taxonomy.ts`, the five collections, and the config changes. Slugs are lowercase-hyphenated names, `&` dropped: `politics-policy`, `tech-ai`, `live-concerts`.
- [ ] **Step 4:** Run `pnpm test`. Expected: PASS.
- [ ] **Step 5:** Run `pnpm payload generate:types` and `pnpm payload migrate:create initial`, then `pnpm payload migrate`. Then run `pnpm tsx scripts/seed-tags.ts`, which upserts `SEED_TAGS` by slug. Expected: 12 tags in `/admin/collections/tags`. Running it twice still gives 12.
- [ ] **Step 6: Commit.** `git commit -m "feat: content model (posts, tags, shows, hosts, media, redirects)"`

### Task 3: WordPress client, census and transform

**Files:**
- Create: `lib/wordpress/types.ts`, `lib/wordpress/client.ts`, `lib/wordpress/transform.ts`, `scripts/wp-census.ts`
- Test: `tests/wordpress-transform.test.ts`, fixture `tests/fixtures/wp-post-sza.json` (already saved: the live SZA post, WP ID 113835)

**Interfaces:**
- Produces, in `lib/wordpress/types.ts`:
  - `WpPost { id, date, slug, link, title: { rendered }, excerpt: { rendered }, content: { rendered }, categories: number[], tags: number[], featured_media: number, author: number }`
  - `WpMedia { id, source_url, alt_text, mime_type }`
- Produces, in `client.ts` (base `https://hyfin.org/wp-json/wp/v2`):
  - `fetchPostBySlug(slug: string, fetchImpl?: typeof fetch): Promise<WpPost | null>`
  - `fetchMedia(id: number, fetchImpl?): Promise<WpMedia | null>`
  - `fetchAllPosts(fetchImpl?): AsyncGenerator<WpPost>` (100 per page)
- Produces, in `transform.ts`:
  - `toPostDraft(wp: WpPost): PostDraft`, where `PostDraft = { title, slug, publishedAt, excerpt, legacy: { wpId, wpSlug, wpDate, wpUrl }, heroMediaId: number | null, wpCategoryIds: number[], bodyHtml: string }`
  - `isExcludedFromImport(wp: WpPost): boolean` (true when categories include 1169)
  - `imageUrlsIn(html: string): string[]`
  - `prepareBodyHtml(html: string, uploaded: Map<string, string | number>): string`: sets `data-lexical-upload-id` and `data-lexical-upload-relation-to="media"` on each `<img>` whose `src` is in `uploaded`, drops `srcset`, `sizes` and WordPress `data-*` attributes, and turns each `<iframe src="X">` into `<p><a href="X">X</a></p>` (slice fallback; real embed handling is decided from the census).

- [ ] **Step 1: Write failing tests** against the fixture:
  ```ts
  const d = toPostDraft(fixture[0]);
  expect(d.title).toBe("SZA’s lyrics validate my experience as a Black woman"); // entity decoded
  expect(d.slug).toBe("szas-lyrics-validate-my-experience-as-a-black-woman");
  expect(d.legacy).toEqual({ wpId: 113835, wpSlug: "szas-lyrics-validate-my-experience-as-a-black-woman", wpDate: "2024-04-07T16:34:27", wpUrl: "https://hyfin.org/2024/04/07/szas-lyrics-validate-my-experience-as-a-black-woman/" });
  expect(d.heroMediaId).toBe(113837);
  expect(toPostDraft({ ...fixture[0], featured_media: 0 }).heroMediaId).toBeNull();
  expect(toPostDraft({ ...fixture[0], title: { rendered: "Tom &amp; Jerry" } }).title).toBe("Tom & Jerry");
  expect(isExcludedFromImport({ ...fixture[0], categories: [12, 1169] })).toBe(true);
  expect(isExcludedFromImport(fixture[0])).toBe(false);
  const url = "https://hyfin.org/wp-content/uploads/2024/04/sza-sos-new-album-stream-1200x675-1.webp";
  expect(imageUrlsIn(d.bodyHtml)).toContain(url);
  const out = prepareBodyHtml(d.bodyHtml, new Map([[url, 7]]));
  expect(out).toContain('data-lexical-upload-id="7"'); expect(out).not.toContain("srcset"); expect(out).not.toContain("<iframe");
  ```
- [ ] **Step 2:** Run `pnpm test tests/wordpress-transform.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement with jsdom for HTML parsing. Decode entities by reading jsdom's `textContent`.
- [ ] **Step 4:** Run tests. Expected: PASS.
- [ ] **Step 5: Run the census** with `pnpm tsx scripts/wp-census.ts > docs/wp-census.md`. It walks every post via `fetchAllPosts` and counts:
  - the total post count, and posts excluded by category 1169;
  - HTML element types, `wp-block-*` classes, shortcodes (`[...]`) and iframe hosts;
  - posts with no featured image, and posts linking `.mp3` files.

  Expected: a Markdown table. The total should be about 1,264 (`x-wp-total` on 2026-11-18). Read it, then list in the task report which elements the slice's conversion does not handle. This feeds plan 2.
- [ ] **Step 6: Commit.** `git commit -m "feat: WordPress client, transform and content census"`

### Task 4: Jev sorting

**Files:**
- Create: `lib/sorting/jev.ts`, `lib/sorting/sortPost.ts`
- Test: `tests/sorting.test.ts`

**Interfaces:**
- Produces, in `lib/sorting/jev.ts`. Port from `~/Projects/backstory/convex/lib/jevTopics.ts`: endpoint `https://api.typesafe.ai/v1/systemone`, model `jev-latest`. Read docs.typesafe.ai (`llms.txt`, then the API and confidence pages) first and update both if they changed.
  - `askJev(state: string, questions: Record<string, JevQuestion>, apiKey: string, fetchImpl?: typeof fetch): Promise<JevResponse>`
  - `JevAnswer = { noul?: number; choice?: string; probabilities?: Record<string, number> }`
- Produces, in `sortPost.ts`:
  - `CATEGORY_REVIEW_THRESHOLD = 0.7` (initial; tuned after the slice)
  - `TAG_THRESHOLD = 0.5`
  - `sortStateFor(draft: Pick<PostDraft, "title" | "excerpt" | "bodyHtml">): string` (title, excerpt and plain-text body, body capped at 6,000 characters)
  - `buildSortQuestions(tags: ReadonlyArray<{ slug: string; name: string }>)`: one `choice` question `category` whose criteria describe Music, Culture and Milwaukee, plus one `noul` question per tag slug
  - `interpretSort(response: JevResponse, tagSlugs: string[]): SortResult`, where `SortResult = { category: Category; categoryConfidence: number; tagSlugs: string[]; needsReview: boolean }`
  - `showSlugForWpCategories(wpCategoryIds: number[], shows: ReadonlyArray<{ slug: string; wpCategoryIds: number[] }>): string | null`. A plain rule, no AI: the first show whose `wpCategoryIds` intersect.

- [ ] **Step 1: Write failing tests** with a fake `fetchImpl`:
  ```ts
  const r = interpretSort({ model: "jev", usage: {input_tokens:0,output_tokens:0}, answers: { category: { choice: "culture", probabilities: { culture: 0.82, music: 0.15, milwaukee: 0.03 } }, entertainment: { noul: 0.9 }, food: { noul: 0.2 } } }, ["entertainment", "food"]);
  expect(r).toEqual({ category: "culture", categoryConfidence: 0.82, tagSlugs: ["entertainment"], needsReview: false });
  expect(interpretSort(/* same, culture prob 0.55 */).needsReview).toBe(true);
  await expect(askJev("s", {}, "k", async () => new Response("nope", { status: 500 }))).rejects.toThrow(/HTTP 500/);
  expect(() => interpretSort({ ...ok, answers: { category: { choice: "news" } } }, [])).toThrow(/unknown category/);
  expect(showSlugForWpCategories([12, 136], [{ slug: "hyfin-verified", wpCategoryIds: [136] }])).toBe("hyfin-verified");
  ```
- [ ] **Step 2:** Run `pnpm test tests/sorting.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implement. `interpretSort` throws on a missing or unknown category; it never defaults.
- [ ] **Step 4:** Run tests. Expected: PASS.
- [ ] **Step 5: One live call.** Run `pnpm tsx -e` with a script that sorts the SZA fixture with the real key. Expected: category `culture` or `music`, with probabilities printed. Record the output in the commit message body.
- [ ] **Step 6: Commit.** `git commit -m "feat: sort posts into category and tags with Jev"`

### Task 5: Import one post

**Files:**
- Create: `scripts/import-wp.ts`, `lib/wordpress/importPost.ts`

**Interfaces:**
- Consumes: Task 3's `fetchPostBySlug`, `fetchMedia`, `toPostDraft`, `isExcludedFromImport`, `imageUrlsIn` and `prepareBodyHtml`; Task 4's `askJev`, `buildSortQuestions`, `sortStateFor`, `interpretSort` and `showSlugForWpCategories`; and `convertHTMLToLexical` with `editorConfigFactory.default({ config })` from `@payloadcms/richtext-lexical`, passing `JSDOM`.
- Produces: `importPost(payload: Payload, wp: WpPost): Promise<{ postId: string | number; created: boolean; needsReview: boolean }>`. CLI: `pnpm tsx scripts/import-wp.ts --slug <slug>`.

- [ ] **Step 1: Implement `importPost`**:
  1. Skip excluded posts by throwing a named `ExcludedPostError`.
  2. Upload each body image and the hero image to `media`. Find an existing upload by `sourceUrl` first; otherwise download it and create it with `file: { data, mimetype, name, size }`. A failed image is logged and skipped.
  3. Convert the body.
  4. Sort it.
  5. Upsert the post by `legacy.wpId` with `source: "wordpress"` and `sorting.needsReview`.
- [ ] **Step 2: Import the slice post.** Run `pnpm tsx scripts/import-wp.ts --slug szas-lyrics-validate-my-experience-as-a-black-woman`. Expected: it prints the post ID, `created: true`, the category and the confidence. In `/admin`, the post shows its title, hero image, body with the inline image, category and tags.
- [ ] **Step 3: Check idempotency.** Run the same command again. Expected: `created: false`, still one post, and the Media count unchanged.
- [ ] **Step 4: Check the no-image path.** Import a post the census lists as having no featured image. Expected: success, empty hero, a warning line.
- [ ] **Step 5: Commit.** `git commit -m "feat: import a WordPress post into Payload"`

### Task 6: Story page from the mockup

**Files:**
- Create: `app/(frontend)/[category]/[slug]/page.tsx`, `lib/posts.ts`, `components/story/StoryHeader.tsx`, `components/story/StoryBody.tsx`
- Modify: `app/(frontend)/layout.tsx` (swap Fraunces and Instrument Sans for the mockup fonts via `next/font/google`: Archivo, Archivo Black, IBM Plex Mono; add the site header from the mockup), `app/(frontend)/globals.css`
- Test: `tests/posts.test.ts`

**Interfaces:**
- Produces, in `lib/posts.ts`:
  - `postPath(post: { category: Category; slug: string }): string` (`/culture/szas-…`)
  - `getPostBySlug(slug: string): Promise<Post | null>` (Payload local API, `depth: 1`)
  - `getPostByLegacySlug(wpSlug: string): Promise<Post | null>`

- [ ] **Step 1: Write the failing test:** `expect(postPath({ category: "culture", slug: "abc" })).toBe("/culture/abc")`.
- [ ] **Step 2:** Run it. Expected: FAIL. Then implement `lib/posts.ts`. Run again. Expected: PASS.
- [ ] **Step 3: Build the page.** The design reference is `docs/mockups-html/screens/05-stories/article-with-audio-player.html` and the matching frame in Figma https://www.figma.com/design/ivuHFQdgrfMAxldRrsq3nP (Figma wins). Render the body with `RichText` from `@payloadcms/richtext-lexical/react`. Behavior:
  - an unknown slug → `notFound()`;
  - a slug under the wrong category → `permanentRedirect(postPath(post))`;
  - a post with `audio.url` shows a Play button wired in Task 8.
- [ ] **Step 4: Verify visually.** Open `/culture/szas-lyrics-validate-my-experience-as-a-black-woman` (or `/music/…`, per Jev's call) at 1440 px and 390 px. Compare with the mockup screenshot. Expected: same type, header and layout; real title and body, no placeholders.
- [ ] **Step 5: Commit.** `git commit -m "feat: story page from the mockup"`

### Task 7: Old dated links redirect

**Files:**
- Create: `app/(frontend)/[year]/[month]/[day]/[slug]/page.tsx`, `lib/legacy.ts`
- Test: `tests/legacy.test.ts`

**Interfaces:**
- Consumes: Task 6's `getPostByLegacySlug` and `postPath`.
- Produces: `parseLegacyPath(segments: { year: string; month: string; day: string; slug: string }): { wpSlug: string } | null`.

- [ ] **Step 1: Write failing tests:**
  ```ts
  expect(parseLegacyPath({ year: "2024", month: "04", day: "07", slug: "szas-lyrics" })).toEqual({ wpSlug: "szas-lyrics" });
  expect(parseLegacyPath({ year: "2024", month: "04", day: "07", slug: "SZAS-Lyrics" })).toEqual({ wpSlug: "szas-lyrics" });
  expect(parseLegacyPath({ year: "2024", month: "04", day: "07", slug: "it%e2%80%99s-here" })).toEqual({ wpSlug: "it’s-here" });
  expect(parseLegacyPath({ year: "24", month: "04", day: "07", slug: "x" })).toBeNull();
  expect(parseLegacyPath({ year: "2024", month: "13", day: "07", slug: "x" })).toBeNull();
  ```
- [ ] **Step 2:** Run it. Expected: FAIL. Implement. Run again. Expected: PASS.
- [ ] **Step 3: The page.** Parse the path, then look up the post. Found → `permanentRedirect(postPath(post))` (Next answers 308, which Google treats like 301). Not found → `notFound()`.
- [ ] **Step 4: Verify.** Run `curl -sI http://localhost:3000/2024/04/07/szas-lyrics-validate-my-experience-as-a-black-woman/`. Expected: `308`, with `location: /<category>/szas-lyrics-validate-my-experience-as-a-black-woman`. The same without the trailing slash gives the same answer.
- [ ] **Step 5: Commit.** `git commit -m "feat: old dated hyfin.org links redirect to new story pages"`

### Task 8: Persistent player

**Files:**
- Create: `components/player/playerState.ts`, `components/player/PlayerProvider.tsx`, `components/player/PlayerBar.tsx`, `components/player/PlayButton.tsx`, `lib/nowPlaying.ts`, `docs/decisions/004-ui-sdk-for-the-player.md`
- Modify: `app/(frontend)/layout.tsx` (wrap children in `PlayerProvider`, render `PlayerBar` once), `.env.example` (`NEXT_PUBLIC_HYFIN_STREAM_URL`, `NEXT_PUBLIC_RM_PLAYLIST_CONVEX_URL`), `package.json` (add `@ui-sdk/react@0.1.0-beta.10 @ui-sdk/core@0.1.0-beta.10 convex`)
- Remove: `components/AudioPlayer.tsx` once `app/(frontend)/stories/[id]` uses `PlayButton` (keep that CDS route working)
- Test: `tests/playerState.test.ts`

**Interfaces:**
- Produces, in `playerState.ts`:
  - `type Source = { kind: "live" } | { kind: "story"; url: string; title: string; href: string }`
  - `type PlayerState = { source: Source; status: "idle" | "loading" | "playing" | "paused" | "error"; error: string | null }`
  - `initialPlayerState: PlayerState` (live, idle)
  - `playerReducer(state, action)`, with actions `play(source)`, `started`, `pause`, `resume`, `ended`, `failed(message)`
- Produces, in `PlayerProvider.tsx`: `usePlayer(): { state; play(source: Source): void; pause(): void; resume(): void; seek(seconds: number): void; volume: number; setVolume(v: number): void; time: number; duration: number }`
- Produces, in `lib/nowPlaying.ts`: `useNowPlaying(): { artist: string; title: string } | null`. It subscribes to rm-playlist-v2's `plays:currentByStation` with `{ stationSlug: "hyfin" }`. It returns null when the env var is unset or the query errors.

- [ ] **Step 1: Write failing tests:**
  ```ts
  const story = { kind: "story", url: "https://x/a.mp3", title: "A", href: "/music/a" } as const;
  let s = playerReducer(initialPlayerState, { type: "play", source: { kind: "live" } });
  expect(s.status).toBe("loading");
  s = playerReducer({ ...s, status: "playing" }, { type: "play", source: story });
  expect(s.source).toEqual(story); expect(s.status).toBe("loading"); // one source at a time
  expect(playerReducer(s, { type: "failed", message: "Stream unavailable" })).toMatchObject({ status: "error", error: "Stream unavailable" });
  expect(playerReducer({ ...s, status: "playing" }, { type: "ended" })).toMatchObject({ status: "idle", source: story }); // a story stops; it does not auto-switch to live
  ```
- [ ] **Step 2:** Run it. Expected: FAIL. Implement the reducer. Run again. Expected: PASS.
- [ ] **Step 3: Build the provider and the bar.**
  - The provider owns exactly one `<audio>` element. A live `src` comes from `NEXT_PUBLIC_HYFIN_STREAM_URL`, which Tarik supplies.
  - The bar follows the mockup's on-air bar (`docs/mockups-html/screens/01-home/homepage.html`, top strip):
    - Play/pause is a UI SDK `Button` from `@ui-sdk/react/button`.
    - The scrubber, for story audio only, is a UI SDK `Slider` from `@ui-sdk/react/slider` (controlled: `value`, `onValueChange`, `min={0}`, `max={duration}`). Its thumb has `aria-label="Seek"`.
    - Volume is a second `Slider` with `aria-label="Volume"`, `min={0} max={1} step={0.05}`.
    - In live mode it shows "ON AIR NOW" plus the now-playing artist and title. In error state it shows "Stream unavailable".
  - Read ui-sdk.dev's styling page before styling.
- [ ] **Step 4: Verify in a browser.**
  1. Start live, then navigate home → story page → home. Expected: the audio never stops (one `<audio>` in the DOM; check with devtools).
  2. Press play on a story with audio. Expected: live stops, the story plays, and the scrubber moves.
  3. Tab to the controls. Expected: arrow keys move volume and seek; screen-reader names read "Seek" and "Volume".
- [ ] **Step 5: Draft decision 004**, UI SDK for the player: beta risk, versions pinned exactly. Leave "What actually happened" blank.
- [ ] **Step 6: Commit.** `git commit -m "feat: persistent player with live stream and story audio"`

### Task 9: Deploy the slice to a preview

**Files:**
- Modify: Vercel project env, via the Vercel CLI. Production is not touched.

- [ ] **Step 1:** Push the branch. Expected: CI green (typecheck, lint, tests, build).
- [ ] **Step 2:** Run `pnpm payload migrate` against the Neon branch the preview uses. Then run Task 5's import against it.
- [ ] **Step 3: Verify on the preview URL.**
  - The story page renders.
  - The old dated path answers 308 to it.
  - The player survives navigation.
  - `/admin` loads.

  Tell Tarik the preview URL and what to click.
- [ ] **Step 4:** Write a learning-log entry in `docs/LEARNING-LOG.md`: what the census showed versus what we expected about WordPress formatting.
