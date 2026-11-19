import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PlayRow } from "@/components/listen/PlayRow";
import type { Play } from "@/lib/listen/rmPlaylist";

const base: Play = {
  id: "p", playedAt: Date.parse("2026-11-19T20:37:00Z"), artist: "6LACK", title: "Umi Says", album: null,
  artworkUrl: "https://is1-ssl.mzstatic.com/image/thumb/a/100x100bb.jpg", spotifyTrackId: null, appleMusicSongId: null, liveEvent: null,
};

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
  it("names the city of an upcoming show, only when there is one", () => {
    expect(renderToStaticMarkup(PlayRow({ play: base }))).not.toContain("·");
    const html = renderToStaticMarkup(PlayRow({ play: { ...base, liveEvent: { venue: "Thalia Hall", city: "Chicago", startsAtMs: Date.parse("2026-12-05T02:00:00Z"), dateOnly: false, ticketUrl: null } } }));
    expect(html).toContain("Chicago · Dec 4");
  });
  it("prints a very long title in full", () => {
    const long = "A".repeat(300);
    expect(renderToStaticMarkup(PlayRow({ play: { ...base, title: long } }))).toContain(long);
  });
});
