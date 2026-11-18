# Learning log

## 2026-09-11 — First CDS query for HYFIN content
- **Expected:** HYFIN content would be identifiable by owner or a station tag in CDS.
- **Happened:** Owner and branding are Radio Milwaukee wide. The only HYFIN signal is the series collection a story links to, and those series documents are not themselves in CDS. A doubled `s` in the service ID also produced silent empty results for two rounds, with HTTP 200 and no error.
- **Now believe:** Treat CDS filters as exact-match and always print the exact URL sent. Verify one known-good record before trusting a count. Keep show IDs in config, not code.

## 2026-09-12 — Making the CDS MCP server find things by name

**What we expected.** The server was slow because CDS is slow, or because the model had to make several calls. Adding a keyword search would fix most of it.

**What happened.** CDS answered 300 stories in under a second. The slowness was entirely in what the server handed back: about 17 KB per story of which about 100 bytes mattered, and anything past five stories was cut off by the 25,000-token limit on tool results. CDS has no text search at all, and no way to list topics, tags, or shows; station shows like Ladies First are not even fetchable documents. So the fix was three things, not one: trim what comes back, look names up through NPR's public station directory and a catalog the server learns as it goes, and do the word matching inside the server. "Latest AI stories" went from 5 calls and 227,000 characters to 1 call and 6,800. A late surprise: regenerating the server from the spec silently dropped the new dependency and the test script, which we caught only by regenerating before publishing. An after-generate step now puts them back.

**What we now believe.** For an AI agent, an API wrapper that returns raw responses is not a tool, it's a firehose. The wrapper's job is to resolve names, filter before the model reads, and return what a person would want to see. And any file a generator owns will be overwritten; hand edits have to live in a template or be re-applied by a script, and the regeneration has to be part of the release checklist.

## 2026-11-18 — What hyfin.org's posts are actually made of
- **Expected:** WordPress posts would be mostly text and images, with an occasional embed, so a simple HTML-to-rich-text conversion would carry the archive.
- **Happened:** A census of all 1,264 posts found embedded players in 598 of the 1,252 we import (YouTube 331, Spreaker 143, Spotify 110, NPR 61, PRX 28, Bandcamp 20), WordPress audio blocks in 118, and Instagram/Twitter/TikTok script embeds in 48. Inline images also point at WordPress's resized copies, not the originals, and the featured image is usually repeated inside the body. Separately, three bugs only showed up in a real browser or a real dev server, not in tests or the production build: images blocked for logged-out visitors, two route patterns Next refuses side by side, and image IDs saved as text where Postgres wants numbers.
- **Now believe:** Run a census before designing a migration; half the archive's character lives in embeds, so the import needs a real embed block before the bulk run. And "the build passes" is not "it works": check every slice in a browser as a logged-out visitor.
