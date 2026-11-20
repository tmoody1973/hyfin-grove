import { SignupBox } from "./SignupBox";
import type { Placement } from "@/lib/newsletter/mailchimp";

/** The mockup's "Join the HYFIN Fam" band (screens/01-home #join): a big red/blue split headline with the form beside it. */
export function JoinBand({ placement, headline = "Join the HYFIN Fam", dek = "New music, interviews and what's happening in Milwaukee, in your inbox.", as: H = "h2", withName = false }: { placement: Placement; headline?: string; dek?: string; as?: "h1" | "h2"; withName?: boolean }) {
  return (
    <div className="flex flex-wrap items-end gap-x-16 gap-y-8">
      <H className="sg-fx m-0 flex-[999_1_560px] font-display text-[clamp(48px,8vw,120px)] uppercase leading-[0.92] tracking-[-0.03em] [text-shadow:-0.03em_0_0_#ff0040,0.03em_0_0_#0070ff] [text-wrap:balance]">{headline}</H>
      <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-4">
        <p className="m-0 text-xl leading-[1.35]">{dek}</p>
        <SignupBox placement={placement} withName={withName} />
      </div>
    </div>
  );
}
