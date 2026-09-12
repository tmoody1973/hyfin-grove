# NPR CDS OpenAPI (community)

An OpenAPI 3.1 description of NPR's **Content Distribution Service (CDS)**, the API member stations use to publish and read content. NPR documents CDS in prose at <https://npr.github.io/content-distribution-service/> but does not publish a machine-readable spec. This is that spec, written by Radio Milwaukee's HYFIN team for our own site and shared so other stations don't have to repeat the work.

**Not affiliated with or endorsed by NPR.** If it disagrees with the official docs, the official docs win. Open an issue.

## What's here

| Path | What it is |
|---|---|
| `openapi.yaml` | The API description: endpoints, parameters, query semantics, responses. |
| `profiles/*.json` | NPR's own JSON Schema for each of the 63 CDS profiles, fetched from `GET /v1/profiles/{name}` and vendored unchanged except for local `$ref` paths. |
| `schemas/*.json` | The 19 shared schemas the profiles reference (`link`, `documentId`, `sizable-asset`, …), from `GET /v1/schemas/{name}`. |
| `scripts/fetch-schemas.mjs` | Re-downloads all of the above. No token needed; those endpoints are public. |
| `scripts/validate-samples.mjs` | Checks real CDS responses against the vendored schemas. |
| `redocly.yaml` | Lint config. |

The document model is NPR's, not ours: `openapi.yaml` composes the vendored profile schemas (`document` + `publishable` + whatever a document lists in `profiles`) rather than re-describing them. When NPR changes a profile, re-run the fetch script and the spec follows.

## Use it

```bash
pnpm install --ignore-workspace     # or npm install
pnpm lint                           # redocly lint openapi.yaml
pnpm bundle                         # one-file dist/openapi.bundled.yaml for generators
pnpm fetch-schemas                  # refresh profiles/ and schemas/ from CDS
```

Validate a real response (needs your own CDS token):

```bash
curl -s -H "Authorization: Bearer $NPR_CDS_TOKEN" \
  'https://content.api.npr.org/v1/documents?profileIds=story&limit=50' > sample.json
pnpm validate sample.json
```

The validator checks every document against `document` + `publishable` + each profile it claims, and every entry in its `assets` bag against its own profiles.

## How it was verified

- `redocly lint` reports the description valid. Two warnings remain on purpose: one comes from NPR's own `no-rels-link` schema, and one flags that the public `GET /v1/profiles` documents no error response, which matches NPR's docs.
- 1,000 documents and 16,925 nested assets from Radio Milwaukee's feed (stories, aggregations, podcast channels) validate with zero failures.
- 151 live documents across `newscast`, `podcast-episode`, `program-episode`, `has-premium-audio` and `has-videos` validate with zero failures.

Verified 2026-09-12 against CDS production. The pagination caps, sort grammar, date-range syntax and boolean logic of repeated parameters are transcribed from NPR's querying page and encoded as constraints and patterns in the spec.

## Things NPR's docs leave open

Marked in the spec where relevant.

- No documented rate limit or `Retry-After`; only a note that `503` means try later.
- `PUT` bodies are profile-dependent; the spec requires the composite `Document` shape.
- `transclude` values listed by NPR are "the most common"; there may be others.
- The subscription endpoint is NPR-internal and not available to member stations.

## Terms of use

CDS access for stations is governed by NPR's *API Terms of Use for Stations* (updated April 30, 2025, in NPR Studio). Every clause in it governs **API Content**: the stories, audio and photos NPR and other providers distribute. None of it restricts describing the interface. This repository contains no API Content, no tokens and no station-private data; the profile schemas it vendors are served by CDS without authentication, and the endpoint paths are already published on NPR's public docs site.

Two clauses matter to anyone building on this spec:

- **Storing content** (clauses 6, 7, 9): non-audio content may be cached for performance and stored only for display on your own noncommercial member platform, and must be refreshed regularly. Content marked premium (clause 4) may not be stored at all. Audio must be served as links from NPR's servers (clause 8).
- **Your own content** (clause 19): a station that publishes its own content into CDS may use that content however it likes.

This is a plain reading by the maintainers, not legal advice. Check the current terms in NPR Studio.

## License

MIT for the files we wrote (`openapi.yaml`, `scripts/`, this README). The vendored JSON Schemas under `profiles/` and `schemas/` are NPR's and are reproduced as served, for interoperability.
