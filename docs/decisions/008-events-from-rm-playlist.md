# 008 — Events come from rm-playlist-v2, read live

**Decision.** The events page and event pages read concerts live from rm-playlist-v2 (Radio Milwaukee's playlist app), instead of importing them into Payload. This changes decision 002, which planned to import events "from a separate dataset".

## Why this came up
The spec's events goal is "upcoming concerts by artists HYFIN plays". rm-playlist-v2 already does the hard part: it matches every play to upcoming Ticketmaster and AXS shows in the Milwaukee, Chicago and Madison areas, and every 3 hours caches every date for artists in HYFIN's last 30 days of rotation. On 2026-11-19 that was 28 shows. Building our own copy would mean a second event pipeline and a second set of ticketing API keys. Doing it badly would mean a page of stale or unrelated concerts.

## Options
1. **Read live from rm-playlist-v2 (chosen).** The list uses the same public query as the playlist widget's Concerts tab. rm-playlist-v2 got two additive changes: each show's metro and play count, and a public lookup of one event by id. Cost: the events pages depend on a second app being up.
2. **Import events into Payload on a schedule,** like the CDS sync. Search across stories and events would work, and Payload would hold a copy. Cost: a second sync job, a second store of data that goes stale, and more moving parts before the beta.
3. **Build our own Ticketmaster/AXS integration.** Full control. Cost: duplicates rm-playlist-v2's matching, a second set of API keys, and weeks of work.

## What we chose and why
Option 1 (Claude, plan 5; the spec had already pointed at rm-playlist-v2 for events). The data is already maintained, already matched to HYFIN's playlist, and already powers the widget listeners use. Event pages add what only HYFIN has: the artist's recent HYFIN plays and HYFIN's stories that mention them, plus schema.org event data so search engines can show the shows.

## What we gave up
- **No search across stories and events at launch** (one of decision 002's success checks). Events aren't in Payload's search index.
- **If rm-playlist-v2 is down, the events pages say "unavailable"** instead of showing a list.
- **Past shows keep their pages** (old or shared links still work), but they say "This show has passed", lose the ticket button, and are hidden from search engines.
- **HYFIN's own events ("HYFIN Presents")** aren't covered until staff enter them by hand as custom events in rm-playlist-v2. Giveaways wait for the post-launch "Win" section.

## How we'll know if this was right
- The events page shows this month's concerts by artists HYFIN played recently, and they match the widget's Concerts tab.
- Event pages appear in Google with dates and venues, and a click from the playlist lands on the right page.
- Nobody asks for a concert to be added by hand that rm-playlist-v2 already knew about.

## What actually happened
<!-- Tarik fills this in. -->
