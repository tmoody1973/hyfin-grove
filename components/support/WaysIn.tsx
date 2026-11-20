"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { usePlayer } from "@/components/player/PlayerProvider";
import { thankYouName, type Plan } from "@/lib/support";
import type { SupportContent } from "@/lib/supportContent";
import { supportReducer, type SupportState } from "@/lib/supportFlow";
import { Funraise } from "./Funraise";


const CARD_BTN = "inline-flex min-h-14 flex-1 items-center justify-center px-3 font-display text-[15px] uppercase";

function Perks({ items }: { items: readonly string[] }) {
  return (
    <ul className="m-0 list-none p-0 text-[15px]">
      {items.map((t) => (
        <li key={t} className="border-t border-[#333] py-3">
          {t}
        </li>
      ))}
    </ul>
  );
}

/**
 * A price button. Funraise's click listener opens the plan's popup for any button with data-formid (it does not take
 * over links: a link navigates away). If Funraise's script never loaded (blocked, down), go to the hosted page instead.
 */
function GiveLink({ plan, className, onPick, children }: { plan: Plan; className: string; onPick: () => void; children: React.ReactNode }) {
  const onClick = () => {
    onPick();
    if (!window.funraise?.scriptIsLoaded) window.location.assign(plan.fallbackUrl);
  };
  return (
    <button type="button" data-formid={plan.formId} onClick={onClick} className={className}>
      {children}
    </button>
  );
}

function Card({ ch, color, title, sub, perks, featured, children }: { ch: string; color: string; title: string; sub: string; perks: readonly string[]; featured?: boolean; children: React.ReactNode }) {
  return (
    <div className={`flex min-w-0 flex-col gap-4 border p-7 ${featured ? "border-white" : "border-[#555]"}`}>
      <span className="font-mono text-xs tracking-[0.1em]" style={{ color }}>
        {ch}
      </span>
      <h3 className="m-0 font-display text-[32px] uppercase leading-none">{title}</h3>
      <p className="m-0 font-mono text-[13px] text-ink-soft">{sub}</p>
      <Perks items={perks} />
      <div className="mt-auto flex gap-3 pt-4">{children}</div>
    </div>
  );
}

/**
 * Concept slides "Support": three ways in. Picking a price shows "You're tuning in as…" and opens Funraise's form
 * over it; a finished gift turns the panel into "Signal received". `initial` is for screenshots outside production.
 */
/** Only the parts this section shows travel to the browser. */
export type WaysInContent = Pick<SupportContent, "share" | "member" | "hyfin100" | "plans" | "thanks">;

export function WaysIn({ content, initial }: { content: WaysInContent; initial?: SupportState }) {
  const plans = content.plans;
  const [state, dispatch] = useReducer(supportReducer, initial ?? { step: "choose" });
  const { play } = usePlayer();
  const heading = useRef<HTMLHeadingElement>(null);
  const sectionHeading = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);

  const onSuccess = useCallback(
    (formId: number, data: unknown) => {
      const plan = plans.find((p) => p.formId === formId);
      if (plan) dispatch({ type: "succeeded", plan: plan.id, name: thankYouName(data) });
    },
    [plans],
  );

  // Move focus to the new panel's heading when the step changes (not on first render).
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    (state.step === "choose" ? sectionHeading : heading).current?.focus();
  }, [state]);

  const pick = (plan: Plan) => () => dispatch({ type: "pick", plan: plan.id });
  const toShare = () => document.getElementById("share")?.scrollIntoView({ behavior: "smooth" });
  const plan = state.step === "choose" ? null : (plans.find((p) => p.id === state.plan) ?? null);
  const tier = (t: Plan["tier"]) => plans.filter((p) => p.tier === t);
  const perksFor = (t: Plan["tier"]) => content[t].perks;

  return (
    <section id="ways-in" aria-labelledby="ways-in-heading" className="flex scroll-mt-24 flex-col gap-6">
      <Funraise plans={plans} onSuccess={onSuccess} />
      <h2 id="ways-in-heading" ref={sectionHeading} tabIndex={-1} className="m-0 outline-none font-mono text-[13px] uppercase tracking-[0.12em] text-ink-soft">
        Three ways in
      </h2>
      <p aria-live="polite" className="sr-only">
        {state.step === "thanks" ? "Signal received. Thank you." : ""}
      </p>

      {state.step === "choose" && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-6">
          <Card ch="CH R" color="#ff0040" title={content.share.title} sub={content.share.sub} perks={content.share.perks}>
            <button type="button" onClick={toShare} className={`${CARD_BTN} border border-white`}>
              {content.share.buttonLabel}
            </button>
          </Card>
          <Card ch="CH G" color="#00ff9f" title={content.member.title} sub={content.member.sub} perks={content.member.perks} featured>
            {tier("member").map((p, i) => (
              <GiveLink key={p.id} plan={p} onPick={pick(p)} className={`${CARD_BTN} ${i === 0 ? "bg-[#00ff9f] text-black" : "border border-white"}`}>
                {p.price.replace(" / ", "/")}
              </GiveLink>
            ))}
          </Card>
          <Card ch="CH B" color="#0070ff" title={content.hyfin100.title} sub={content.hyfin100.sub} perks={content.hyfin100.perks}>
            {tier("hyfin100").map((p, i) => (
              <GiveLink key={p.id} plan={p} onPick={pick(p)} className={`${CARD_BTN} ${i === 0 ? "bg-[#00ff9f] text-black" : "border border-white"}`}>
                {p.price.replace(" / ", "/")}
              </GiveLink>
            ))}
          </Card>
        </div>
      )}

      {plan && state.step === "checkout" && (
        <div className="flex flex-wrap gap-x-10 gap-y-8 border border-white p-[clamp(20px,3vw,32px)]">
          <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
            <span className="font-mono text-xs uppercase tracking-[0.12em] text-ink-soft">You&apos;re tuning in as</span>
            <h3 ref={heading} tabIndex={-1} className="sg-fx m-0 font-display text-[clamp(36px,4vw,56px)] uppercase leading-none outline-none">
              {plan.name}
            </h3>
            <span className="font-mono text-xl text-[#00ff9f]">{plan.price}</span>
            <Perks items={perksFor(plan.tier)} />
            <button type="button" onClick={() => dispatch({ type: "back" })} className="mt-2 self-start font-mono text-xs uppercase tracking-[0.1em] underline underline-offset-4">
              Back: choose another way in
            </button>
          </div>
          <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-4 self-start bg-white p-7 text-black">
            <div className="flex items-baseline justify-between">
              <strong className="font-display text-xl">HYFIN</strong>
              <span className="text-[13px] text-[#555]">Secure giving by Funraise</span>
            </div>
            <div className="flex items-baseline justify-between bg-[#efefef] px-4 py-3.5">
              <span>{plan.name}</span>
              <strong className="text-xl">{plan.price}</strong>
            </div>
            <GiveLink plan={plan} onPick={() => {}} className="sg-btn inline-flex min-h-14 items-center justify-center bg-[#00ff9f] text-lg font-semibold text-black">
              {plan.donateLabel}
            </GiveLink>
            <p className="m-0 text-[13px] text-[#555]">Card, PayPal and bank payments are handled securely by Funraise. Closed the form? Press the button to open it again.</p>
          </div>
        </div>
      )}

      {plan && state.step === "thanks" && (
        <div className="flex flex-col gap-4 border border-white p-[clamp(20px,3vw,32px)]">
          <span className="font-mono text-xs uppercase tracking-[0.12em] text-[#00ff9f]">Transmission complete</span>
          <h3 ref={heading} tabIndex={-1} className="sg-fx m-0 font-display text-[clamp(40px,5vw,72px)] uppercase leading-none outline-none">
            Signal received.
          </h3>
          <p className="m-0 max-w-[640px] text-[19px] leading-snug">
            {state.name ? `Thank you, ${state.name}.` : "Thank you."} Welcome in: {plan.name}, {plan.price}. A receipt is on its way to your inbox.
            {content.thanks.fulfillmentLine ? ` ${content.thanks.fulfillmentLine}` : ""}
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button type="button" onClick={() => play({ kind: "live" })} className="sg-btn inline-flex min-h-12 items-center bg-white px-[22px] font-mono text-[13px] font-semibold uppercase tracking-[0.08em] text-black">
              Listen live
            </button>
            <button type="button" onClick={toShare} className="inline-flex min-h-12 items-center border border-white px-[22px] font-mono text-[13px] font-semibold uppercase tracking-[0.08em]">
              Share HYFIN
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
