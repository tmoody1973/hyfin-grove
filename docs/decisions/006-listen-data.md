# 006 — Where the Listen pages get their data

**Decision.** The playlist, schedule, show and host pages read HYFIN's songs and program times live from rm-playlist-v2, through one new query there that returns every airing with its real start and end time. Staff-owned text and photos (show descriptions, host bios and photos) live in Payload and win over Cadence's.

## Why this came up
The spec planned a one-line change in rm-playlist-v2: add HYFIN to the stations whose NPR Cadence schedule it caches, then read its existing schedule query. When building plan 4 we found that query only answers "what's on now, what's next, find a show by name". Nothing public returned the whole week, which the schedule page needs, and nothing returned past airings, which show pages need for "latest episode" tracklists. Getting this wrong means either a schedule page that can't show a week, or a second copy of the hardest code in the system: turning "Fridays, 10 pm to midnight" into real times across daylight-saving changes.

## Options
1. **New query in rm-playlist-v2 that returns real airings (chosen).** About 40 lines there, reusing its already-tested schedule code. Costs a second pull request in another repo, which Tarik merges.
2. **This site asks the "what's on now" query once per hour of the week (168 calls).** No change to rm-playlist-v2, but slow, wasteful, and it can miss half-hour shows.
3. **This site talks to Cadence directly.** A second set of Cadence credentials and a second copy of the time-zone logic, which the spec ruled out.

## What we chose and why
Option 1 (Claude, during plan 4; Tarik merges the rm-playlist-v2 PR). Time-zone and midnight handling stays in one place with tests (a 10 pm–midnight show stays on its start day; 2026-11-01's midnight-to-6 am show lasts seven real hours). This site does no time-zone arithmetic beyond formatting.

Two smaller calls made at the same time:
- **Past episodes are worked out from the current weekly schedule.** Cadence's cache holds this week's pattern, not history, so "the episode two Fridays ago" means "the Friday 10 pm–midnight window two weeks back".
- **Host pages live at `/hosts/<name>`,** not the mockup's `/djs/<name>`, because not every host is a DJ (Paula Lovo, for example).

## What we gave up
- If a show moves to a new time in Cadence, its older tracklists are cut from the new slot, so they show the wrong songs until the old weeks age out (four weeks).
- The schedule depends on a second app being up. If rm-playlist-v2 is down, the Listen pages say so instead of showing a schedule.
- `/djs/...` links from the mockups or anywhere else would need a redirect.

## How we'll know if this was right
- The schedule page shows this week's HYFIN programs, and Rhythm Lab Radio sits on Friday night, not Saturday.
- A show page's latest-episode tracklist matches the songs the playlist shows for that time window.
- After the next daylight-saving change (2027-03-14), programs still show at the right local times.

## What actually happened
<!-- Tarik fills this in. -->
