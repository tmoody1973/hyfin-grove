"use client";

import { useActionState, useId } from "react";
import { subscribe, type SignupState } from "@/app/(frontend)/newsletter/actions";
import { Turnstile } from "@/components/forms/Turnstile";
import { HONEYPOT } from "@/lib/forms/submit";
import type { Placement } from "@/lib/newsletter/mailchimp";

const LABEL = "font-mono text-[11px] uppercase tracking-[0.12em]";
const INPUT = "h-[52px] min-w-0 border border-white bg-black px-3.5 font-mono text-base text-white focus:border-[#00ff9f] focus:outline-none";

/**
 * The newsletter signup (plan 14), anywhere on the site. `placement` becomes the Mailchimp tag signup:<placement>,
 * so we can see which spot works. `withName` adds the optional first-name field.
 */
export function SignupBox({ placement, withName = false, button = "Subscribe", accent = "#ffffff" }: { placement: Placement; withName?: boolean; button?: string; accent?: string }) {
  const [state, action, pending] = useActionState<SignupState, FormData>(subscribe, { status: "idle" });
  const id = useId();
  if (state.status === "done") {
    return (
      <p role="status" className="m-0 border border-[#00ff9f] p-4 text-[17px]">
        {state.kind === "already" ? "You're already in the Fam. Thanks for being here." : "Almost there. Check your inbox to confirm: look for an email from HYFIN."}
      </p>
    );
  }
  const err = state.status === "error" ? state : null;
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  return (
    // A new error rebuilds the form (key), which also mounts a fresh Turnstile token (they're single-use).
    <form key={err ? err.at : "fresh"} action={action} className="flex flex-col gap-3" noValidate>
      <input type="hidden" name="placement" value={placement} />
      <div aria-hidden="true" className="absolute left-[-10000px] h-px w-px overflow-hidden">
        <label>Company website<input name={HONEYPOT} tabIndex={-1} autoComplete="off" /></label>
      </div>
      {withName && (
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-name`} className={LABEL}>First name (optional)</label>
          <input id={`${id}-name`} name="firstName" autoComplete="given-name" maxLength={100} defaultValue={err?.firstName} className={INPUT} />
        </div>
      )}
      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-email`} className={LABEL}>Email address</label>
        <div className="flex flex-wrap gap-3">
          <input
            id={`${id}-email`}
            name="email"
            type="email"
            required
            autoComplete="email"
            maxLength={254}
            defaultValue={err?.email}
            aria-invalid={err ? true : undefined}
            aria-describedby={err ? `${id}-error` : undefined}
            className={`${INPUT} flex-[1_1_220px]`}
          />
          <button type="submit" disabled={pending} style={{ background: accent }} className="sg-btn h-[52px] px-6 font-mono text-[13px] font-semibold uppercase tracking-[0.08em] text-black disabled:opacity-60">
            {pending ? "Sending…" : button}
          </button>
        </div>
      </div>
      {err && (
        <p id={`${id}-error`} role="alert" className="m-0 text-sm text-[#ff0040]">
          {err.message}{" "}
          {err.fallbackUrl && <a href={err.fallbackUrl} className="underline underline-offset-4" target="_blank" rel="noreferrer">Rejoin on Mailchimp</a>}
        </p>
      )}
      {siteKey && <Turnstile siteKey={siteKey} />}
    </form>
  );
}
