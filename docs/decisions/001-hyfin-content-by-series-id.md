# 001 — Identify HYFIN content in CDS by series ID, not by owner

**Decision.** The site finds Ladies First episodes by asking NPR's Content Distribution Service (CDS, the shared content API NPR member stations publish into) for documents in one *series collection* (`g-s921-13049`), rather than for everything Radio Milwaukee owns.

**Why this came up.** We assumed HYFIN content would be tagged as HYFIN somewhere. It is not. Every Radio Milwaukee story, whether it aired on 88Nine or HYFIN, carries the same owner (`s921`) and the same branding. The first query returned New Music Friday and Milwaukee With Kids posts, which are not HYFIN. If we had built on the owner filter, the site would have shown the wrong station's content.

**Options.**
1. *Filter by owner* (`ownerHrefs=…/s921`). Simplest, but returns all of Radio Milwaukee. Wrong result.
2. *Filter by series collection ID.* Exact for shows that link their stories to a series document. Cost: the series documents themselves are not published to CDS, so their names cannot be read from the API; we learned the mapping by looking at each story's public URL. Any new HYFIN show needs its ID added by hand.
3. *Filter by the story's public URL path* (`/show/ladies-first/…`). Works even for stories with no series link, but means parsing URLs, which is brittle and slower.

**What we chose and why.** Option 2, chosen by Claude with Tarik confirming Ladies First as the target. It is exact, it is one query parameter, and the ID lives in one env variable so more shows can be added without code changes.

**What we gave up.** About 25 recent Radio Milwaukee stories under `/show/…` URLs have no series link at all and would be missed by this filter if any of them are HYFIN. We also cannot self-discover new HYFIN shows; someone has to supply each series ID.

**How we'll know if this was right.** When Tarik confirms which of the six series found (Ladies First, DJ Takeover, In the Mix, La Alternativa, Audio Taste Test, What's All This) are HYFIN, the combined query should return only HYFIN posts with no 88Nine content mixed in. If HYFIN stories keep turning up without a series link, option 3 needs to be layered in.

**What actually happened.**
_(Tarik fills this in.)_
