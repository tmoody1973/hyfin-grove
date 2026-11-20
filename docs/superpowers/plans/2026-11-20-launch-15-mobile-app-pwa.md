# Launch plan 15: The phone experience: an installable HYFIN app (PWA) with native-feeling UX

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. TDD per task. Steps use checkbox (`- [ ]`) syntax. Ships in three PRs (Phase A, B, C), each usable on its own.

**Goal:** On a phone, hyfin.org feels like an app, not a shrunken website.
- People can install it to their home screen, and it opens full-screen with no browser bars.
- A bottom tab bar replaces the header links. The live player sits above the tab bar and never stops while you move around.
- The lock screen shows what's playing, with a play/pause button.
- Stories swipe like cards. Screens slide in and out like an app's. Pulling down refreshes the feed.
- With no connection, it shows a proper offline screen instead of the browser's error.

Desktop stays exactly as it is.

**Design source of truth:** `docs/mockups-html/screens/08-phone-app/`. These are the two 390 × 844 phone screens (app home, Drops tab) from the Claude Design export recorded as the Figma design reference (`figma.com/design/ivuHFQdgrfMAxldRrsq3nP`).
- **The Signal look on a phone:** sharp corners, black with white rules, mono labels.
- **Top bar:** "HYFIN /mke" with a square search button.
- **Live mini-player above the tab bar:** a red play button, "ON AIR NOW", the song, artist and DJ, and a green pin button.
- **Bottom tab bar:** Home · Listen · Stories · Milwaukee · More, with line icons. The active tab gets a white line along its top edge.
- **Latest:** "Swipe · 5 stories" cards.
- **Drops:** a story-style 5-segment progress bar with a swipeable song card (Drops ships in its own plan; see Out of scope).

⚠ Only these two phone frames were exported. If the Figma file has more mobile frames (story page, Listen, More menu), they override this plan's guesses.

**Architecture (decision 018):**
- **Same site, same addresses.** The phone shell is a layer that shows below the `lg` breakpoint. It's not a separate app or a separate `m.` site, so search engines, links and Payload are unaffected.
- **Konsta UI for the app-style pieces:** the tab bar, the bottom sheet for "More", toasts, and segmented filters. It's wrapped in `KonstaProvider`, not Konsta's `App`: Konsta recommends that when another framework (here Next.js) owns the routing. Every Konsta component is restyled to Signal; the stock iOS/Material look never ships. Konsta's React components use hooks, so each is wrapped in our own `"use client"` component.
- **Motion for gestures only:** swipe cards, drag-to-dismiss sheets, pull-to-refresh, tap feedback. Imported through `LazyMotion` + `m` to keep the download small.
- **React's `<ViewTransition>` for screen changes:** it ships with React 19.3, and Next 16.4 supports it with no configuration (`node_modules/next/dist/docs/01-app/02-guides/view-transitions.md`). `<Link transitionTypes={['nav-forward']}>` slides forward and `nav-back` slides back. The browser animates it, so this costs no extra JavaScript.
- **PWA plumbing:**
  - `app/manifest.ts`, the file that makes the site installable;
  - a service worker built with **Serwist**, a background script that caches pages and files for speed and offline use. It's the option the bundled Next.js guide names for offline caching, and it has a Turbopack example;
  - the security headers for `/sw.js` from that same guide (`node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md`).
- **Lock screen:** the Media Session API, the browser feature that puts title, artist, artwork and play/pause on the lock screen and in Android's notification shade. It's fed by the existing `PlayerProvider`, which already lives in the root layout, so audio keeps playing across navigation.

**Tech stack:** Next.js 16.4 (App Router), React 19.3, Tailwind 4, `konsta` 5.x, `motion` 14.x (React 18/19 peer), `@serwist/next` 9.x, Playwright for device tests.

**Spec:** Tarik, 2026-11-20: "a unique mobile UX experience and PWA using the Figma mobile design as a guide… I do like Konsta and Motion." Launch spec (`docs/superpowers/specs/2026-11-18-hyfin-site-launch-design.md`), which lists "the phone app" as designed and waiting.

## Global Constraints
- **Desktop doesn't change.** Screenshots at 1440 px before and after each phase must match. Every phone-only piece is hidden at `lg` and up.
- **The audio never stops** on a tab switch, a screen transition, opening the More sheet, or a service-worker update.
- **The service worker never caches:**
  - `/admin`, `/api/*`, or any POST (server actions: forms, newsletter, staff tools);
  - the audio stream, Funraise, Mailchimp, or Cloudflare.

  Pages are network-first, so news is never stale when there's a connection. There's a kill switch: a self-unregistering `/sw.js` can be deployed if a release goes wrong.
- **Every gesture has a button.** Swiping is never the only way to do something. Gestures use `touch-action: pan-y` (horizontal drags only), so vertical scrolling is never trapped.
- **Reduced motion and Stabilize turn motion off.** `prefers-reduced-motion` and the site's Stabilize switch (`[data-stable]`) both disable transitions, card physics and tap scaling. The content stays the same.
- **Native touches done properly:**
  - touch targets of at least 44 × 44 px;
  - safe-area padding (`env(safe-area-inset-*)`) for the notch and the home indicator;
  - `viewport-fit=cover`;
  - no grey tap flash; our own pressed states instead;
  - `overscroll-behavior` set so the page doesn't rubber-band behind the tab bar.
- **Accessibility:**
  - the tab bar is a `nav` with `aria-current` on the active tab;
  - the More sheet traps focus, closes on Escape and returns focus to its button;
  - every icon has a text label (the mockup shows them).
- **Download budget:** at most **60 KB** (compressed) of added JavaScript on phone screens for Konsta + Motion + the shell, measured with the build's route sizes. Lighthouse mobile performance must not drop below today's baseline (record it in Task 0).
- **Konsta's stylesheet stays on the public site.** `konsta/react/theme.css` is imported only in `app/(frontend)/globals.css`, never anywhere the Payload admin loads, and it must not change existing Tailwind output on desktop.

## Review Focus
1. **Audio keeps playing** through: Home → Listen → a story → More sheet → back, and through a service-worker update in the middle of a song.
2. **The service worker can't brick the site.** Deploy, then deploy a broken change: visitors recover on the next load. The kill switch unregisters cleanly. `/admin` is never served from cache.
3. **Offline:** in airplane mode a visited story still opens. An unvisited one shows the offline screen, not the browser's dinosaur. The player says "You're offline" instead of spinning.
4. **The swipe deck on a real iPhone:** a vertical scroll that starts on a card still scrolls the page, and a half swipe snaps back.
5. **iOS installed mode has no back button.** Inner screens show our own back button, and the edge-swipe back gesture still works where iOS supports it.
6. **Desktop at 1440 px is unchanged.** Pixel-compare the homepage, a story, the playlist and `/support`.

## Open questions for Tarik (answer before Phase B)
1. **Tabs:** the two mockups disagree on the third tab: **Stories** on app home, **Drops** on the Drops screen. Recommendation: ship **Stories** now and swap in **Drops** when Drops exists.
2. **The green pin button** on the mini-player: what does it do? My guess: "this artist plays Milwaukee soon", jumping to their next show (the playlist's "shows nearby" feature). Without an answer, Phase B leaves it out.
3. **The home-screen name and icon:** "HYFIN", with the Signal red badge already used for the favicon?
4. **Push notifications** ("your show is starting", a new Drop): a later phase, yes or no? They work on iPhone only once the app is installed (iOS 16.4+), need permission and a place to store subscriptions, and are out of scope here.

---

## Phase A: installable and offline (PR 1)

### Task 0: Decision, baseline, and the Konsta spike (gate)
**Files:** `docs/decisions/018-phone-app-as-pwa.md` (drafted with this plan), `spikes/konsta-signal/`, which is deleted after the spike.
- [ ] Record the baseline:
  - Lighthouse mobile scores (performance, accessibility, best practices) for `/`, a story, and `/listen/playlist`;
  - JavaScript size per route from `pnpm build`;
  - desktop screenshots at 1440 px of the homepage, a story, the playlist and `/support`.
- [ ] **Spike:** install `konsta` and `motion`, add `@import 'konsta/react/theme.css'`, wrap one test page in `KonstaProvider`, and restyle `Tabbar`/`TabbarLink` and `Sheet` to match the mockup (black, white top rule, mono labels, square corners, the active tab's top line). Screenshot it next to `app-home.html` at 390 px.
- [ ] **Gate:** if Konsta needs more than light overrides to look like Signal (its corners, shadows or colors fight us), rule it out for that component and build it in plain Tailwind + Motion instead, recorded as a ruling. Check that the desktop screenshots and the Payload admin are unchanged with the theme imported.

### Task 1: The manifest and app icons
**Files:**
- `app/manifest.ts`;
- `app/(frontend)/layout.tsx`: `viewport` with `themeColor: "#000000"` and `viewportFit: "cover"`; `appleWebApp` with `capable: true`, `title: "HYFIN"` and `statusBarStyle: "black-translucent"`;
- icons from the Signal badge in `public/app/`: 192, 512, and a maskable 512.
- [ ] **Failing test** (`tests/manifest.test.ts`): `display: "standalone"`; `start_url: "/?source=pwa"`; `scope: "/"`; black background and theme; 192, 512 and maskable icons; and shortcuts: **Listen live** (`/listen`), **Playlist** (`/listen/playlist`), **Events** (`/events`).
- [ ] **Implement and check:** Chrome DevTools → Application → Manifest shows no errors, and an Android device offers "Install app".

### Task 2: Service worker, offline screen, and update toast
**Files:**
- `app/sw.ts` (Serwist);
- `next.config.ts` (`withSerwist`, the Turbopack setup from Serwist's `next-turbo-basic` example);
- `lib/pwa/cacheRules.ts`: the rules as plain data, so they can be tested;
- `app/(frontend)/offline/page.tsx`;
- `components/pwa/UpdateToast.tsx`;
- `/sw.js` headers in `next.config.ts`, per the Next guide.
- [ ] **Failing tests** (`tests/pwa-cache-rules.test.ts`). These are never cached:
  - `/admin/*`, `/api/*` and any POST;
  - the stream host, `funraise.org`, `*.api.mailchimp.com` and `challenges.cloudflare.com`.

  These are cached:
  - pages: network-first, with a 3-second timeout, falling back to the cache and then `/offline`;
  - `/_next/static/*` and fonts: cache-first;
  - images: stale-while-revalidate, at most 200 entries and 30 days.
- [ ] **Updates:** a new version waits, and a toast offers "New version. Tap to refresh." It never reloads in the middle of a song.
- [ ] **Kill switch:** document it in the README. Replace `app/sw.ts` with a worker that unregisters itself and clears the caches, then deploy.
- [ ] **Offline screen:** Signal style, "You're offline", a list of recently read stories still in the cache, and a retry button.
- [ ] **Check:** airplane mode on a phone, and Playwright's `context.setOffline(true)`.

**Rulings made while building phase A (2026-11-20):**
- **The service worker is hand-written** (`public/sw.js` plus `public/sw-rules.js`), not Serwist. Decision 018 explains why.
- **The offline screen is `public/offline.html`, not a Next page.** A Next page loads code files while it starts up. If those were never saved, starting the page fails offline (seen in testing: "This page couldn't load"). Unsaved pages redirect to `/offline.html?from=<page>`.
- **The Konsta spike moves to the start of phase B.** Phase A doesn't use Konsta.
- **`statusBarStyle: "black"` (not translucent), and no `viewport-fit=cover` yet.** Both need phase B's safe-area padding first.

**Ship Phase A** as its own PR. It's useful on its own: the site becomes installable, faster on repeat visits, and graceful offline.

## Phase B: the app shell (PR 2)

### Task 3: The bottom tab bar, the top bar, and the More sheet
**Files:**
- `components/mobile/AppShell.tsx` (client), `TabBar.tsx` (Konsta `Tabbar`), `TopBar.tsx`, `MoreSheet.tsx` (Konsta `Sheet` plus Motion drag-to-dismiss);
- `lib/mobile/tabs.ts`;
- `app/(frontend)/layout.tsx`: the shell below `lg`; the existing header and footer from `lg` up.
- [ ] **Failing tests** (`tests/mobile-tabs.test.ts`): `activeTab(pathname)`. `/` is Home. `/listen/*`, `/shows/*` and `/hosts/*` are Listen. `/stories`, `/music/*` and `/culture/*` are Stories. `/milwaukee/*` and `/events/*` are Milwaukee. Everything else is More. Unknown and sneaky paths fall back to More (the same Map-based guard as `lib/signal.ts`).
- [ ] **Tabs:** Home `/`, Listen `/listen/playlist`, Stories `/stories`, Milwaukee `/milwaukee`, More (opens the sheet).
- [ ] **More sheet:** Music, Culture, Events, Shows, Schedule, Support, Newsletter, Stabilize, plus "Add an event · staff only". It closes with a downward drag, a tap outside, or Escape.
- [ ] **Top bar:** "HYFIN /<section>", with the search button only once plan 12 (site search) exists. Installed mode adds a back button on inner screens.
- [ ] **Safe areas:** the tab bar pads `env(safe-area-inset-bottom)`, and the page gets bottom padding so nothing hides behind the shell.

### Task 4: The mini-player moves down, and the lock screen
**Files:** `components/player/PlayerBar.tsx` (phone position above the tab bar, as in the mockup), `components/player/useMediaSession.ts`.
- [ ] **Failing tests** (`tests/media-session.test.ts`, with a fake `navigator.mediaSession`): metadata (title, artist, album = "HYFIN · <DJ>", artwork from the now-playing cover, else the HYFIN icon) updates on each new track. Play, pause and stop handlers drive the player. Nothing breaks where Media Session doesn't exist.
- [ ] **Real device:** an iPhone with the app installed, the screen locked, shows the song and a working pause button. On Android, the same appears in the notification shade.

### Task 5: The Stories tab's page
**Files:** `app/(frontend)/stories/page.tsx`, a new index (today only `/stories/[id]` exists).
- [ ] The latest stories across Music, Culture and Milwaukee, with a Konsta `Segmented` filter (All · Music · Culture), restyled to Signal. On desktop it's a plain list page; it's useful there too, and harmless.

**Ship Phase B.**

## Phase C: the native feel (PR 3)

### Task 6: The swipe deck (Motion)
**Files:** `components/mobile/SwipeDeck.tsx`, `lib/mobile/swipe.ts` (the threshold rules as pure functions).
- [ ] **Failing tests:**
  - past 100 px or 500 px/s, the card moves to the next one;
  - a short drag snaps back;
  - with reduced motion or Stabilize, the card moves instantly with no physics;
  - the Previous/Next buttons and the arrow keys do the same as a swipe.
- [ ] **Use it on the homepage's "Latest"** on phones: "Swipe · 5 stories" with a 5-segment progress bar, as in the Drops mockup's bar. Tapping a card opens the story.
- [ ] **Gesture rules:** `drag="x"`, `touch-action: pan-y`, `dragElastic`; a light `navigator.vibrate(10)` when a swipe commits (Android only; iPhone has no web vibration).

### Task 7: Screen transitions, pull-to-refresh, tap feedback, and sharing
- [ ] **Transitions:** `<ViewTransition>` around the phone shell's content, plus `transitionTypes` on links: `nav-forward` into a story, `nav-back` from the back button, a crossfade between tabs. CSS in `globals.css`, all off under reduced motion and Stabilize.
- [ ] **Pull-to-refresh:** on Home, Listen and Stories, installed mode only, because iOS has no pull-to-refresh in an installed web app and people get stuck on stale news. It uses a Motion drag on the scroll top, then `router.refresh()`.
- [ ] **Tap feedback:** a pressed state on cards and buttons (`whileTap` scale 0.98 via `m`, or Konsta's highlight, whichever the spike chose).
- [ ] **Sharing:** a Share button on stories and events uses the phone's own share sheet (`navigator.share`), falling back to "Copy link" plus a toast.

### Task 8: The install invitation
**Files:** `components/pwa/InstallInvite.tsx`, `lib/pwa/installInvite.ts` (when to show it, as pure functions).
- [ ] **Failing tests:**
  - never on a first visit;
  - shown on the second visit or after 60 seconds of listening;
  - never once installed (`display-mode: standalone`);
  - a dismissal is remembered for 30 days.
- [ ] **Android:** a button that triggers the browser's install prompt (`beforeinstallprompt`).
- [ ] **iPhone:** a sheet with the two steps (Share → "Add to Home Screen"), with a picture of the Share icon.
- [ ] **No pop-up over content.** It's a slim card in the shell, above the tab bar.

### Task 9: Device tests, real-phone check, and shipping
**Files:** `e2e/mobile.spec.ts` (Playwright, iPhone 13 and Pixel 7 profiles), committed and run in CI.
- [ ] **Tests:**
  - the tab bar changes screens and `aria-current` follows;
  - the player keeps playing across tabs (the audio element's `paused` stays false);
  - the More sheet opens and closes by button and Escape;
  - the swipe deck's buttons work;
  - offline shows `/offline`;
  - the manifest is served;
  - at 1440 px no phone shell is visible.
- [ ] **Lighthouse mobile** stays at or above the Task 0 baseline. The JavaScript added stays at or under 60 KB.
- [ ] **Tarik's real-device checklist:**
  - install on an iPhone and an Android phone;
  - lock-screen controls;
  - airplane mode;
  - a swipe while scrolling;
  - rotating the phone.
- [ ] Final review and PR. Update the README ("Phone app" section).

## Out of scope (their own issues and plans)
- **Drops**, the Drops tab: a new content type, a curator workflow, 30-second previews, "Pass it on / Hear later / Full track", and "Your shelf". Its swipe card reuses Task 6's `SwipeDeck`.
- **Push notifications:** VAPID keys, storing subscriptions, consent wording.
- **The mockup's "From the feed" Instagram strip, and "Win" (contests).**
- **Native app-store apps.** This plan is the bet that a PWA is enough. Decision 018 says how we'll know.
