# hyfin-grove

> HYFIN's next site, built on NPR's Content Distribution Service (CDS). Plus the tools we made along the way: an OpenAPI spec for CDS and an MCP server so AI agents can query it.

HYFIN is Radio Milwaukee's urban-alternative station. Grove is its new home on the web. The station publishes stories through Brightspot into CDS, the shared content API NPR member stations use; Grove reads them from there.

Live test site: https://hyfin-grove.vercel.app

## What's in this repo

| Part | Path | Status |
|---|---|---|
| **The site**: Next.js app showing the Ladies First interview series with an audio player | `app/`, `lib/`, `components/` | Live |
| **CDS OpenAPI spec**: community-written description of NPR's CDS API, with NPR's own profile schemas vendored | `cds-spec/` | Verified against 1,151 live documents |
| **CDS MCP server**: lets Claude or any MCP client query CDS; published to npm as `npr-cds-mcp` | `cds-spec/mcp-server/` | v0.1.0 on npm |
| **Docs**: decision records, learning log, and the editor's guide to labeling HYFIN content | `docs/` | Ongoing |

## The site

1. The server asks CDS for every story in the Ladies First series, newest first. Results are cached for five minutes.
2. One mapper (`lib/cds.ts`) turns each raw CDS document into a clean story: title, teaser, date, length, MP3 link, image crops, and the article body as ordered blocks.
3. The home page lists the episodes. Each episode page shows the article and a player that streams the MP3 directly from Dovetail, the podcast host.

The CDS token never reaches the browser; all fetching happens in server components.

### Run it locally

```bash
pnpm install
cp .env.example .env.local   # then fill in the values
pnpm dev
```

| Variable | What it is | Required |
|---|---|---|
| `NPR_CDS_TOKEN` | Your CDS bearer token (request one from NPR Member Partnership) | Yes |
| `NPR_SERVICE_ID` | Radio Milwaukee's Organization Service ID in CDS (`s921`) | Yes |
| `NPR_LADIES_FIRST_SERIES_ID` | The CDS series collection ID for Ladies First (`g-s921-13049`) | Yes |

### Why series ID, not owner

CDS has no "HYFIN" flag. Every Radio Milwaukee story, 88Nine or HYFIN, carries the same owner. The reliable HYFIN signals are the series a story belongs to and, since September 2026, a `HYFIN` tag the editors apply. See [decision 001](docs/decisions/001-hyfin-content-by-series-id.md).

## The CDS spec and MCP server

NPR documents CDS in prose but publishes no machine-readable spec. `cds-spec/openapi.yaml` is that spec, composed from the JSON Schemas CDS serves for its 63 profiles. From it, [Cortex](https://github.com/cortex-docs/cortex) generates an MCP server with one tool per CDS operation.

Install the server for Claude Code in two lines:

```bash
npx -y npr-cds-mcp setup                                 # asks for your CDS token once
claude mcp add npr-cds -s user -- npx -y npr-cds-mcp
```

Then ask Claude things like "what are the three newest Ladies First episodes, sorted newest first?" Full details, validation, and the terms-of-use reading are in [`cds-spec/README.md`](cds-spec/README.md).

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4, Fraunces + Instrument Sans |
| Content source | NPR CDS, read server-side with a five-minute cache |
| Audio | Streamed from Dovetail (PRX) via links CDS provides |
| Hosting | Vercel, deploys from every push to `main` |
| CI | GitHub Actions: typecheck, lint, build, and spec lint |
| Spec tooling | Redocly (lint, bundle), Ajv (validate real responses), Cortex (MCP generation) |

## Project structure

```
hyfin-grove/
├── app/                  # Next.js routes: home list and /stories/[id]
├── components/           # AudioPlayer
├── lib/cds.ts            # CDS fetch + mapping, server-only
├── cds-spec/             # OpenAPI spec, vendored NPR schemas, MCP server, Cortex config
├── docs/
│   ├── decisions/        # Decision records in plain English
│   ├── LEARNING-LOG.md   # What we expected, what happened, what we now believe
│   └── editor-guide-*    # How the digital editor labels HYFIN content (md, PDF, design canvas)
└── .github/workflows/    # CI
```

## Where this is going

Recorded in [decision 002](docs/decisions/002-payload-as-the-content-store.md):

- **Payload CMS** inside this app, on Vercel with Postgres and Blob, as the single content store.
- **CDS synced in** on a schedule instead of read live, so search and sections work across everything. HYFIN-owned content first; NPR's station terms shape what else may be stored.
- **WordPress archive** from hyfin.org imported once: about 1,248 posts and 1.5 GB of images, Ladies First excluded because CDS owns it.
- **Events** from a separate dataset.
- **Sections and topics** for Grove, fed by CDS labels and WordPress categories.

## Contributing

Issues and pull requests are welcome, especially from other NPR member stations using CDS. Decisions that could reasonably have gone another way get a record in `docs/decisions/`; the "what actually happened" line is written by a human, after the fact.

## License

MIT for the code and docs we wrote. The JSON Schemas under `cds-spec/profiles/` and `cds-spec/schemas/` are NPR's, reproduced as served for interoperability. Use of CDS content is governed by NPR's API Terms of Use for Stations.
