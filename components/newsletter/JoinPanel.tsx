import { SignupBox } from "./SignupBox";

const POINTS = ["First access to HYFIN events", "New music and the artists we can't stop spinning", "Member perks and giveaways"];

/**
 * The homepage's newsletter ask (plan 14 follow-up): the mockup's "Join the HYFIN Fam" band, framed in Signal green
 * so it stands out from the sections around it, with the three things the list actually sends.
 */
export function JoinPanel() {
  return (
    <section aria-labelledby="join-heading" className="border border-[#00ff9f] p-[clamp(22px,4vw,48px)]">
      <p className="m-0 mb-6 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-[#00ff9f]">
        <span aria-hidden className="size-2 bg-current" />
        The HYFIN Fam newsletter · free
      </p>
      <div className="flex flex-wrap items-center gap-x-16 gap-y-8">
        <h2 id="join-heading" className="sg-fx m-0 flex-[999_1_520px] font-display text-[clamp(44px,7vw,108px)] uppercase leading-[0.92] tracking-[-0.03em] [text-shadow:-0.03em_0_0_#ff0040,0.03em_0_0_#0070ff] [text-wrap:balance]">
          Join the HYFIN Fam
        </h2>
        <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-5">
          <p className="m-0 text-xl leading-[1.35]">New music, interviews and what&rsquo;s happening in Milwaukee, in your inbox.</p>
          <ul className="m-0 flex list-none flex-col gap-2 p-0 font-mono text-[13px]">
            {POINTS.map((p) => (
              <li key={p} className="flex gap-3"><span aria-hidden className="text-[#00ff9f]">→</span>{p}</li>
            ))}
          </ul>
          <SignupBox placement="home" button="Join the Fam" accent="#00ff9f" />
          <p className="m-0 font-mono text-xs text-ink-soft">Free. One email to confirm. Unsubscribe anytime.</p>
        </div>
      </div>
    </section>
  );
}
