"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { usePlayer } from "@/components/player/PlayerProvider";
import { PLANS, planByForm, planById, thankYouName, type Plan } from "@/lib/support";
import { supportReducer, type SupportState } from "@/lib/supportFlow";
import { Funraise } from "./Funraise";

const PERKS = {
  share: ["Share HYFIN with friends and family", "Encourage them to become regular listeners", "Spread the word on social media", "Join our newsletter list and share with others"],
  member: ["Official HYFIN t-shirt design by Nehemiah R. Edwards", "Member recognition", "Support a public media movement", "Sustain authentic Black media"],
  hyfin100: ["Exclusive premium gear", "VIP invitations to HYFIN events", "Insider access to the platform", "Recognition as a founding supporter"],
} as const;

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

/** A price button: opens the plan's Funraise popup (data-formId) or, without Funraise's script, its hosted page. */
function GiveLink({ plan, className, onPick, children }: { plan: Plan; className: string; onPick: () => void; children: React.ReactNode }) {
  return (
    <a href={plan.fallbackUrl} data-formid={plan.formId} onClick={onPick} className={className}>
      {children}
    </a>
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
export function WaysIn({ initial }: { initial?: SupportState }) {
  const [state, dispatch] = useReducer(supportReducer, initial ?? { step: "choose" });
  const { play } = usePlayer();
  const heading = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);

  const onSuccess = useCallback((formId: number, data: unknown) => {
    const plan = planByForm(formId);
    if (plan) dispatch({ type: "succeeded", plan: plan.id, name: thankYouName(data) });
  }, []);

  // Move focus to the new panel's heading when the step changes (not on first render).
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    heading.current?.focus();
  }, [state]);

  const pick = (plan: Plan) => () => dispatch({ type: "pick", plan: plan.id });
  const toShare = () => document.getElementById("share")?.scrollIntoView({ behavior: "smooth" });
  const plan = state.step === "choose" ? null : planById(state.plan);
  const tier = (t: Plan["tier"]) => PLANS.filter((p) => p.tier === t);

  return (
    <section id="ways-in" aria-labelledby="ways-in-heading" className="flex scroll-mt-24 flex-col gap-6">
      <Funraise onSuccess={onSuccess} />
      <h2 id="ways-in-heading" className="m-0 font-mono text-[13px] uppercase tracking-[0.12em] text-ink-soft">
        Three ways in
      </h2>
      <p aria-live="polite" className="sr-only">
        {state.step === "thanks" ? "Signal received. Thank you." : ""}
      </p>

      {state.step === "choose" && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-6">
          <Card ch="CH R" color="#ff0040" title="Share the love" sub="Show your support on social media" perks={PERKS.share}>
            <button type="button" onClick={toShare} className={`${CARD_BTN} border border-white`}>
              Learn more
            </button>
          </Card>
          <Card ch="CH G" color="#00ff9f" title="Become a member" sub="$10/month or $120/year" perks={PERKS.member} featured>
            {tier("member").map((p, i) => (
              <GiveLink key={p.id} plan={p} onPick={pick(p)} className={`${CARD_BTN} ${i === 0 ? "bg-[#00ff9f] text-black" : "border border-white"}`}>
                {p.price.replace(" / ", "/")}
              </GiveLink>
            ))}
          </Card>
          <Card ch="CH B" color="#0070ff" title="Join HYFIN100" sub="$84/month or $1000/year" perks={PERKS.hyfin100}>
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
            <Perks items={PERKS[plan.tier]} />
            <button type="button" onClick={() => dispatch({ type: "back" })} className="mt-2 self-start font-mono text-xs uppercase tracking-[0.1em] underline underline-offset-4">
              Back: choose another way in
            </button>
          </div>
          <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-4 bg-white p-7 text-black">
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
