# Learning log

## 2026-09-11 — First CDS query for HYFIN content
- **Expected:** HYFIN content would be identifiable by owner or a station tag in CDS.
- **Happened:** Owner and branding are Radio Milwaukee wide. The only HYFIN signal is the series collection a story links to, and those series documents are not themselves in CDS. A doubled `s` in the service ID also produced silent empty results for two rounds, with HTTP 200 and no error.
- **Now believe:** Treat CDS filters as exact-match and always print the exact URL sent. Verify one known-good record before trusting a count. Keep show IDs in config, not code.

## 2026-11-18 — What hyfin.org's posts are actually made of
- **Expected:** WordPress posts would be mostly text and images, with an occasional embed, so a simple HTML-to-rich-text conversion would carry the archive.
- **Happened:** A census of all 1,264 posts found embedded players in 598 of the 1,252 we import (YouTube 331, Spreaker 143, Spotify 110, NPR 61, PRX 28, Bandcamp 20), WordPress audio blocks in 118, and Instagram/Twitter/TikTok script embeds in 48. Inline images also point at WordPress's resized copies, not the originals, and the featured image is usually repeated inside the body. Separately, three bugs only showed up in a real browser or a real dev server, not in tests or the production build: images blocked for logged-out visitors, two route patterns Next refuses side by side, and image IDs saved as text where Postgres wants numbers.
- **Now believe:** Run a census before designing a migration; half the archive's character lives in embeds, so the import needs a real embed block before the bulk run. And "the build passes" is not "it works": check every slice in a browser as a logged-out visitor.
