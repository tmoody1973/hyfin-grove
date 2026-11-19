# 010 — NPR's Race coverage is shown live, never stored

**Decision.** The Culture page shows the newest NPR stories on race (CDS topic 1015) in a "From NPR: Race" block. It is read from CDS when the page is built, cached for at most 15 minutes, credited to NPR, and every story links to npr.org. The stories are never imported into HYFIN's database.

## Why this came up
Tarik wants NPR's Race coverage (npr.org/sections/race) on HYFIN. Our station stories are copied into Payload by the CDS sync, but CDS marks NPR's own stories **"display-only: attribute via url, refresh regularly, do not store beyond display."** Importing them the same way would break those terms. The topic is small: 10 stories in the last 60 days.

## Options
1. **A live "From NPR" block (chosen).** A row of the 4 newest Race stories on the Culture page, linking out to npr.org. Cost: the stories aren't searchable on HYFIN and have no pages here; if CDS is down the block simply disappears.
2. **Live story pages on HYFIN.** Each NPR story gets a page here, rendered live from CDS (never stored), credited to NPR, with search engines pointed at npr.org's copy. Cost: more work, and a page that depends on CDS answering every time.
3. **Hold off** until after the beta. Cost: no national coverage of race on HYFIN at launch.

## What we chose and why
Option 1 (Tarik, 2026-11-19, from Claude's options). It follows NPR's terms, is small to build, and still puts that reporting in front of HYFIN's Culture readers.

## What we gave up
- **Readers leave HYFIN** to read the full story on npr.org.
- **No HYFIN search results** for NPR stories.
- **Only one topic.** Other NPR sections would each need the same block (cheap to add, but a choice each time).

## How we'll know if this was right
- The Culture page always shows recent Race stories, and they match npr.org/sections/race within 15 minutes.
- Nothing from NPR's own stories ever lands in the posts table.
- Clicks from the block show up in analytics as visits sent to npr.org.

## What actually happened
<!-- Tarik fills this in. -->
