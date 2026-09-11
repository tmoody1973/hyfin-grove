# hyfin-grove

A small Next.js site that shows HYFIN's **Ladies First** interview series, pulled live from NPR's Content Distribution Service (CDS) — the shared content API that NPR member stations publish into.

Live: https://hyfin-grove.vercel.app

## What it does

1. The server asks CDS for every story in the Ladies First series collection, newest first. Results are cached for five minutes.
2. One mapper (`lib/cds.ts`) turns each raw CDS document into a clean story: title, teaser, date, length, MP3 link, image crops, and the article body as ordered blocks.
3. The home page lists the episodes. Each episode page shows the article and a player that streams the MP3 directly from Dovetail, the podcast host.

The CDS token never reaches the browser; all fetching happens in server components.

## Run it locally

```bash
pnpm install
cp .env.example .env.local   # then fill in the values
pnpm dev
```

| Variable | What it is |
|---|---|
| `NPR_CDS_TOKEN` | Your CDS bearer token (request one from NPR Member Partnership) |
| `NPR_SERVICE_ID` | Radio Milwaukee's Organization Service ID in CDS |
| `NPR_LADIES_FIRST_SERIES_ID` | The CDS series collection ID for Ladies First |

## Why series ID, not owner

CDS has no "HYFIN" flag. Every Radio Milwaukee story, 88Nine or HYFIN, carries the same owner. The only reliable HYFIN signal is the series collection a story links to. See [`docs/decisions/001-hyfin-content-by-series-id.md`](docs/decisions/001-hyfin-content-by-series-id.md).

## Docs

- `docs/decisions/` — decision records, written for a non-engineer reader
- `docs/LEARNING-LOG.md` — what we expected, what happened, what we now believe
