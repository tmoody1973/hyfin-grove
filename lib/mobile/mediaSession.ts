/** What the phone's lock screen and notification shade show while HYFIN plays (plan 15, task 4: Media Session API). */
export type MediaInfo =
  | { kind: "live"; play: { title: string; artist: string; artworkUrl: string | null } | null; onAir: string | null }
  | { kind: "story"; title: string; play: null; onAir: null };

export type Metadata = { title: string; artist: string; album: string; artwork: { src: string; sizes: string; type: string }[] };

const ICON = { src: "/app/icon-512.png", sizes: "512x512", type: "image/png" };

export function mediaMetadata(info: MediaInfo): Metadata {
  if (info.kind === "story") return { title: info.title, artist: "HYFIN", album: "HYFIN stories", artwork: [ICON] };
  const album = info.onAir ? `HYFIN · ${info.onAir}` : "HYFIN";
  if (!info.play) return { title: "HYFIN", artist: "Live from Radio Milwaukee", album, artwork: [ICON] };
  // rm-playlist's covers are Apple artwork, already sized to 300 × 300 (lib/listen/rmPlaylist.ts).
  const artwork = info.play.artworkUrl ? [{ src: info.play.artworkUrl, sizes: "300x300", type: "image/jpeg" }] : [ICON];
  return { title: info.play.title, artist: info.play.artist, album, artwork };
}
