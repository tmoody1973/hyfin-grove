import type { PlanId } from "./support";

/** The "three ways in" section: the cards, a chosen plan's checkout panel, or the thank-you. */
export type SupportState = { step: "choose" } | { step: "checkout"; plan: PlanId } | { step: "thanks"; plan: PlanId; name: string | null };

export type SupportAction = { type: "pick"; plan: PlanId } | { type: "back" } | { type: "succeeded"; plan: PlanId; name: string | null };

/** Closing Funraise's popup is not an action: the donor stays on the checkout panel and can reopen it. */
export function supportReducer(_state: SupportState, action: SupportAction): SupportState {
  switch (action.type) {
    case "pick":
      return { step: "checkout", plan: action.plan };
    case "back":
      return { step: "choose" };
    case "succeeded":
      return { step: "thanks", plan: action.plan, name: action.name };
  }
}
