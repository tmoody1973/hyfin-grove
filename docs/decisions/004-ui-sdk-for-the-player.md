# 004 — Build the persistent player with UI SDK controls

**Decision.** The site's player (one bar that keeps playing the HYFIN live stream or a story while people move between pages) is our own component. Its controls come from UI SDK, Vercel Labs' new library of accessible behaviors (keyboard, focus, screen-reader labels), and playback is the browser's own audio element.

**Why this came up.** Tarik wanted the player built with UI SDK to match the mockup. On checking, UI SDK has no audio or player components at all: it supplies behaviors such as Button and Slider, unstyled. It is also brand new (released 2026-11-12) and in beta. So "use UI SDK" really meant: build the player, and use UI SDK for the parts it covers.

**Options.**
1. *An off-the-shelf React audio player library.* Fast to drop in. Cost: its look fights the mockup's custom bar, and its accessibility varies.
2. *Plain HTML controls, hand-built.* No new dependency. Cost: a slider that works well by keyboard and screen reader is real work to get right.
3. *Own player, UI SDK for the controls.* The mockup's look, with keyboard and screen-reader behavior handled by a library built for it. Cost: a beta dependency.

**What we chose and why.** Option 3, Tarik's direction with Claude's design. The scrubber and volume use UI SDK's Slider (arrow keys, names "Seek" and "Volume"), the play buttons use its Button, and one `<audio>` element in the site layout does the playing. Versions are pinned exactly (`0.1.0-beta.10`) so a beta release can't change behavior underneath us.

**What we gave up.** Beta APIs may change, so upgrades need a check. UI SDK adds no audio know-how: buffering, stream reconnects and lock-screen controls are ours to build later.

**How we'll know if this was right.**
- Audio keeps playing across page changes (checked in Chrome 2026-11-18: the clock kept advancing after navigation, one audio element).
- Keyboard-only users can play, seek and change volume.
- Upgrading UI SDK out of beta takes under an hour.

**What actually happened.**
