/** Ad spots set in Admin → Ads (issue #22): which one a page shows right now. Pure, so the rules are tested. */
export type Placement = "playlist-banner" | "playlist-sidebar";
export type Size = [number, number];
/** `mobile: null` = desktop only (e.g. a 160x600 skyscraper, too tall for phones). */
export type ActiveSlot = { path: string; desktop: Size; mobile: Size | null; label: string | null };

type Spot = { enabled?: boolean | null; placement?: string | null; adUnit?: string | null; desktopSize?: string | null; mobileSize?: string | null; label?: string | null; startsAt?: string | null; endsAt?: string | null };
type AdsSettings = { enabled?: boolean | null; networkCode?: string | null; slots?: Spot[] | null } | null | undefined;

/** "728x90" → [728, 90]; anything else → null. */
export function parseSize(raw: unknown): Size | null {
  const m = typeof raw === "string" ? /^\s*(\d{1,4})\s*[xX]\s*(\d{1,4})\s*$/.exec(raw) : null;
  if (!m) return null;
  const [w, h] = [Number(m[1]), Number(m[2])];
  return w > 0 && h > 0 && w <= 2000 && h <= 2000 ? [w, h] : null;
}

const live = (s: Spot, now: number) => (!s.startsAt || Date.parse(s.startsAt) <= now) && (!s.endsAt || Date.parse(s.endsAt) > now);

export function activeSlot(ads: AdsSettings, placement: Placement | string, now: number): ActiveSlot | null {
  const network = ads?.networkCode?.trim();
  if (!ads?.enabled || !network) return null;
  for (const s of ads.slots ?? []) {
    if (!s.enabled || s.placement !== placement || !live(s, now)) continue;
    const unit = s.adUnit?.trim().replace(/^\/?\d+\//, "") ?? ""; // a full "/118058336/Unit" path works too
    const desktop = parseSize(s.desktopSize);
    const noPhone = !s.mobileSize?.trim();
    const mobile = noPhone ? null : parseSize(s.mobileSize);
    if (!unit || !desktop || (!noPhone && !mobile)) return null;
    return { path: `/${network}/${unit}`, desktop, mobile, label: s.label?.trim() || null };
  }
  return null;
}
