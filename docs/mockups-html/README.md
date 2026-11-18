# HYFIN.org redesign mockups

21 screens from two Claude Design exports, unpacked into plain files and grouped by
the section of the site they belong to (the mockups' own nav: Listen · Drops ·
Culture · Milwaukee · Events · Win · Support).

Open `index.html` to see every screen on one board. Each screen also opens on its own.

| Section | Screen | File | Design size |
|---|---|---|---|
| Home | Homepage (Signal direction) | `screens/01-home/homepage.html` | 1440 × 5900 |
| Home | Homepage top, with Drops | `screens/01-home/homepage-top-with-drops.html` | 1440 × 1300 |
| Listen | Playlist | `screens/02-listen/playlist.html` | 1440 × 2400 |
| Listen | Program schedule | `screens/02-listen/program-schedule.html` | 1440 × 1900 |
| Listen | DJ profile | `screens/02-listen/dj-profile.html` | 1440 × 1300 |
| Listen | Specialty show page | `screens/02-listen/specialty-show.html` | 1440 × 1250 |
| Drops | Drops page | `screens/03-drops/drops.html` | 1440 × 1560 |
| Music | Music page (stories + Listening Room) | `screens/04-music/music-page.html` | 1440 × 2700 |
| Music | The Listening Room | `screens/04-music/listening-room.html` | 1440 × 2500 |
| Music | Release page | `screens/04-music/release-page.html` | 1440 × 1300 |
| Music | Story with release cards | `screens/04-music/story-with-release-cards.html` | 1440 × 1250 |
| Stories | Article with audio player | `screens/05-stories/article-with-audio-player.html` | 1440 × 3400 |
| Events and Win | Events calendar | `screens/06-events-and-win/events-calendar.html` | 1440 × 1800 |
| Events and Win | Contest feed | `screens/06-events-and-win/contests.html` | 1440 × 1950 |
| Support | Support page, desktop (Play: price → Funraise → thank-you) | `screens/07-support/support-desktop.html` | 1440 × 3700 |
| Support | Support page, phone | `screens/07-support/support-phone.html` | 390 × 5500 |
| Support | Funraise checkout step, phone | `screens/07-support/funraise-checkout-phone.html` | 390 × 844 |
| Phone app | App home | `screens/08-phone-app/app-home.html` | 390 × 844 |
| Phone app | App, Drops tab | `screens/08-phone-app/app-drops-tab.html` | 390 × 844 |
| Staff | Music desk | `screens/09-staff/music-desk.html` | 1440 × 900 |
| Retired | Direction A homepage (not in use) | `screens/99-retired/direction-a-homepage.html` | 1440 × 5200 |

## What is where

- `screens/` holds the design markup, one file per screen.
- `assets/` holds what the screens share, stored once: the Claude Design runtime
  (`js/dc-runtime-*.js`), React 18.3.1, 38 Google font files (subsets of Anton, Archivo,
  Archivo Black, DM Mono, IBM Plex Mono, Newsreader, Space Grotesk, Space Mono) and one photo.
- `screens.json` lists every screen with its section, size and which export it came from.
- `_source/` keeps the original exports unchanged, plus the 20-slide concept PDF.

The unpacked screens were checked against the originals by rendering both in Chrome:
18 of 21 match pixel for pixel; the other 3 differ by under 0.001% (an animation frame).
