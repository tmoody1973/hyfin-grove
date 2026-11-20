/**
 * The support page's memberships (plan 8; design docs/mockups-html/screens/07-support). Each button opens one of
 * Radio Milwaukee's existing Funraise forms, read from their public config.json on 2026-11-20: each form allows
 * exactly one frequency, so the "/year" plans are single payments. No payment data ever passes through this site.
 */
export const FUNRAISE_ORG_ID = "0c40b367-f236-406e-963e-8a96f854e390";

const GIVE = "https://funraise.org/give/Radio-Milwaukee/";

/** Default plans have named ids ("member-monthly"); plans from Admin → Support page are "<tier>-<index>". */
export type PlanId = string;

export type Plan = {
  id: PlanId;
  tier: "member" | "hyfin100";
  name: string;
  price: string;
  formId: number;
  /** The Funraise form decides the real amount and frequency; these document the defaults. */
  amount?: number;
  frequency?: "m" | "o";
  /** The plan's hosted Funraise page: where the button goes if Funraise's script never loads. */
  fallbackUrl: string;
  donateLabel: string;
};

export const PLANS: readonly Plan[] = [
  { id: "member-monthly", tier: "member", name: "HYFIN Member", price: "$10 / month", formId: 45703, amount: 10, frequency: "m", fallbackUrl: `${GIVE}3a1305e9-96b1-4b29-97f9-c86e40d3df2b`, donateLabel: "Donate $10 monthly" },
  { id: "member-yearly", tier: "member", name: "HYFIN Member", price: "$120 / year", formId: 45701, amount: 120, frequency: "o", fallbackUrl: `${GIVE}eb73b669-e850-495b-b0e5-620eb77bcaee`, donateLabel: "Donate $120" },
  { id: "hyfin100-monthly", tier: "hyfin100", name: "HYFIN100", price: "$84 / month", formId: 45593, amount: 84, frequency: "m", fallbackUrl: `${GIVE}2e7a1385-09d6-4d13-82bc-97e840ace247`, donateLabel: "Donate $84 monthly" },
  { id: "hyfin100-yearly", tier: "hyfin100", name: "HYFIN100", price: "$1000 / year", formId: 44749, amount: 1000, frequency: "o", fallbackUrl: `${GIVE}f81ff6bd-16dd-4f12-88d0-ce28a2cb588d`, donateLabel: "Donate $1000" },
];

export const planByForm = (formId: number): Plan | undefined => PLANS.find((p) => p.formId === formId);

export const planById = (id: string | undefined): Plan | undefined => PLANS.find((p) => p.id === id);

const firstNameOf = (o: unknown): string | null => {
  const v = o && typeof o === "object" ? (o as { firstName?: unknown }).firstName : undefined;
  return typeof v === "string" && v.trim() ? v.trim() : null;
};

/** The donor's first name from Funraise's onSuccess data (shape loosely documented), or null. */
export function thankYouName(data: unknown): string | null {
  const donor = data && typeof data === "object" ? (data as { donor?: unknown }).donor : undefined;
  return firstNameOf(donor) ?? firstNameOf(data);
}
