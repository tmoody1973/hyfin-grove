# How to organize HYFIN content so Grove can find it

*For the digital editor. Grove does not have its own content. It pulls stories from CDS, the shared system NPR stations publish into. What Grove can show depends entirely on the labels you attach when you publish.*

## How a story travels

1. **You publish in Brightspot.** Write the story, attach the audio, pick a primary image, set the Show, Topic and Tags.
2. **Brightspot sends it to CDS automatically.** The story and its labels are copied to NPR's Content Distribution Service within minutes.
3. **Grove asks CDS by label, every 5 minutes.** Each Grove section is a list of labels. Grove asks CDS for stories carrying them and shows the newest first.

Nothing is copied by hand. If a story has the right labels in Brightspot, it appears on Grove within about five minutes of publishing.

## What Grove can and cannot see

| Label in Brightspot | What CDS calls it | Example from a real HYFIN story | Grove can filter on it? |
|---|---|---|---|
| Show | series | Ladies First, DJ Takeover, La Alternativa, In the Mix | Yes |
| Topic | topic | New Music, Studio Milwaukee Sessions | Yes |
| Tag | tag | On Vinyl, Family Fun, Milwaukee Music Premiere | Yes |
| Section | category | Alt.Latino, All Songs Considered | Yes |
| Author | byline | one per writer | Yes |
| Station | owner | Radio Milwaukee | Not useful: 88Nine and HYFIN share it |
| "This is HYFIN" | nothing | no such label exists today | No |

That last row is the whole problem. Every Radio Milwaukee story looks the same to CDS whether it aired on 88Nine or HYFIN. The only way Grove knows a story is HYFIN is that it belongs to a HYFIN show, or carries a tag we have agreed means HYFIN.

## How Grove sections work

A Grove section is a name plus the list of labels that feed it. Grove keeps that list; you decide what goes in it. Current draft, ready for correction:

| Grove section | Fed by these labels | Status |
|---|---|---|
| Interviews | Show: Ladies First | Live |
| Interviews | Show: In the Mix | Needs your yes |
| La Alternativa | Show: La Alternativa | Needs your yes |
| DJ Takeover | Show: DJ Takeover | Needs your yes |
| Vinyl | Tag: On Vinyl | Is this HYFIN or 88Nine? |

A story can carry several labels, so it can appear in several sections. A Ladies First story tagged On Vinyl would show in Interviews and in Vinyl. If you do not want that, use fewer tags or tell us which section wins.

**To add or change a section:** send the section name as it should appear on Grove, the shows or tags that feed it, and where it sits in the order. Changing the list takes minutes. No story needs to be republished.

## What to do when you publish

- [ ] Set the **Show** on every story that belongs to a show. This is the strongest HYFIN signal Grove has.
- [ ] Use the **agreed tags** only. "HYFIN Interviews" and "hyfin interview" are two different labels to CDS. Pick one spelling and keep it.
- [ ] **Attach the audio in Brightspot**, not as a link in the text. Grove's player reads the attached audio file.
- [ ] Set a **primary image**. Grove uses it for the list thumbnail and the story header. No image means a blank box.
- [ ] Write the **teaser**. It is the sentence under the title on Grove's list page.
- [ ] Keep the title pattern **"Show name: Guest"** for show episodes. Grove strips the show name on the section page so the guest reads first.
- [ ] After publishing, **wait five minutes** before reporting a missing story.

## One request for the digital team

Right now Grove tells HYFIN from 88Nine by keeping a list of HYFIN shows. That list has to be edited every time a show launches or ends. A single tag fixes that permanently.

- Create a tag in Brightspot named **HYFIN** and apply it to every HYFIN story going forward.
- Optionally add theme tags: **HYFIN Interviews**, **HYFIN Music**, **HYFIN Culture**.
- Confirm the tags publish to CDS. We can check this within an hour of the first tagged story.
- Send us the tag names. We look up their CDS IDs and wire them to Grove sections.

Tags already flow to CDS from Brightspot today. On Vinyl and Family Fun both arrive with their names intact, so this is configuration, not new engineering.

## When a story is missing from Grove

1. **Is it published?** Drafts and scheduled posts never reach CDS.
2. **Has it been five minutes?** Grove re-asks CDS on that cycle.
3. **Does it have the label the section needs?** Open the story in Brightspot and check the Show or Tag. This is the cause nine times out of ten.
4. **Is the audio attached?** The story will still show, but without a player.
5. If all four check out, send us the story's public URL. We can see exactly what CDS received.

## Words you'll hear us use

- **CDS** — Content Distribution Service. NPR's shared content system. Brightspot publishes into it; Grove reads from it.
- **Brightspot** — Radio Milwaukee's publishing system, where you write and label stories.
- **Label** — Our word for any Show, Topic, Tag, Section or Author attached to a story. CDS calls them collections.
- **Section** — A page on Grove that lists stories. Each section is fed by one or more labels.
- **Series ID** — The code CDS uses for a show, such as `g-s921-13049` for Ladies First. You never need to type these; we look them up.
- **Dovetail** — The audio host. When Brightspot has an attached audio file, CDS carries a Dovetail link and Grove's player streams from it.

*Grove test site: hyfin-grove.vercel.app. Label examples come from live CDS records for Radio Milwaukee, September 2026.*
