# 019: Site search runs inside HYFIN's own Postgres database

**Decision.** Visitors search HYFIN at `/search` and from a search button on every page: the header on desktop, the top bar on phones, and the `/` key. Search covers stories (NPR copies included, labelled NPR), shows, hosts, events, pages, and songs HYFIN played in the last 30 days.

It runs in the Postgres database the site already has:
- **Full-text search,** Postgres's built-in word search with English stemming, so "playing" finds "played", and accent folding, so "Beyonce" finds "Beyoncé".
- **Typo matching on titles,** which compares short letter fragments.
- **No new vendor.**

## Why this came up
Tarik asked (2026-11-20) for strong visitor search. The site had none. Only the admin could search, and only story titles. What was at stake: an archive of 1,356 stories that nobody can find their way into, against adding a paid service and another moving part for a small station site.

## Options
1. **Postgres full-text search, extending the Payload search plugin (chosen).**
   - **Costs:** we write and tune the ranking ourselves. Typo tolerance is "close matches" on titles, not a full spelling corrector. Speed is ours to watch.
2. **A hosted search engine** (Algolia, Typesense, Meilisearch, Upstash) through the Vercel Marketplace.
   - **Costs:** a monthly bill, another service to keep in step with every edit, and visitor queries sent to a third party.
3. **Payload's plain `like` filter on titles.**
   - **Costs:** almost free, but no ranking, no searching inside stories, no accents, no typos.

## What we chose and why
Claude recommended option 1 in the plan, and Tarik approved it with three answers: songs in, a 90-day log of search words, and NPR copies in.

Claude's calls while building:
- **One table:**
  - every item keeps a row in the search plugin's table, with a `visible` flag computed on save;
  - the plugin can't remove a row when an item stops being public, so the query filters on `visible` instead.
- **A weighted search column, maintained by Postgres itself:** titles count most, then summaries, then text.
- **Upcoming events get a boost.**
- **"Close matches" instead of "Did you mean …?":** when there are fewer than 3 real results, typo matches on titles fill in, labelled as close matches.
- **The panel's endpoint lives at `/api/site-search`,** because Payload already uses `/api/search`.

## What we gave up
- **No spelling suggestions,** only close matches by title.
- **Each server keeps its own rate limit in memory,** 30 a minute per visitor.
- **The log shows each search, not totals:** spotting the most common searches means filtering the list.
- **If search ever needs to understand meaning** (for example, "songs about summer"), that's a later step: embeddings in the same database.

## How we'll know if this was right
- **Speed:** the search query stays under 150 ms on the server (95th percentile), measured on production data at launch.
- **Admin → Search queries** shows real use, and the "Results = 0" filter turns up content worth adding.
- **No complaints that something on the site can't be found.**

## What actually happened
