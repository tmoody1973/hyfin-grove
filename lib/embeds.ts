/**
 * Which outside players a story may embed, and how to clean their URLs.
 * The allowlist is the security boundary: anything not recognized here never becomes an iframe.
 */

export type EmbedProvider =
  | "youtube" | "spotify" | "spreaker" | "npr" | "prx" | "bandcamp" | "odesli"
  | "apple-music" | "apple-podcasts" | "soundcloud" | "mixcloud"
  | "instagram" | "twitter" | "tiktok";

export type Embed = { provider: EmbedProvider; url: string; title: string | null };

const SOCIAL: ReadonlySet<EmbedProvider> = new Set(["instagram", "twitter", "tiktok"]);
export const isSocial = (p: EmbedProvider): boolean => SOCIAL.has(p);

/** Hostname → provider. Matched exactly or as a subdomain suffix, never by substring. */
const HOSTS: ReadonlyArray<[string, EmbedProvider]> = [
  ["youtube.com", "youtube"], ["youtu.be", "youtube"], ["youtube-nocookie.com", "youtube"],
  ["open.spotify.com", "spotify"],
  ["widget.spreaker.com", "spreaker"],
  ["npr.org", "npr"],
  ["play.prx.org", "prx"],
  ["bandcamp.com", "bandcamp"],
  ["odesli.co", "odesli"],
  ["embed.music.apple.com", "apple-music"],
  ["embed.podcasts.apple.com", "apple-podcasts"],
  ["w.soundcloud.com", "soundcloud"],
  ["player-widget.mixcloud.com", "mixcloud"],
  ["instagram.com", "instagram"],
  ["twitter.com", "twitter"], ["x.com", "twitter"],
  ["tiktok.com", "tiktok"],
];

const providerFor = (host: string): EmbedProvider | null =>
  HOSTS.find(([h]) => host === h || host.endsWith(`.${h}`))?.[1] ?? null;

/** Tracking and player-behaviour parameters WordPress adds; never needed to play. */
const NOISE = /^(utm_.*|enablejsapi|autoplay|cc_load_policy|cc_lang_pref|iv_load_policy|loop|rel|modestbranding|fs|playsinline|controls|si|feature)$/;

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * Only each provider's player address may be framed. A host match alone would let any NPR or Bandcamp
 * web page be squeezed into an iframe, and Spotify share pages refuse framing (blank box).
 */
const PLAYER_PATH: Partial<Record<EmbedProvider, RegExp>> = {
  spotify: /^\/embed\/(track|album|playlist|artist|episode|show)\/[A-Za-z0-9]+/,
  spreaker: /^\/player/,
  npr: /^\/(player\/embed\/|embedded-video)/,
  prx: /^\/e/,
  bandcamp: /^\/EmbeddedPlayer\//,
  odesli: /^\/embed/,
  soundcloud: /^\/player/,
  mixcloud: /^\/widget\/iframe/,
  instagram: /^\/(p|reel|tv)\/[A-Za-z0-9_-]+/,
  twitter: /^\/[A-Za-z0-9_]+\/status\/\d+/,
  tiktok: /^\/@[^/]+\/video\/\d+/,
};

/** open.spotify.com/(intl-xx/)track/ID → /embed/track/ID (Spotify's share pages can't be framed). */
function spotifyPlayerPath(path: string): string {
  const m = /^(?:\/intl-[a-z]{2})?\/(track|album|playlist|artist|episode|show)\/([A-Za-z0-9]+)/.exec(path);
  return m ? `/embed/${m[1]}/${m[2]}` : path;
}

function youtubeId(u: URL): string | null {
  const parts = u.pathname.split("/").filter(Boolean);
  const id = u.hostname.endsWith("youtu.be") ? parts[0]
    : parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live" ? parts[1]
    : u.searchParams.get("v");
  return id && YOUTUBE_ID.test(id) ? id : null;
}

export function embedFromUrl(raw: string, title: string | null = null): Embed | null {
  let u: URL;
  try {
    u = new URL(raw.trim().startsWith("//") ? `https:${raw.trim()}` : raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  u.protocol = "https:";
  const provider = providerFor(u.hostname.toLowerCase());
  if (!provider) return null;

  if (provider === "youtube") {
    const id = youtubeId(u);
    return id ? { provider, url: `https://www.youtube-nocookie.com/embed/${id}`, title } : null;
  }
  if (provider === "spotify") {
    // Old form: /embed?uri=spotify:playlist:ID
    const legacy = /^spotify:(track|album|playlist|artist|episode|show):([A-Za-z0-9]+)$/.exec(u.searchParams.get("uri") ?? "");
    u.pathname = legacy ? `/embed/${legacy[1]}/${legacy[2]}` : spotifyPlayerPath(u.pathname);
    if (legacy) u.searchParams.delete("uri");
  }
  const playerPath = PLAYER_PATH[provider];
  if (playerPath && !playerPath.test(u.pathname)) return null;
  for (const key of [...u.searchParams.keys()]) if (NOISE.test(key)) u.searchParams.delete(key);
  if (isSocial(provider)) u.search = "";
  u.hash = "";
  return { provider, url: u.toString(), title };
}

/** Proper names, for iframe titles and link text. */
export const PROVIDER_NAMES: Record<EmbedProvider, string> = {
  youtube: "YouTube", spotify: "Spotify", spreaker: "Spreaker", npr: "NPR", prx: "PRX", bandcamp: "Bandcamp",
  odesli: "Odesli", "apple-music": "Apple Music", "apple-podcasts": "Apple Podcasts", soundcloud: "SoundCloud",
  mixcloud: "Mixcloud", instagram: "Instagram", twitter: "X", tiktok: "TikTok",
};

/** Player height in px, or "16:9" for responsive video. */
export function playerHeight(e: Embed): number | "16:9" {
  switch (e.provider) {
    case "youtube": return "16:9";
    case "spotify": return /\/embed\/(track|episode)\//.test(e.url) ? 152 : 352;
    case "spreaker": return 200;
    case "npr": return e.url.includes("/embedded-video") ? "16:9" : 235;
    case "prx": return 200;
    case "bandcamp": {
      // Layout comes from the path: size=small is a thin bar; tracklist=false + small/no artwork is compact.
      if (/\/size=small\b/.test(e.url)) return 42;
      return /\/tracklist=false\b/.test(e.url) && /\/artwork=(small|none)\b/.test(e.url) ? 120 : 472;
    }
    case "odesli": return 152;
    case "apple-music":
    case "apple-podcasts": return 175;
    case "soundcloud": return 166;
    case "mixcloud": return 120;
    default: return 0; // social: rendered as a link card, not an iframe
  }
}
