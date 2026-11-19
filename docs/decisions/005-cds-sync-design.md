# 005 — How HYFIN stories get from NPR CDS onto the site

**Decision.** Every 15 minutes a scheduled job copies HYFIN's stories from CDS (NPR's shared story database) into the site's content store. It keeps story text exactly as Brightspot wrote it rather than converting it to the editor's format, skips CDS's copies of WordPress posts, and reports a heartbeat that an hourly GitHub check watches.

**Why this came up.** Decision 002 chose to copy CDS stories into Payload rather than read CDS live. That left three practical questions, each of which could quietly break the site if answered wrong: where the job runs and how anyone learns it stopped, what shape the story text takes, and how to avoid showing a story twice.

**Options.**

*Where it runs and how we hear about failures*
1. *Vercel Cron (a schedule built into the hosting) plus a GitHub check on a "last success" timestamp.* Uses what we already pay for (the Pro plan allows a 15-minute schedule). Cost: two moving parts, and GitHub's scheduled checks can run late by several minutes.
2. *GitHub Actions runs the sync itself.* One place for both. Cost: the sync would need database and API secrets copied into GitHub, and GitHub pauses scheduled jobs in repos with no activity for 60 days.
3. *A job on the Hetzner server.* Full control. Cost: one more server process to keep alive, outside the app's deploys.

*What shape the story text takes*
1. *Convert to Payload's rich-text format (Lexical).* Synced and archive stories look identical to the editor. Cost: conversion needs an HTML parser (jsdom), and jsdom inside the live server is exactly what returned errors on every page on 2026-11-18.
2. *Store Brightspot's blocks as they are and draw them directly.* No parser in the server; the page renderer already existed. Cost: synced stories can't be edited in the admin. The spec already requires that (Brightspot is where they are edited), so nothing is lost today.

*Duplicates*
- CDS turned out to contain copies of WordPress posts (ids like `hyfin-440659`), already imported from WordPress itself. Either match them to the imported post and skip, or skip the whole `hyfin-` family. They are WordPress's own feed, and WordPress is frozen, so skipping all of them is simpler and loses nothing.

**What we chose and why.** Vercel Cron plus the GitHub heartbeat, stored blocks, and skip every `hyfin-` document. Claude recommended all three; Tarik approved plan 3, which contained them. The text choice was decided by the outage: the safest server is one where the parser is never there to break.

**What we gave up.**
- Synced stories can't be corrected in the admin, only in Brightspot (category, tags and show stay editable).
- Stories filed under Ladies First, In The Mix or La Alternativa get no tags automatically; only stories with the bare HYFIN tag are sorted and tagged by Jev.
- The heartbeat alerts within about an hour, not instantly.
- Story HTML is cleaned with patterns rather than a full parser. That is fine for our own editors' HTML; it would not be enough for another station's.

**How we'll know if this was right.**
- A story published in Brightspot appears on the site within 15 minutes, untouched by anyone.
- Over the first month, a check finds zero stories that appear twice.
- When the sync is deliberately broken (for example, a wrong token on a preview), the heartbeat check fails within the hour.
- No page error in Vercel's logs traces back to the sync code.

**What actually happened.**
_(Tarik fills this in.)_
