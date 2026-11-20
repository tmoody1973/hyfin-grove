import { describe, expect, it } from "vitest";
import { DEFAULT_SUPPORT, mergeSupport, plansFrom } from "@/lib/supportContent";

const GIVE = "https://funraise.org/give/Radio-Milwaukee/";

describe("mergeSupport: Admin → Support page over today's copy", () => {
  it("shows today's copy when nothing is set (or everything was cleared)", () => {
    expect(mergeSupport(null)).toEqual(DEFAULT_SUPPORT);
    expect(mergeSupport({ hero: { headline: "  ", dek: "" }, pillars: [], member: { perks: [] } })).toEqual(DEFAULT_SUPPORT);
  });
  it("overrides only what staff filled in", () => {
    const c = mergeSupport({ hero: { headline: "Fund the frequency" }, member: { perks: [{ text: "A tee" }, { text: " " }] } });
    expect(c.hero.headline).toBe("Fund the frequency");
    expect(c.hero.dek).toBe(DEFAULT_SUPPORT.hero.dek);
    expect(c.member.perks).toEqual(["A tee"]);
  });
  it("keeps the legal and shipping lines empty unless filled", () => {
    expect(DEFAULT_SUPPORT.closing.legalLine).toBeNull();
    expect(mergeSupport({ closing: { legalLine: "Radio Milwaukee is a 501(c)(3)." }, thanks: { fulfillmentLine: "Tees ship in 2 weeks." } })).toMatchObject({
      closing: { legalLine: "Radio Milwaukee is a 501(c)(3)." },
      thanks: { fulfillmentLine: "Tees ship in 2 weeks." },
    });
  });
  it("shows impact numbers only when switched on and filled in", () => {
    expect(mergeSupport({ impact: { show: true, stats: [] } }).impact.show).toBe(false);
    expect(mergeSupport({ impact: { show: false, stats: [{ value: "10K+", label: "Weekly listeners" }] } }).impact.show).toBe(false);
    const on = mergeSupport({ impact: { show: true, stats: [{ value: "10K+", label: "Weekly listeners", note: "" }] } });
    expect(on.impact).toMatchObject({ show: true, stats: [{ value: "10K+", label: "Weekly listeners", note: null }] });
  });
  it("drops social links that aren't https", () => {
    const c = mergeSupport({ social: { links: [{ network: "Instagram", handle: "@x", url: "javascript:alert(1)" }, { network: "TikTok", handle: "@y", url: "https://tiktok.com/@y" }] } });
    expect(c.social.links).toEqual([{ network: "TikTok", handle: "@y", url: "https://tiktok.com/@y" }]);
  });
});

describe("plansFrom: prices and their Funraise forms", () => {
  const plan = (o: Record<string, unknown>) => ({ tier: "member", price: "$12 / month", donateLabel: "Donate $12 monthly", formId: 45703, fallbackUrl: `${GIVE}abc`, ...o });

  it("uses staff's plans, named by their tier, with stable ids", () => {
    const plans = plansFrom([plan({})], DEFAULT_SUPPORT);
    const member = plans.filter((p) => p.tier === "member");
    expect(member).toEqual([{ id: "member-0", tier: "member", name: "HYFIN Member", price: "$12 / month", donateLabel: "Donate $12 monthly", formId: 45703, fallbackUrl: `${GIVE}abc` }]);
  });
  it("drops a plan with a bad form number or a link that isn't a Radio Milwaukee giving page", () => {
    const plans = plansFrom([plan({ formId: 0 }), plan({ formId: 1.5 }), plan({ fallbackUrl: "https://evil.example/give" }), plan({ fallbackUrl: "http://funraise.org/give/Radio-Milwaukee/x" })], DEFAULT_SUPPORT);
    expect(plans.filter((p) => p.tier === "member").map((p) => p.id)).toEqual(["member-monthly", "member-yearly"]); // defaults
  });
  it("falls back to today's plans for a tier left empty", () => {
    const plans = plansFrom([plan({})], DEFAULT_SUPPORT);
    expect(plans.filter((p) => p.tier === "hyfin100").map((p) => p.formId)).toEqual([45593, 44749]);
  });
  it("keeps at most three per tier", () => {
    expect(plansFrom([1, 2, 3, 4].map((n) => plan({ formId: 45700 + n })), DEFAULT_SUPPORT).filter((p) => p.tier === "member")).toHaveLength(3);
  });
});
