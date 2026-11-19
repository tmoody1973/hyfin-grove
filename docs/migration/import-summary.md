# WordPress import summary

Full run 2026-11-18 (18:58–20:09 CST, plus a 12-post retry). Source: hyfin.org REST API, 1,264 posts.
Numbers below are from the database after the run, not from a single run's log.

| | Count |
|---|---|
| Posts on hyfin.org | 1,264 |
| Excluded (Ladies First, category 1169; CDS owns that show) | 12 |
| **Imported** | **1,252** |
| Failed | 0 (12 failed on bad links in the first pass; fixed and retried) |
| Images in Vercel Blob | 2,784 files, ~1.0 GB |

## Categories (Jev)

| Category | Posts |
|---|---|
| Music | 628 |
| Culture | 400 |
| Milwaukee | 224 |

## Review queue: 433 posts

A post can have more than one reason.

| Reason | Posts |
|---|---|
| Jev unsure (confidence < 0.7) | 186 |
| Last 18 months (since 2025-05-18) | 175 |
| Top 100 by analytics views | 100 |

## Tags

At most 2 per post, 70% likelihood, each with a definition. Average 1.33 per post; 83 posts have none.
No tag is under 10 posts, so there are no merge candidates.

| Tag | Posts |
|---|---|
| New Releases | 324 |
| History & Heritage | 215 |
| Interviews | 201 |
| Live & Concerts | 198 |
| Politics & Policy | 160 |
| Business | 149 |
| Community | 112 |
| Arts | 85 |
| Entertainment | 85 |
| Tech & AI | 69 |
| Industry | 39 |
| Food | 28 |

## What happened along the way

- **Tags paused the run at 289 posts.** The first rules (bare tag names, a 50% bar, no cap) put Arts on 80% and Entertainment on 79% of posts. The fix added definitions, a 70% bar and at most 2 tags; the 289 were re-sorted.
- **12 posts failed on links Payload rejects.** Editors had pasted sentences into WordPress's link box, and some footnote anchors had no address. Those links now become plain text, and all 12 imported on retry.

Per-post detail: `import-report.csv`.
