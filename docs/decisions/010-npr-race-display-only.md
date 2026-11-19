# 010 — NPR's Race coverage is shown on HYFIN, live, never stored

**Decision.** NPR's newest stories on race (CDS topic 1015) appear among HYFIN's own stories, by date, in the homepage's Latest and on Culture's first page, labelled "NPR". Each opens on a HYFIN page (`/npr/<id>`) built live from CDS, cached at most 15 minutes, credited to NPR, with npr.org as the canonical (original) address for search engines. They are never imported into HYFIN's database.

**Changed the same day.** Tarik first chose a separate "From NPR: Race" row linking out to npr.org (option 1), then asked for the stories to sit in the Latest lists, because Culture's own newest story was over a year old, and to open on HYFIN rather than npr.org (option 2).

## Why this came up
Tarik wants NPR's Race coverage (npr.org/sections/race) on HYFIN. Our station stories are copied into Payload by the CDS sync, but CDS marks NPR's own stories **"display-only: attribute via url, refresh regularly, do not store beyond display."** Importing them the same way would break those terms. The topic is small: 10 stories in the last 60 days.

## Options
1. **A live "From NPR" block (chosen).** A row of the 4 newest Race stories on the Culture page, linking out to npr.org. Cost: the stories aren't searchable on HYFIN and have no pages here; if CDS is down the block simply disappears.
2. **Live story pages on HYFIN.** Each NPR story gets a page here, rendered live from CDS (never stored), credited to NPR, with search engines pointed at npr.org's copy. Cost: more work, and a page that depends on CDS answering every time.
3. **Hold off** until after the beta. Cost: no national coverage of race on HYFIN at launch.

## What we chose and why
Option 2 (Tarik, 2026-11-19, after first choosing option 1). Readers stay on HYFIN, and Culture stops opening with year-old stories. NPR's terms are met: shown live, refreshed every 15 minutes, never stored, credited, with npr.org named as the original.

## What we gave up
- **No search ranking for these pages.** They point search engines at npr.org, so HYFIN's copies won't rank (that's deliberate: duplicates would hurt both).
- **No HYFIN search results or RSS** for NPR stories; they aren't in the database.
- **The page depends on CDS answering.** If CDS is down, the stories drop out of the lists and their pages return "not found" until it's back.
- **Only one topic.** Other NPR sections would each be a small, deliberate addition.

## How we'll know if this was right
- Culture and Latest always show recent Race stories, matching npr.org/sections/race within 15 minutes.
- Nothing from NPR's own stories ever lands in the posts table.
- Analytics show readers on `/npr/…` pages continuing to other HYFIN pages.

## What actually happened
<!-- Tarik fills this in. -->
