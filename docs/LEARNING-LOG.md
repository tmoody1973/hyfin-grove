# Learning log

## 2026-09-11 — First CDS query for HYFIN content
- **Expected:** HYFIN content would be identifiable by owner or a station tag in CDS.
- **Happened:** Owner and branding are Radio Milwaukee wide. The only HYFIN signal is the series collection a story links to, and those series documents are not themselves in CDS. A doubled `s` in the service ID also produced silent empty results for two rounds, with HTTP 200 and no error.
- **Now believe:** Treat CDS filters as exact-match and always print the exact URL sent. Verify one known-good record before trusting a count. Keep show IDs in config, not code.
