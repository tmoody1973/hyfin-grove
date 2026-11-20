"use client";

import { useActionState } from "react";
import { submitForm, type FormState } from "@/app/(frontend)/forms/actions";
import { HONEYPOT, type FormField } from "@/lib/forms/submit";
import { Turnstile } from "./Turnstile";

const LABEL = "flex flex-col gap-2 font-mono text-xs uppercase tracking-[0.1em]";
const INPUT = "min-h-12 border border-white bg-black px-3 font-body text-[17px] normal-case tracking-normal text-white focus:border-[#00ff9f] focus:outline-none";
const ERR = "font-body text-sm normal-case tracking-normal text-[#ff0040]";

/** `messages`: staff text blocks, already rendered on the server, by their position in `fields`. */
type Props = { formId: number; fields: FormField[]; submitLabel?: string | null; confirmation: React.ReactNode; messages: Record<number, React.ReactNode> };

/** Any form staff built in Admin → Forms, in the Signal style (plan 13). Values are kept when something needs fixing. */
export function FormRenderer({ formId, fields, submitLabel, confirmation, messages }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitForm, { status: "idle" });
  if (state.status === "sent") return <div role="status" className="story-body border border-[#00ff9f] p-7 text-[19px]">{confirmation}</div>;
  const e = state.status === "error" ? (state.errors ?? {}) : {};
  const v = state.status === "error" ? (state.values ?? {}) : {};
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  return (
    <form action={action} className="flex max-w-[720px] flex-col gap-6" noValidate key={state.status === "error" ? state.at : "fresh"}>
      {state.status === "error" && state.message && <p role="alert" className="m-0 border border-[#ff0040] p-4 text-[#ff0040]">{state.message}</p>}
      <input type="hidden" name="formId" value={formId} />
      {/* The decoy: off-screen and skipped by keyboard and screen readers, so only bots fill it in. */}
      <div aria-hidden="true" className="absolute left-[-10000px] h-px w-px overflow-hidden">
        <label>Company website<input name={HONEYPOT} tabIndex={-1} autoComplete="off" /></label>
      </div>
      {fields.map((f, i) => {
        if (f.blockType === "message") return <div key={i} className="story-body text-[19px]">{messages[i]}</div>;
        if (!f.name) return null;
        const n = f.name;
        const label = `${f.label || n}${f.required ? "" : " (optional)"}`;
        const aria = e[n] ? { "aria-invalid": true, "aria-describedby": `${n}-error` } : {};
        const err = e[n] && <span id={`${n}-error`} className={ERR}>{e[n]}</span>;
        if (f.blockType === "checkbox") {
          return (
            <div key={n} className="flex flex-col gap-2">
              <label className="flex items-center gap-3 text-[17px]">
                <input type="checkbox" name={n} defaultChecked={v[n] === "on"} required={!!f.required} className="size-5 accent-[#00ff9f]" {...aria} />
                {label}
              </label>
              {err}
            </div>
          );
        }
        const common = { id: n, name: n, defaultValue: v[n], required: !!f.required, ...aria };
        return (
          <label key={n} className={LABEL} htmlFor={n}>
            {label}
            {f.blockType === "textarea" ? (
              <textarea {...common} rows={6} maxLength={5000} className={`${INPUT} py-3`} />
            ) : f.blockType === "select" ? (
              <select {...common} defaultValue={v[n] ?? ""} className={INPUT}>
                <option value="">Choose…</option>
                {(f.options ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : (
              <input {...common} type={f.blockType === "email" ? "email" : "text"} maxLength={5000} autoComplete={f.blockType === "email" ? "email" : undefined} className={INPUT} />
            )}
            {err}
          </label>
        );
      })}
      {/* A new error rebuilds the form (key above), which mounts a fresh widget: Turnstile tokens are single-use. */}
      {siteKey && <Turnstile siteKey={siteKey} />}
      <button type="submit" disabled={pending} className="sg-btn inline-flex min-h-14 items-center justify-center self-start bg-[#00ff9f] px-8 font-mono text-sm font-semibold uppercase tracking-[0.1em] text-black disabled:opacity-60">
        {pending ? "Sending…" : submitLabel || "Send"}
      </button>
    </form>
  );
}
