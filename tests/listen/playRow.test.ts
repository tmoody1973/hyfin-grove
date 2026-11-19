import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PlayRow } from "@/components/listen/PlayRow";
import type { LiveEvent, Play } from "@/lib/listen/rmPlaylist";

const base: Play = {
  id: "p", playedAt: Date.parse("2026-11-19T20:37:00Z"), artist: "6LACK", title: "Umi Says", album: null,
  artworkUrl: "https://is1-ssl.mzstatic.com/image/thumb/a/100x100bb.jpg", spotifyTrackId: null, appleMusicSongId: null, previewUrl: null, liveEvent: null,
};

const event = (over: Partial<LiveEvent> = {}): LiveEvent => ({
  eventId: "e1", title: "Jorja Smith - Ages 18+", venue: "Riviera Theatre", city: "Chicago", startsAtMs: Date.parse("2026-11-24T02:00:00Z"),
  dateOnly: false, ticketUrl: null, imageUrl: null, ...over,
});

describe("PlayRow", () => {
  it("shows the album art with a descriptive alt", () => {
    const html = renderToStaticMarkup(PlayRow({ play: base }));
    expect(html).toContain('alt="Album art: Umi Says by 6LACK"');
    expect(html).toContain("2:37 pm");
  });
  it("keeps a same-size placeholder when there is no artwork", () => {
    const html = renderToStaticMarkup(PlayRow({ play: { ...base, artworkUrl: null } }));
    expect(html).not.toContain("<img");
    expect(html).toContain('data-artwork-placeholder="true"');
  });
  it("shows an upcoming concert as its own row: LIVE, title, venue, city, date", () => {
    expect(renderToStaticMarkup(PlayRow({ play: base }))).not.toContain("LIVE");
    const html = renderToStaticMarkup(PlayRow({ play: { ...base, liveEvent: event({ title: "Jorja Smith - Ages 18+" }) } })).replace(/<!-- -->/g, "");
    expect(html).toContain("LIVE");
    expect(html).toContain("Jorja Smith - Ages 18+");
    expect(html).toContain("Riviera Theatre, Chicago · Nov 23");
  });
  it("falls back to the artist name when the concert has no title", () => {
    expect(renderToStaticMarkup(PlayRow({ play: { ...base, liveEvent: event({ title: null }) } }))).toContain("6LACK live");
  });
  it("Tickets opens the ticket page in a new tab", () => {
    const html = renderToStaticMarkup(PlayRow({ play: { ...base, liveEvent: event({ ticketUrl: "https://www.ticketmaster.com/e/1" }) } }));
    expect(html).toMatch(/<a[^>]+href="https:\/\/www.ticketmaster.com\/e\/1"[^>]+target="_blank"[^>]+rel="noopener noreferrer"[^>]*>Tickets<\/a>/);
  });
  it("only http(s) ticket links become buttons", () => {
    expect(renderToStaticMarkup(PlayRow({ play: { ...base, liveEvent: event({ ticketUrl: "javascript:alert(1)" }) } }))).not.toContain("Tickets");
  });
  it("prints a very long title in full", () => {
    const long = "A".repeat(300);
    expect(renderToStaticMarkup(PlayRow({ play: { ...base, title: long } }))).toContain(long);
  });
  it("a date-only concert shows its own date, not the day before", () => {
    const html = renderToStaticMarkup(PlayRow({ play: { ...base, liveEvent: event({ venue: "The Rave", city: "Milwaukee", startsAtMs: Date.parse("2026-12-04T00:00:00Z"), dateOnly: true }) } })).replace(/<!-- -->/g, "");
    expect(html).toContain("The Rave, Milwaukee · Dec 4");
  });
  it("a concert with no ticket link is plain text, not a link to a missing page", () => {
    const html = renderToStaticMarkup(PlayRow({ play: { ...base, liveEvent: event({ ticketUrl: null }) } }));
    expect(html).not.toContain("/events");
    expect(html).not.toContain("<a");
  });
  it("offers a 30-second preview when Apple Music has the song", () => {
    expect(renderToStaticMarkup(PlayRow({ play: base }))).not.toContain("preview");
    const html = renderToStaticMarkup(PlayRow({ play: { ...base, appleMusicSongId: "123", previewUrl: "https://audio/p.m4a" } }));
    expect(html).toContain('aria-label="Play a 30-second preview of Umi Says by 6LACK"');
  });
});
