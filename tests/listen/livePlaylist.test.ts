import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/listen/useLiveQuery", () => ({ useLiveQuery: (_n: string, _a: unknown, initial: unknown) => initial }));
const { LivePlaylist, PAGE_SIZE } = await import("@/components/listen/LivePlaylist");

const plays = (n: number) => Array.from({ length: n }, (_, i) => ({
  id: `p${i}`, playedAt: 1_000_000 + (n - i) * 180_000, artist: "A", title: `Song ${i}`, album: null, artworkUrl: null, spotifyTrackId: null, appleMusicSongId: null, liveEvent: null,
}));
const render = (n: number) => renderToStaticMarkup(createElement(LivePlaylist, { initial: plays(n), airings: [], live: false, nearbyOnly: false, grouped: true, fromMs: 0 }));

describe("LivePlaylist paging", () => {
  it("shows the newest songs first, with a button for earlier ones", () => {
    const html = render(100);
    expect((html.match(/<li/g) ?? []).length).toBe(PAGE_SIZE);
    expect(html).toContain("Show earlier songs");
    expect(html).toContain("Song 0"); // newest
    expect(html).not.toContain("Song 99"); // oldest waits behind the button
  });
  it("no button when everything fits", () => {
    expect(render(PAGE_SIZE - 1)).not.toContain("Show earlier songs");
  });
});
