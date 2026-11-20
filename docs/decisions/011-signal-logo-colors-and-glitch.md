# 011 — The Signal logo changes color by section; headlines glitch, then lock

**Decision.** The header and footer show Tarik's Signal wordmark (`docs/HYFIN_Logos/signal`) in the color of the section the reader is in: red on Listen and host pages, green on Milwaukee and Events (Milwaukee stories included), blue on Shows, white everywhere else. Page headlines "tune in" with a red/blue split for about a second, lock, and burst briefly every 9 seconds. Landing-page headings and the logo carry scanlines (thin horizontal lines through the letters). A Stabilize switch in the header turns every glitch off.

## Why this came up
Concept slide 6 ("Direction B: Signal") gives each color a meaning (red = live and on air, green = Milwaukee and events, blue = series and originals) and says the glitch touches headlines only, never body text, with a Stabilize switch that calms it. Tarik made logo files in each color and asked for them on the site "based on the colors," plus the slide's glitch and, mid-build, the scanlines from a glitch reference site. What was at stake: an effect that runs forever can make a page hard to read or unusable for people sensitive to motion.

## Options
1. **Color by section, white by default (chosen).** Each color appears only where its meaning applies; Home, Music and Culture keep the neutral white (the slide's "black + white" base). Cost: Home, Music and Culture never show a colored logo.
2. **One color everywhere (e.g. red, "HYFIN is a live station").** Simple and always colorful. Cost: the colors stop meaning anything.
3. **Color follows the player (red while the stream plays).** Ties the logo to "live." Cost: the logo would change color under the reader for a reason they may not notice; not asked for.

Glitch scope had a similar choice: every headline glitching on load (noisy, distracting), or only each page's main headline plus the lead story (chosen), with card headlines jittering only on hover.

## What we chose and why
Option 1, plus the mockup's own glitch code copied unchanged from `docs/mockups-html/screens/01-home/homepage.html` (lock-in, burst, hover jitter; locked while the stream plays). Claude's call, following the slide and the logo README; Tarik can move a section to a different color by changing one line in `lib/signal.ts`.

Safety: the Stabilize choice is remembered and applied before the page draws (no flash), and readers whose device asks for reduced motion get no animation at all. Long reading headlines (stories, NPR, event pages) glitch but get no scanlines, to keep them easy to read.

## What we gave up
- Hosts are red ("on air") rather than blue ("series"); shows are blue. Either could be argued.
- The rest of slide 6's effects (image-frame hover split, screen tear, flicker) are not built.
- The burst repeats while the page is open; readers who dislike it must find the Stabilize switch.

## How we'll know if this was right
Tarik and staff can say which section they're in from the logo color alone; nobody asks how to turn the glitch off without finding the switch; no reader complaint about motion in the first month of the beta.

## What actually happened
