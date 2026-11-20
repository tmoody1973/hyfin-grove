import { describe, expect, it } from "vitest";
import { PLANS, planByForm, thankYouName } from "@/lib/support";
import { supportReducer, type SupportState } from "@/lib/supportFlow";

const GIVE = "https://funraise.org/give/Radio-Milwaukee/";

describe("support plans (Funraise forms read 2026-11-20)", () => {
  it("has the four membership buttons, each on its own Funraise form", () => {
    expect(PLANS.map(({ id, formId, amount, frequency, name, price, donateLabel }) => ({ id, formId, amount, frequency, name, price, donateLabel }))).toEqual([
      { id: "member-monthly", formId: 45703, amount: 10, frequency: "m", name: "HYFIN Member", price: "$10 / month", donateLabel: "Donate $10 monthly" },
      { id: "member-yearly", formId: 45701, amount: 120, frequency: "o", name: "HYFIN Member", price: "$120 / year", donateLabel: "Donate $120" },
      { id: "hyfin100-monthly", formId: 45593, amount: 84, frequency: "m", name: "HYFIN100", price: "$84 / month", donateLabel: "Donate $84 monthly" },
      { id: "hyfin100-yearly", formId: 44749, amount: 1000, frequency: "o", name: "HYFIN100", price: "$1000 / year", donateLabel: "Donate $1000" },
    ]);
  });

  it("falls back to each plan's hosted Funraise page when the script can't load", () => {
    expect(Object.fromEntries(PLANS.map((p) => [p.id, p.fallbackUrl]))).toEqual({
      "member-monthly": `${GIVE}3a1305e9-96b1-4b29-97f9-c86e40d3df2b`,
      "member-yearly": `${GIVE}eb73b669-e850-495b-b0e5-620eb77bcaee`,
      "hyfin100-monthly": `${GIVE}2e7a1385-09d6-4d13-82bc-97e840ace247`,
      "hyfin100-yearly": `${GIVE}f81ff6bd-16dd-4f12-88d0-ce28a2cb588d`,
    });
  });

  it("finds a plan by its Funraise form", () => {
    expect(planByForm(45593)?.id).toBe("hyfin100-monthly");
    expect(planByForm(1)).toBeUndefined();
  });
});

describe("thankYouName: the donor's first name from Funraise's onSuccess data", () => {
  it("reads donor.firstName, then firstName, trimmed", () => {
    expect(thankYouName({ donor: { firstName: "Ada" } })).toBe("Ada");
    expect(thankYouName({ firstName: " Ada " })).toBe("Ada");
  });
  it("is null for anything else, never 'undefined'", () => {
    for (const d of [{ donor: { firstName: "" } }, {}, null, "x", { donor: "Ada" }, { firstName: 7 }]) expect(thankYouName(d)).toBeNull();
  });
  it("returns markup as plain text (React renders it as text)", () => {
    expect(thankYouName({ firstName: "<b>x</b>" })).toBe("<b>x</b>");
  });
});

describe("supportReducer: choose, then checkout, then thanks", () => {
  const choose: SupportState = { step: "choose" };
  it("picks a plan, switches plans, and goes back", () => {
    const c = supportReducer(choose, { type: "pick", plan: "member-monthly" });
    expect(c).toEqual({ step: "checkout", plan: "member-monthly" });
    expect(supportReducer(c, { type: "pick", plan: "hyfin100-yearly" })).toEqual({ step: "checkout", plan: "hyfin100-yearly" });
    expect(supportReducer(c, { type: "back" })).toEqual(choose);
  });
  it("thanks the donor after a gift, from checkout or from a reopened popup", () => {
    const thanks = { step: "thanks", plan: "member-monthly", name: "Ada" } as const;
    expect(supportReducer({ step: "checkout", plan: "member-monthly" }, { type: "succeeded", plan: "member-monthly", name: "Ada" })).toEqual(thanks);
    expect(supportReducer(choose, { type: "succeeded", plan: "member-monthly", name: "Ada" })).toEqual(thanks);
    expect(supportReducer(thanks, { type: "back" })).toEqual(choose);
  });
});
