# 013 — Events live in Payload: synced concerts plus HYFIN's own events

**Decision.** Every event is a record in a Payload collection. The rm-playlist concerts sync into it every 15 minutes, and staff add HYFIN's own events there with a type. This replaces decision 008's "read concerts live, never store them." rm-playlist stays the source for concerts.

## Why this came up
Tarik wanted to add HYFIN's own events (parties, panels, community events, live broadcasts) next to the concerts, and asked what happens to an event after it's over. With concerts read live from rm-playlist, there was no place to put a staff event. A past concert's page also lasted only as long as rm-playlist kept serving it. What was at stake: two lists that never match, or staff edits that the next sync quietly overwrites.

## Options
1. **One collection, concerts synced in (chosen).** Cost: a second copy of concert data that can go stale between syncs (15 minutes at most), and a sync job to maintain.
2. **Keep concerts live, add a separate "HYFIN events" collection, and merge the two at read time.** No sync, but every page merges two sources. Staff can't hide or annotate a concert, and past concerts still vanish.
3. **Staff events only in Payload, concerts unchanged.** Smallest change, but past events stay unsolved for concerts, and the home and playlist blocks can't respect a hidden concert.

## What we chose and why
Option 1, Claude's design for Tarik's request. Each synced concert is addressed by its rm-playlist id, so every existing `/events/<id>` link keeps working. The sync writes only fields it owns (title, time, venue, tickets, lineup, play count, status), which are read-only to staff. Staff's fields (hidden, featured, image, description, recap, photos, related stories) are never touched by the sync. Nothing is deleted. A future concert that drops off rm-playlist's list is looked up once, so a cancellation shows up on its page.

## What we gave up
- A second copy of the concert data. It can be up to 15 minutes behind rm-playlist.
- The home page's "Heard on HYFIN" block and the playlist's "In town" box show concerts only, since their wording is about artists in rotation. HYFIN's own events reach the home page only once a block is added for them.
- Changing the list of event types is a code change.

## How we'll know if this was right
Staff add events without asking for help. Past events keep their pages and recaps. The cron's `events` result shows `failed: 0` most runs. A concert cancelled on Ticketmaster shows "Cancelled" on its page within a day.

## What actually happened
