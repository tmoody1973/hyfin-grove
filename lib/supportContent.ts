import type { Payload } from "payload";
import { PLANS, type Plan } from "./support";

/**
 * Everything on /support that staff edit in Admin → Support page (plan 10). Today's copy is the default and the
 * fallback for any field left empty, so the page never shows a blank.
 */
type Card = { title: string; sub: string; perks: string[] };
export type SupportContent = {
  hero: { eyebrow: string; headline: string; dek: string };
  share: Card & { buttonLabel: string };
  member: Card & { planName: string };
  hyfin100: Card & { planName: string };
  plans: Plan[];
  gear: { eyebrow: string; headline: string; body: string; imageUrl: string; imageAlt: string; facts: Array<{ label: string; value: string }>; buttonLabel: string };
  who: { eyebrow: string; headline: string; paragraphs: string[] };
  pillars: { headline: string; items: Array<{ title: string; body: string }> };
  impact: { show: boolean; headline: string; stats: Array<{ value: string; label: string; note: string | null }> };
  social: { eyebrow: string; headline: string; body: string; links: Array<{ network: string; handle: string; url: string }> };
  closing: { headline: string; body: string; buttonLabel: string; tagline: string; legalLine: string | null };
  thanks: { fulfillmentLine: string | null };
};

export const DEFAULT_SUPPORT: SupportContent = {
  hero: {
    eyebrow: "Why support HYFIN",
    headline: "Connect the culture, spread the love!",
    dek: "Black culture, powerful voices, and a community that sees itself reflected in every beat, every story, every moment. HYFIN is more than a platform. It’s a cultural home where we gather around our music and stories.",
  },
  share: {
    title: "Share the love",
    sub: "Show your support on social media",
    perks: ["Share HYFIN with friends and family", "Encourage them to become regular listeners", "Spread the word on social media", "Join our newsletter list and share with others"],
    buttonLabel: "Learn more",
  },
  member: {
    title: "Become a member",
    sub: "$10/month or $120/year",
    perks: ["Official HYFIN t-shirt design by Nehemiah R. Edwards", "Member recognition", "Support a public media movement", "Sustain authentic Black media"],
    planName: "HYFIN Member",
  },
  hyfin100: {
    title: "Join HYFIN100",
    sub: "$84/month or $1000/year",
    perks: ["Exclusive premium gear", "VIP invitations to HYFIN events", "Insider access to the platform", "Recognition as a founding supporter"],
    planName: "HYFIN100",
  },
  plans: [...PLANS],
  gear: {
    eyebrow: "Member gear / Edition 01",
    headline: "Wear the signal.",
    body: "Our new HYFIN t-shirt, designed by Milwaukee artist Nehemiah R. Edwards. It’s the official member tee.",
    imageUrl: "/support/member-tee.jpg",
    imageAlt: "The HYFIN member t-shirt, back: “Culture is currency, and we’ve been rich.” —Rapsody",
    facts: [
      { label: "Artist", value: "Nehemiah R. Edwards" },
      { label: "Comes with", value: "Membership, $10/month" },
      { label: "Sizes", value: "Small to XXL" },
    ],
    buttonLabel: "Become a member",
  },
  who: {
    eyebrow: "Who we are",
    headline: "Accountable to you, our community.",
    paragraphs: [
      "HYFIN is a community-funded platform, part of non-profit Radio Milwaukee. Because we’re community-funded, we’re not beholden to corporate interests or traditional funders.",
      "A shifting media landscape and recent federal budget cuts have created an even more urgent need for direct community investment. This is a challenge we know we can meet because we’ve got each other’s backs.",
    ],
  },
  pillars: {
    headline: "Our pillars of impact",
    items: [
      { title: "Culture", body: "Showcasing the full spectrum of Black music, art, and cultural expression, from jazz to Amapiano, gospel to Afrobeats." },
      { title: "Tech & entrepreneurship", body: "Creating opportunities for Black businesses and professionals to thrive and get recognition." },
      { title: "Youth & education", body: "Investing in the next generation through Grace Weber’s Music Lab and mentorship programs." },
      { title: "Storytelling", body: "Amplifying Black voices, narratives, and experiences in Milwaukee and beyond." },
    ],
  },
  impact: { show: false, headline: "Our impact by the numbers", stats: [] },
  social: {
    eyebrow: "CH R / Share the love",
    headline: "Spread the word on social media.",
    body: "Help us reach more people by sharing HYFIN with your network. Use these handles to tag us and amplify our mission.",
    links: [
      { network: "Instagram", handle: "@hyfin.mke", url: "https://instagram.com/hyfin.mke" },
      { network: "TikTok", handle: "@hyfin.mke", url: "https://www.tiktok.com/@hyfin.mke" },
      { network: "Facebook", handle: "hyfinmke", url: "https://facebook.com/hyfinmke" },
      { network: "LinkedIn", handle: "hyfinmke", url: "https://www.linkedin.com/company/hyfinmke/" },
    ],
  },
  closing: {
    headline: "Protect what matters.",
    body: "HYFIN exists because we support each other. However you choose to participate, you’re making HYFIN possible. You’re investing in a space where Black excellence is expected, where our narrative is ours to control, and where community comes first.",
    buttonLabel: "Choose your way in",
    tagline: "HYFIN is a media movement from Radio Milwaukee.",
    legalLine: null,
  },
  thanks: { fulfillmentLine: null },
};

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const arr = (v: unknown): Obj[] => (Array.isArray(v) ? v.map(obj) : []);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const or = (v: unknown, fallback: string) => str(v) ?? fallback;
/** A list staff filled in, or the default when they left it empty. */
function list<T>(v: unknown, read: (o: Obj) => T | null, fallback: T[]): T[] {
  const out = arr(v).map(read).filter((x): x is T => x !== null);
  return out.length ? out : fallback;
}
const textList = (v: unknown, fallback: string[]) => list(v, (o) => str(o.text), fallback);
const card = <C extends Card>(v: unknown, d: C): C => {
  const o = obj(v);
  return { ...d, title: or(o.title, d.title), sub: or(o.sub, d.sub), perks: textList(o.perks, d.perks) };
};

const GIVE = /^https:\/\/funraise\.org\/give\/Radio-Milwaukee\/[A-Za-z0-9-]+\/?$/;
const MAX_PER_TIER = 3;

/** Prices → Funraise forms. A bad form number or a link that isn't a Radio Milwaukee giving page is dropped. */
export function plansFrom(raw: unknown, c: Pick<SupportContent, "member" | "hyfin100">): Plan[] {
  return (["member", "hyfin100"] as const).flatMap((tier) => {
    const mine = arr(raw)
      .filter((o) => o.tier === tier && Number.isInteger(o.formId) && (o.formId as number) > 0 && GIVE.test(String(o.fallbackUrl ?? "")) && str(o.price) && str(o.donateLabel))
      .slice(0, MAX_PER_TIER)
      .map((o, i): Plan => ({ id: `${tier}-${i}`, tier, name: c[tier].planName, price: str(o.price)!, donateLabel: str(o.donateLabel)!, formId: o.formId as number, fallbackUrl: String(o.fallbackUrl) }));
    return mine.length ? mine : PLANS.filter((p) => p.tier === tier).map((p) => ({ ...p, name: c[tier].planName }));
  });
}

export function mergeSupport(stored: unknown): SupportContent {
  const s = obj(stored);
  const d = DEFAULT_SUPPORT;
  const hero = obj(s.hero), share = obj(s.share), gear = obj(s.gear), who = obj(s.who), pillars = obj(s.pillars);
  const impact = obj(s.impact), social = obj(s.social), closing = obj(s.closing), thanks = obj(s.thanks);
  const image = obj(gear.image);
  const member = { ...card(s.member, d.member), planName: or(obj(s.member).planName, d.member.planName) };
  const hyfin100 = { ...card(s.hyfin100, d.hyfin100), planName: or(obj(s.hyfin100).planName, d.hyfin100.planName) };
  const stats = list(impact.stats, (o) => (str(o.value) && str(o.label) ? { value: str(o.value)!, label: str(o.label)!, note: str(o.note) } : null), []);
  return {
    hero: { eyebrow: or(hero.eyebrow, d.hero.eyebrow), headline: or(hero.headline, d.hero.headline), dek: or(hero.dek, d.hero.dek) },
    share: { ...card(s.share, d.share), buttonLabel: or(share.buttonLabel, d.share.buttonLabel) },
    member,
    hyfin100,
    plans: plansFrom(s.plans, { member, hyfin100 }),
    gear: {
      eyebrow: or(gear.eyebrow, d.gear.eyebrow),
      headline: or(gear.headline, d.gear.headline),
      body: or(gear.body, d.gear.body),
      imageUrl: str(image.url) ?? d.gear.imageUrl,
      imageAlt: str(image.url) ? (str(image.alt) ?? "") : d.gear.imageAlt,
      facts: list(gear.facts, (o) => (str(o.label) && str(o.value) ? { label: str(o.label)!, value: str(o.value)! } : null), d.gear.facts),
      buttonLabel: or(gear.buttonLabel, d.gear.buttonLabel),
    },
    who: { eyebrow: or(who.eyebrow, d.who.eyebrow), headline: or(who.headline, d.who.headline), paragraphs: textList(who.paragraphs, d.who.paragraphs) },
    pillars: { headline: or(pillars.headline, d.pillars.headline), items: list(pillars.items, (o) => (str(o.title) && str(o.body) ? { title: str(o.title)!, body: str(o.body)! } : null), d.pillars.items) },
    impact: { show: impact.show === true && stats.length > 0, headline: or(impact.headline, d.impact.headline), stats },
    social: {
      eyebrow: or(social.eyebrow, d.social.eyebrow),
      headline: or(social.headline, d.social.headline),
      body: or(social.body, d.social.body),
      links: list(social.links, (o) => (str(o.network) && str(o.handle) && /^https:\/\/\S+$/.test(String(o.url ?? "")) ? { network: str(o.network)!, handle: str(o.handle)!, url: String(o.url) } : null), d.social.links),
    },
    closing: { headline: or(closing.headline, d.closing.headline), body: or(closing.body, d.closing.body), buttonLabel: or(closing.buttonLabel, d.closing.buttonLabel), tagline: or(closing.tagline, d.closing.tagline), legalLine: str(closing.legalLine) },
    thanks: { fulfillmentLine: str(thanks.fulfillmentLine) },
  };
}

/** Admin → Support page merged over today's copy. A database hiccup shows today's copy rather than an error. */
export async function getSupportContent(db: Pick<Payload, "findGlobal">): Promise<SupportContent> {
  try {
    return mergeSupport(await db.findGlobal({ slug: "support-page", depth: 1 }));
  } catch {
    return DEFAULT_SUPPORT;
  }
}
