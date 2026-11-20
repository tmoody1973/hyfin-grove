# 020: Google Ad Manager ads, switched on and off in Payload

**Decision.**
- **Campaigns stay in Google Ad Manager:** line items, creatives, dates, who sees what.
- **Admin → Ads decides which ad spots exist on hyfin.org, and whether each is on.** It's a single settings page with a site-wide switch, Radio Milwaukee's network code (`118058336`) stored once, and a list of spots.
- **The first spot is a banner on the playlist page, under "On air."** It's 300×50 on phones and 728×90 on desktop, uses HYFIN's own ad unit, `HYFIN-Playlist-Banner`, and ships switched **off**.
- **Google's ad tag loads only on a page with a switched-on spot.**

## Why this came up
Tarik (issue #22, 2026-11-20) asked to run Radio Milwaukee's Google ads on the new HYFIN site, starting with the playlist, and to let staff turn each spot on or off from Payload. On radiomilwaukee.org, Brightspot does the same job with "Google DFP Ad" objects. What was at stake:
- **Sponsor revenue** on a page people keep open for hours.
- **The page itself:** the playlist's speed and look, and visitors' privacy.

## Options
1. **A settings page (Payload "global") with a list of spots (chosen).**
   - **Costs:** spots aren't separate records, so there's no per-spot edit history, and a long list of spots would get unwieldy.
2. **An Ad slots collection plus an Ads settings page,** as the issue first proposed.
   - **Costs:** two admin screens for what is, today, one banner, and the network code would be split from the spots it applies to.
3. **Hard-code the ad in the playlist page.**
   - **Costs:** every on/off change becomes a code deploy, which is exactly what Tarik wanted to avoid.

## What we chose and why
**Tarik chose:**
- **HYFIN's own ad units,** not Radio Milwaukee's existing `Playlist-Feed-Ads`, so Ad Manager reports HYFIN separately and sponsors can buy HYFIN alone. Every request also carries `site=hyfin` and `page=playlist`.
- **One banner under On air.**
- **Personalized ads,** as radiomilwaukee.org serves today.

**Claude chose:**
- **One settings page instead of a collection,** because it's the smallest thing that does the job, and a spot list fits on one screen.
- **The same Google tag settings as radiomilwaukee.org:** lazy loading, a single combined request, empty boxes collapse, nothing is fetched until the spot is set up.
- **Reserving the ad's height before it loads,** so the page doesn't jump.
- **Removing the spot when visitors leave the page,** since the site changes pages without reloading.

## What we gave up
- **No per-spot edit history,** because spots live inside one settings page.
- **The ad can't run until ad ops acts:** they must create `HYFIN-Playlist-Banner` (300×50 and 728×90) in Ad Manager and target a campaign at it. Until then, a switched-on spot gets no ad and the box collapses.
- **Google's tag sets cookies on the playlist page** whenever a spot is on.
- **More placements** (stories, home) mean adding an option to the placement list and one line on that page.

## How we'll know if this was right
- **Ad Manager's delivery report** shows impressions on `HYFIN-Playlist-Banner` within a day of switching it on.
- **Switching a spot off in Payload** removes it, and Google's tag, on the next page load.
- **The playlist's layout doesn't jump** when an ad arrives.

## What actually happened
