# 015: NPR stories are kept in Payload as self-refreshing copies, and staff can add any NPR story

**Decision.** NPR's own stories become Payload posts with `source: "npr"`. Two ways in:
1. **Automatic:** the 4 newest stories in NPR's Race topic, filed in Culture, as before.
2. **Picked:** any NPR story staff add from **Admin → Add from NPR** by search or by pasting an npr.org link, into the section they choose.

Every copy is read-only. A 15-minute sync refreshes it from CDS (NPR's Content Distribution Service), withdraws it if NPR stops serving it, and deletes unpicked Race copies 30 days after NPR published them. Copies open at `/npr/<id>`, credit NPR, and point search engines to npr.org. This replaces decision 010's "never stored".

## Why this came up
Tarik (2026-11-20) wanted the Race stories stored in Payload, filterable in the admin, and the power to "bring in content from CDS that we can select that fits HYFIN", with NPR's Orchestra Noir story as the example. Under decision 010, NPR stories were read live and existed nowhere in the admin. Staff couldn't see, feature, tag or file them, and couldn't add a music story NPR had published.

What was at stake: CDS marks NPR's stories **"display-only: attribute via url, refresh regularly, do not store beyond display."** Storing them carelessly would break those terms. Not storing them kept staff from curating NPR at all.

## Options
1. **Self-refreshing copies (chosen).** Stored, but treated as a cache of NPR's story: refreshed every 15 minutes, withdrawn (text cleared) when NPR pulls it, Race copies deleted after 30 days, never in our RSS feed or sitemap, canonical on npr.org.
   - Cost: a second sync to maintain, and a shared database that briefly holds NPR's text.
2. **Stay live-only (decision 010), and add a picker that stores only a pointer.** The picker would save an NPR id and section, and pages would read the story live.
   - Cost: every listing still depends on CDS answering at page time, the admin still couldn't show or filter the story's content, and two code paths would remain.
3. **Import NPR stories like our own CDS stories.** The simplest.
   - Cost: it breaks NPR's "do not store beyond display" terms.

## What we chose and why
Tarik chose self-refreshing copies. Claude designed the rules that keep them inside NPR's terms:
- **Refresh every 15 minutes.**
- **Withdraw** when NPR stops serving a story, or makes it premium or another station's.
- **Hide** copies CDS can't confirm for 24 hours.
- **Delete** unpicked Race copies after 30 days. Race publishes about 10 stories in 60 days, so Culture holds about 5 at a time.
- **Keep them out of RSS and the sitemap,** with the canonical address on npr.org.

Claude also made three implementation calls:
- **Reuse the existing `cds` field group.** Withdrawn stories already disappear from the site through it.
- **Exclude `source: "npr"` from the Radio Milwaukee sync,** which would otherwise have treated NPR copies as its own.
- **Make the picker search by matching titles,** because CDS has no text search. It scans NPR's newest 300 stories, the method Tarik's npr-cds MCP uses. A pasted npr.org link is an exact lookup.

## What we gave up
- **NPR's text sits in our database** between refreshes (at most 15 minutes stale), not only in a 15-minute page cache.
- **Keyword search covers only NPR's 300 newest stories.** Older stories need their npr.org link pasted.
- **A Race story staff never picked disappears after 30 days,** even from Culture's archive pages.

## How we'll know if this was right
- **The cron's `npr` counts** show copies refreshed every run, with withdrawals and expiries working.
- **Staff add NPR stories** from Add from NPR at least weekly.
- **No NPR copy appears** in `/feed.xml` or `/sitemap.xml`.

## What actually happened
