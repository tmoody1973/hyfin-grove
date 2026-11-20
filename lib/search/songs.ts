import { getPlays, type Play } from "@/lib/listen/rmPlaylist";

/** A song HYFIN played recently, as a search result (plan 12; Tarik: last 30 days). */
export type SongHit = { title: string; artist: string; lastPlayedAt: string; artworkUrl: string | null; href: string };

const WINDOW_MS = 30 * 86_400_000;

/** Last 30 days only, each song once (its newest play), newest first. */
export function songHits(plays: readonly Play[], now: number, limit = 6): SongHit[] {
  const seen = new Set<string>();
  return [...plays]
    .filter((p) => now - p.playedAt <= WINDOW_MS)
    .sort((a, b) => b.playedAt - a.playedAt)
    .filter((p) => {
      const key = `${p.artist.toLowerCase()}|${p.title.toLowerCase()}`;
      return !seen.has(key) && seen.add(key);
    })
    .slice(0, limit)
    .map((p) => ({ title: p.title, artist: p.artist, lastPlayedAt: new Date(p.playedAt).toISOString(), artworkUrl: p.artworkUrl, href: `/listen/playlist?q=${encodeURIComponent(p.artist)}` }));
}

/** rm-playlist's own play search; [] when it can't answer, so search never depends on it. */
export async function searchSongs(q: string, now: number, limit = 6): Promise<SongHit[]> {
  const res = await getPlays({ q, limit: 80 });
  return res.ok ? songHits(res.value, now, limit) : [];
}
