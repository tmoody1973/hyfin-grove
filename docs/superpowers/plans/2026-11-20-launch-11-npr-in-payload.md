# Launch plan 11: NPR stories in Payload: the Race section automatically, plus a staff picker

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. TDD per task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** NPR's own stories become Payload records that staff can see, filter and feature. Two ways in:
1. **Automatic:** the Race section, as today.
2. **Picked:** in the admin, staff search NPR's CDS (Content Distribution Service), for example "orchestra noir", see results with photo, date and teaser, and click **Add to HYFIN** to choose a section (Music, Culture or Milwaukee). Example: `https://www.npr.org/2026/11/20/g-s1-154644/orchestra-noir-black-musical-tour-classical-music`.

Every NPR record is a **self-refreshing, read-only copy**. That was Tarik's choice on 2026-11-20, because NPR marks its own stories "display-only: attribute via url, refresh regularly, do not store beyond display".

**Architecture:**
- Posts gain `source: "npr"`. These posts are created and refreshed by code only, are read-only to staff (like CDS stories), carry NPR's canonical URL and credit, and record when they were last refreshed.
- The 15-minute cron refreshes every NPR post. A story NPR withdraws, or one older than 30 days that's no longer in the Race topic and wasn't picked by staff, is unpublished and its body cleared, so nothing is kept "beyond display".
- **The picker:** an admin page (Payload custom view) under Posts → "Add from NPR". It searches CDS through the existing `lib/npr` client and only lists stories owned by NPR (s1) or by Radio Milwaukee (s921). Radio Milwaukee's own stories still come through the normal CDS sync; the picker shows them as "already on HYFIN". It refuses premium/restricted stories and anything without a public npr.org URL.
- `/npr/<id>` stays the address. The page now reads the Payload copy and falls back to a live CDS read when there isn't one.
- The admin's Posts list gets a **Source** column and filter: WordPress archive, Radio Milwaukee (CDS), NPR, Radio Milwaukee site.

**Spec:** decision 010 (NPR Race on HYFIN, display-only), updated by decision 015 in this plan. Tarik, 2026-11-20: store Race stories as self-refreshing copies; "bring in content from CDS that we can select that fits HYFIN".

## Global Constraints
- NPR's terms: never edit NPR's words, always credit NPR with a link to npr.org, refresh at least every 15 minutes, and stop showing a story NPR withdraws (on the next refresh).
- Staff can set on an NPR post: section, featured, hidden, tags, related events. Everything else is sync-owned, so it's locked.
- A picked story keeps its section until staff remove it. Automatic Race stories expire after 30 days unless a staff member has picked them.
- Search engines: canonical stays npr.org (decision 010). NPR posts stay out of the sitemap.

## Review Focus
1. NPR withdraws a picked story: on the next refresh it's hidden, its body is cleared, and its page 404s or redirects to the section.
2. A picker search that returns a premium story, a story from another station, or one with no URL: not offered.
3. Staff pick a story that's already in HYFIN (same CDS id): no duplicate; the existing post opens.
4. CDS down during refresh: existing copies stay as they are and the failure is logged. A copy whose last refresh is more than 24 hours old is hidden.
5. The picker never accepts a raw HTML or URL input that becomes a fetch to an arbitrary host (SSRF). It only searches CDS by text, or by NPR URL/ID resolved through CDS.

---

### Task 1: The NPR source on Posts
`source: "npr"`, `npr { id, url, refreshedAt, pickedBy, pickedAt, expiresAt }`, field locks, migration, the Source column and filter in the Posts list.

### Task 2: Store and refresh NPR copies
Move the Race block from live reads to stored copies: the create/refresh/expire logic, with tests per Review Focus 1, 3 and 4, wired into the cron. Backfill the current Race items.

### Task 3: "Add from NPR" in the admin
A Payload custom view: search box, results (photo, title, date, teaser, section picker), **Add to HYFIN**, and "already on HYFIN" marks. Accepts an npr.org URL like the Orchestra Noir link. Tests for the filter rules (Review Focus 2 and 5).

### Task 4: Pages read the copies
`/npr/<id>`, home Latest and Culture read Payload. Decision record 015. README. Browser check: pick the Orchestra Noir story into Music, see it in Music's latest, open its page (credit, npr.org canonical). Final review, PR.
