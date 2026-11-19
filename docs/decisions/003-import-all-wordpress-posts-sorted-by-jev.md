# 003 — Import every WordPress post, sorted by Jev and checked by Tarik

**Decision.** The new site imports all of hyfin.org's posts (about 1,264 as of 2026-11-18), not just the last 18 months. Each post is sorted into one of three categories (Music, Culture, Milwaukee) and a short list of tags by Jev, a model from TypeSafe that answers with a probability instead of free text. Tarik reviews the posts that matter most and every post Jev was unsure about.

**Why this came up.** The first plan was the last 18 months plus the top pages, picked because it "felt like a good amount". Google Analytics for Jan 2023 to Nov 2026 showed the traffic sits elsewhere: posts from 2024 drew about 236,000 views, posts from the last 18 months about 14,000. Cutting at 18 months would have broken the links that still bring readers in. The old WordPress tags were no help for re-sorting (663 tags, only 9 used on 10 or more posts), so something had to read each post.

**Options.**
1. *Last 18 months plus top pages.* A smaller site. Cost: the old links people still follow would land on category pages instead of the story, and someone has to decide what counts as "top".
2. *Everything, sorted by hand.* Most accurate. Cost: well over a thousand posts read by a person before launch.
3. *Everything, sorted by AI, with people reviewing what matters.* The same import script either way; AI does the bulk, a person checks the posts readers actually see and the ones the AI was unsure of.

**What we chose and why.** Option 3. Claude recommended importing everything; Tarik agreed and chose Jev for the sorting. Jev returns a probability for each answer, so code can send every unsure post to review instead of trusting a guess. Tarik already uses Jev to pick topics in Backstory.

**What we gave up.** Weak or dated posts from 2020–2021 come along (they can be hidden from listings later without breaking their links). Older posts Jev was confident about are not read by a person, so some will be filed in the wrong category until someone notices. Every sort is a paid API call.

**How we'll know if this was right.**
- Tarik's review changes the category on fewer than 1 in 10 of the posts he checks.
- Every address in the analytics export answers with a page or a redirect, apart from the agreed junk list.
- No tag ends up with fewer than about 10 posts once the import finishes.

**What actually happened.**
