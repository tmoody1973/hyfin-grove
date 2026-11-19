# 009 — Uniquely Milwaukee comes in through the station's HYFIN feed

**Decision.** Uniquely Milwaukee episodes that Radio Milwaukee tags HYFIN are imported from radiomilwaukee.org's HYFIN tag feed (an RSS feed, a machine-readable list of the newest items), not from NPR's content system (CDS) like the rest of HYFIN's station stories.

## Why this came up
Tarik wants Uniquely Milwaukee stories tagged HYFIN on HYFIN's Milwaukee page. The CDS sync (decision 001) can't see them. Uniquely Milwaukee pages on radiomilwaukee.org are podcast-episode pages, and the station's website system never sends those to CDS: their CDS ids (for example `g-s921-18227`) return nothing. CDS only holds copies pulled from the podcast feed, and those copies don't carry the HYFIN tag. If we got this wrong, either the stories never appear, or every Uniquely Milwaukee episode (94 of them) floods the Milwaukee page, HYFIN-related or not.

## Options
1. **Read `radiomilwaukee.org/tags/hyfin.rss` every 15 minutes (chosen).** It lists the 10 newest HYFIN-tagged items, including Uniquely Milwaukee episodes. The text and audio come from the episode's podcast-feed copy in CDS, matched by title and date. Cost: depends on the station site keeping that feed; the feed only holds the 10 newest, so an outage of 2+ weeks could miss some.
2. **Fix it at the source.** Ask Radio Milwaukee's web team or NPR to send podcast-episode pages to CDS, then make a small change to the CDS sync. Cost: depends on other people and may not be possible in the station's website system.
3. **Editors add each episode by hand** in the HYFIN admin. Cost: a few minutes per episode, every week, forever.

## What we chose and why
Option 1 (Tarik, 2026-11-19, from Claude's options). It respects the tag editors already apply on radiomilwaukee.org, runs without anyone remembering to do it, and needs nothing from another team.

## What we gave up
- **A second source to watch.** The 15-minute job now reads two places; a change to the station site's feed could break this part quietly (the sync status records its errors).
- **Episodes tagged long ago** (beyond the newest 10 in the feed) need a one-time manual import.
- **Untagging isn't noticed.** If someone removes the HYFIN tag later, the episode stays on HYFIN until an editor removes it.
- **An episode whose podcast copy isn't in CDS yet** arrives with only its summary and no audio; the next run fills them in.

## How we'll know if this was right
- New Uniquely Milwaukee episodes tagged HYFIN appear on `/milwaukee` within 15 minutes of publishing, with audio.
- No untagged Uniquely Milwaukee episode ever appears, and none appears twice.
- Nobody has to add one by hand.

## What actually happened
<!-- Tarik fills this in. -->
