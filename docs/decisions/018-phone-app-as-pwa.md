# 018: The HYFIN phone app is the website, installable (a PWA), built with Konsta UI and Motion

**Decision.** HYFIN's phone app is the same site at the same addresses. On phones it gets an app shell, it can be installed to the home screen as a progressive web app (a PWA: a website that installs like an app, opens full-screen and works offline), and it uses two libraries:
- **Konsta UI** for app-style pieces (tab bar, bottom sheets, toasts);
- **Motion** for touch gestures (swipe cards, drag-to-dismiss, pull-to-refresh).

Screen-to-screen slides use React's built-in `<ViewTransition>`. Offline caching uses a hand-written service worker (`public/sw.js`), as in the Next.js guide.

## Why this came up
The phone mockups (`docs/mockups-html/screens/08-phone-app/`) describe an app: a bottom tab bar, a live mini-player, swipeable cards. The responsive site works on phones, but it behaves like a website:
- no home-screen icon;
- browser bars taking space;
- nothing on the lock screen while HYFIN plays;
- the browser's error page with no signal.

Most HYFIN listeners are on phones. What was at stake: either a second app to build and maintain, or a phone experience that never feels like more than a shrunken website.

## Options
1. **The website as an installable app, with Konsta + Motion (chosen).** One codebase, the same addresses, no app store.
   - **Costs:** iPhone limits on web apps. Push notifications only work once installed. There's no background refresh, and iOS may clear cached data from apps unused for weeks. Konsta's default iOS/Material look must be restyled to Signal, and it adds code to every phone page.
2. **Ionic React as the app shell.** Ionic handles more of the app mechanics in one package.
   - **Costs:** it brings its own router, built for single-page apps, which would fight Next.js's App Router over every navigation. Its own look would also have to be undone.
3. **A native app (React Native/Expo) in the App Store and Google Play.** It gives the best lock-screen, push and background behavior.
   - **Costs:** a second codebase, app-store reviews for every release, two more accounts to manage, and duplicated content screens.
4. **Responsive tweaks only.** The cheapest option.
   - **Costs:** no install, no lock screen, no offline, and nothing that feels like an app.

## What we chose and why
Tarik chose option 1, with Konsta and Motion. Claude's research shaped the details:
- **`KonstaProvider`, not Konsta's `App` wrapper,** because Next.js owns the routing.
- **Konsta only where it fits** (2026-11-20 spike): its bottom sheet is kept for the More menu, but the tab bar is plain Tailwind, because Konsta's `Tabbar` fought the Signal mockup.
- **Motion only for gestures.** Screen transitions use React's `<ViewTransition>`, which Next 16.4 supports with no configuration and which costs no extra JavaScript.
- **A hand-written service worker instead of Serwist** (a ruling made while building phase A, 2026-11-20). Serwist's Turbopack setup needs a config wrapper, a build-time compile route, a React provider, and default caching rules that would need overriding to keep the admin, API and stream out. The hand-written worker is about 130 lines, needs no new packages, and keeps its rules in `public/sw-rules.js`, which is unit-tested. The cost: we maintain it ourselves, and site code is saved as it's first used, not all at once on install. That's why the offline screen is a self-contained `public/offline.html`.

The plan starts with a spike (a small throwaway test build) that proves Konsta can wear the Signal look before anything depends on it.

## What we gave up
- **Native-app reach:** no App Store listing, and no push notifications for people who haven't installed the app.
- **On iPhone, install is manual** (Share → "Add to Home Screen"). The site can only explain how.
- **Two styling systems on phones:** Konsta's components and our own Tailwind.
- **Up to 60 KB more JavaScript** on phone pages.

## How we'll know if this was right
- **Phase A (the first PR) plus 60 days:**
  - **Installs:** at least 5% of returning phone visitors open the site from the home screen (`start_url` carries `?source=pwa`).
  - **Speed:** Lighthouse mobile performance holds at or above the baseline.
  - **Listening:** sessions from the installed app run longer than browser sessions.
- **If installs stay near zero, or Konsta costs more effort than it saves,** revisit this decision: drop Konsta for plain Tailwind, or reconsider a native app if push notifications turn out to matter.

## What actually happened
