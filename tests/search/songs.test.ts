import { describe, expect, it } from "vitest";
import { songHits } from "@/lib/search/songs";

const DAY = 86_400_000;
const now = Date.parse("2026-11-20T20:00:00Z");
const play = (artist: string, title: string, daysAgo: number) => ({ id: `${artist}-${title}-${daysAgo}`, playedAt: now - daysAgo * DAY, artist, title, album: null, artworkUrl: "https://art/x.jpg", spotifyTrackId: null, appleMusicSongId: null, previewUrl: null, liveEvent: null });

describe("songHits: songs HYFIN played, in search (plan 12)", () => {
  it("keeps the last 30 days, each song once (newest play), linking to the playlist filtered to the artist", () => {
    const hits = songHits([play("Tems", "Love Me JeJe", 1), play("Tems", "Love Me JeJe", 3), play("Tems", "Free Mind", 31), play("Tems", "Burning", 10)], now);
    expect(hits).toEqual([
      { title: "Love Me JeJe", artist: "Tems", lastPlayedAt: new Date(now - DAY).toISOString(), artworkUrl: "https://art/x.jpg", href: "/listen/playlist?q=Tems" },
      { title: "Burning", artist: "Tems", lastPlayedAt: new Date(now - 10 * DAY).toISOString(), artworkUrl: "https://art/x.jpg", href: "/listen/playlist?q=Tems" },
    ]);
  });
  it("caps the list", () => {
    expect(songHits(Array.from({ length: 20 }, (_, i) => play("A", `S${i}`, 1)), now, 6)).toHaveLength(6);
  });
});
