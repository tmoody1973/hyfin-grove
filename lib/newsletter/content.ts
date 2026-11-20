/**
 * /newsletter's pitch (plan 14). Admin → Newsletter page overrides any of it; an empty field keeps this copy.
 * What the list sends comes from the last 8 HYFIN List campaigns (Mar–Jun 2026): first access, perks, giveaways.
 * "We never sell your address" matches radiomilwaukee.org/privacy-policy ("We will not sell or share personal
 * information…", read 2026-11-20).
 */
export type Channel = "red" | "green" | "blue" | "white";
export type Reason = { channel: Channel; title: string; body: string };
export type NewsletterContent = {
  eyebrow: string;
  headline: string;
  dek: string;
  reasons: Reason[];
  trust: string;
  privacyUrl: string;
  latestIssueUrl: string | null;
};

export const DEFAULT_NEWSLETTER: NewsletterContent = {
  eyebrow: "The HYFIN Fam newsletter",
  headline: "Join the HYFIN Fam",
  dek: "New music, interviews and what's happening in Milwaukee, in your inbox. The list hears it first.",
  reasons: [
    { channel: "red", title: "On air", body: "What HYFIN is playing right now, and the artists we can't stop spinning." },
    { channel: "green", title: "First access", body: "HYFIN's own events before anyone else. Anti-Gala VIP tickets went to the list first. Plus concerts by artists we play." },
    { channel: "white", title: "Perks and giveaways", body: "Member and HYFIN 100 perks, and Enter to Win packages." },
    { channel: "blue", title: "Series and originals", body: "New Music Mondays, Ladies First, Rhythm Lab, and HYFIN's interviews and stories." },
  ],
  trust: "One email to confirm. Unsubscribe anytime. We never sell your address.",
  privacyUrl: "https://radiomilwaukee.org/privacy-policy/",
  latestIssueUrl: null,
};

const CHANNELS = new Set<Channel>(["red", "green", "blue", "white"]);
const text = (v: unknown, fallback: string) => (typeof v === "string" && v.trim() ? v.trim() : fallback);
export const httpsOrNull = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  try {
    return s && new URL(s).protocol === "https:" ? s : null;
  } catch {
    return null;
  }
};

export function mergeNewsletter(stored: unknown): NewsletterContent {
  const s = (stored && typeof stored === "object" ? stored : {}) as Record<string, unknown>;
  const D = DEFAULT_NEWSLETTER;
  const reasons = (Array.isArray(s.reasons) ? s.reasons : [])
    .map((r: Record<string, unknown>) => ({ channel: (CHANNELS.has(r?.channel as Channel) ? r.channel : "white") as Channel, title: text(r?.title, ""), body: text(r?.body, "") }))
    .filter((r) => r.title && r.body);
  return {
    eyebrow: text(s.eyebrow, D.eyebrow),
    headline: text(s.headline, D.headline),
    dek: text(s.dek, D.dek),
    reasons: reasons.length ? reasons : D.reasons,
    trust: text(s.trust, D.trust),
    privacyUrl: httpsOrNull(s.privacyUrl) ?? D.privacyUrl,
    latestIssueUrl: httpsOrNull(s.latestIssueUrl),
  };
}
