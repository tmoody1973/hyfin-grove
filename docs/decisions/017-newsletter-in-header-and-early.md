# 017: The newsletter goes in the header, early on the homepage, and on the playlist

**Decision.** "Newsletter" is a green item in the header on every page. The homepage's signup moves up to right after "Latest", inside a green frame, and the playlist page gets its own red "Like what you're hearing?" card. This reverses plan 14's recommendation to leave the newsletter out of the header.

## Why this came up
Plan 14 kept the header to five sections plus Support, worried a sixth item would crowd phones. It put the homepage signup after the concerts. Tarik asked for the newsletter in the nav, easy to find on the homepage, and standing out on the playlist. Measured on 2026-11-20, the homepage signup sat 2,846 px down on desktop (about 3 screens) and 4,530 px down on a phone (about 5½ screens). The playlist had none. What was at stake: a list that only grows from people who happen to scroll to the bottom.

## Options
1. **Header link, early homepage panel, playlist card (chosen).** Cost: one more item in the header, and the homepage's originals and concerts move down by one panel.
2. **A pop-up or slide-in after a few seconds.** Seen by everyone, but it interrupts listening. Google also penalizes intrusive pop-ups on phones.
3. **Keep plan 14's placements.** A quieter header, but the signup stays hard to find.

## What we chose and why
Tarik asked for the header, homepage and playlist placements. Claude designed them:
- **Header:** the green ■ marker reads as different from the sections, and on phones it fits on the second row next to Events. The phone header stays 227 px tall, measured before and after.
- **Homepage:** the panel moves to right after the first stories: 1,628 px down on desktop and 2,209 px on a phone, roughly half the distance. The frame makes it stand out from sections that only have a top rule.
- **Playlist:** the card meets people mid-listen. On phones, the full card would sit below the whole song list, so a one-line link goes above the list instead, without pushing it down.
- **No pop-ups.**

The homepage keeps one signup in the page itself (plus the footer), so it doesn't ask twice.

## What we gave up
- **The header is one item busier.**
- **On the homepage, the originals and concerts sit one panel lower.**
- **On phones, the playlist link costs a tap to reach the form** (it goes to `/newsletter`).

## How we'll know if this was right
Mailchimp's `signup:home`, `signup:playlist` and `signup:page` tags (the last includes visits from the header link) show where signups come from. After a month, the early homepage panel and the playlist should account for a real share of new signups, more than the footer.

## What actually happened
