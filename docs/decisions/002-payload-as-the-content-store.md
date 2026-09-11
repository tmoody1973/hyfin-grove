# 002 — Payload on Vercel becomes Grove's single content store

**Decision.** Grove gets its own content store, Payload (an open-source content system that runs inside the Next.js app and keeps its data in Postgres). It holds three kinds of content: HYFIN's WordPress archive imported once, a new events section fed from a separate dataset, and a read-only copy of CDS stories kept fresh by a scheduled sync. The site reads only from Payload.

**Why this came up.** Grove has no content of its own. Today it reads CDS live, which only holds what Radio Milwaukee publishes through Brightspot now. HYFIN's history lives on hyfin.org, a WordPress site, and events will come from a third source. Three sources read live from the front end means three APIs to merge on every page, no unified search, and no single place for an editor to fix anything. Get this wrong and every future feature pays the merge cost again.

**What we found on hyfin.org (2026-09-11, via its public API):**

| Content | Count | Notes |
|---|---|---|
| Posts | 1,248 | March 2020 to Sept 2026. Peak year 2024 with 504. |
| Pages | 105 | Mostly site chrome; import only the handful with real content. |
| Media | 10,594 | 7,548 JPEG, 2,237 PNG, 724 WebP, 25 MP3. Sampled originals average 146 KB, so roughly 1.5 GB total. |
| Podcast entries | 833 | Link-out posts pointing elsewhere, no audio inside. Likely a feed import. Skip unless someone wants them. |
| Shows | 16 | Program pages. Small, worth importing. |
| Categories / tags | 28 / 663 | Top categories: News, Music, Milwaukee, New Releases, Interviews. |
| Events | 18 | Not imported. The new events section comes from another dataset. |

**Key finding:** HYFIN cross-posts. "Ladies First: Blessing Jolie" exists in WordPress (Sept 8) and in CDS (Sept 4). Without a rule, Grove would show duplicates. Rule (Tarik's call): Brightspot and CDS are the source for all new content going forward. The WordPress import excludes the Ladies First category (11 posts) entirely, so CDS owns that show from its first episode. Everything else in WordPress is treated as archive.

**Options.**
1. *Keep reading every source live.* No database, no sync. Cost: every page merges three APIs, search across them is impractical, nothing can be edited in one place.
2. *Payload for WordPress and events only, CDS still live.* Less machinery than option 3. Cost: two sources of truth in the front end forever, and search still spans two systems.
3. *Payload holds everything, CDS synced in on a schedule.* One store, one search, one category system. Cost: the sync job is a moving part that can silently stop and needs a heartbeat, and stories exist in two places (Brightspot and Payload), so the Payload copy must be read-only for editors.

**What we chose and why.** Option 3, recommended by Claude, agreed by Tarik. The merge problem gets solved once in a sync job rather than in every page. Hosting stays on Vercel: Payload is Next.js code, the database is Postgres from Vercel's marketplace (provided by Neon, billed through Vercel), and images go to Vercel Blob. Editors log in with Payload's built-in email and password accounts; the sync job uses its own API key. No listener accounts.

**What we gave up.** Freshness now depends on the sync interval instead of a direct read. A second copy of every CDS story exists, and an editor could be confused about which one to edit. The WordPress import is real work: 1,248 posts is quick, 10,594 images is an afternoon of copying and roughly 1.5 GB of Blob storage, which is past the free tier. Cloudflare hosting was considered and rejected: supported, but it would add three unfamiliar pieces (Workers packaging, D1, R2) for no benefit at this scale.

**How we'll know if this was right.**
- A search box over old posts, new stories, and events returns mixed results ranked together, from one query.
- A new CDS story appears on Grove within the sync interval without anyone touching Payload.
- Zero Ladies First stories come from the WordPress import, and a spot check of the last 30 days shows no story twice.
- The sync heartbeat alerts within one interval when the job stops.

**What actually happened.**
_(Tarik fills this in.)_
