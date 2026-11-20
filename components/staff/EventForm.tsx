"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { PhotoField } from "./PhotoField";
import { createEvent, type AddEventState } from "@/app/(frontend)/staff/add-event/actions";
import { EVENT_TYPES } from "@/lib/events/types";

const LABEL = "flex flex-col gap-2 font-mono text-xs uppercase tracking-[0.1em]";
const INPUT = "min-h-12 border border-white bg-black px-3 font-body text-[17px] normal-case tracking-normal text-white focus:border-[#00ff9f] focus:outline-none";
const ERR = "font-body text-sm normal-case tracking-normal text-[#ff0040]";

function Field({ name, label, error, children }: { name: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className={LABEL} htmlFor={name}>
      {label}
      {children}
      {error && <span id={`${name}-error`} className={ERR}>{error}</span>}
    </label>
  );
}

/** The staff quick-add form (plan 9, task 6): one screen, the fields an event needs, nothing else of the admin. */
export function EventForm() {
  const [state, action, pending] = useActionState<AddEventState, FormData>(createEvent, { status: "idle" });
  const [shrinking, setShrinking] = useState(false);
  if (state.status === "added") {
    return (
      <div role="status" className="flex flex-col gap-5 border border-white p-7">
        <span className="font-mono text-xs uppercase tracking-[0.12em] text-[#00ff9f]">Event added</span>
        <p className="m-0 font-display text-3xl uppercase leading-none">{state.title}</p>
        <p className="m-0 text-ink-soft">{state.published ? "It's live on the events page." : "Saved as a draft. An admin can publish it in Payload."}</p>
        <div className="flex flex-wrap gap-3">
          {state.href && <Link href={state.href} className="sg-btn inline-flex min-h-12 items-center bg-white px-5 font-mono text-[13px] font-semibold uppercase tracking-[0.08em] text-black">See the event</Link>}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a full reload clears the form */}
          <a href="/staff/add-event" className="inline-flex min-h-12 items-center border border-white px-5 font-mono text-[13px] font-semibold uppercase tracking-[0.08em]">Add another</a>
        </div>
      </div>
    );
  }
  const e = state.status === "error" ? (state.errors ?? {}) : {};
  // React resets a form after each action; refill it from what was typed so one mistake doesn't wipe the rest.
  const v = state.status === "error" ? (state.values ?? {}) : {};
  const ariaFor = (n: string) => (e[n] ? { "aria-invalid": true, "aria-describedby": `${n}-error` } : {});
  return (
    <form key={state.status === "error" ? JSON.stringify(v) : "fresh"} action={action} className="flex flex-col gap-6" noValidate>
      {state.status === "error" && state.message && <p role="alert" className="m-0 border border-[#ff0040] p-4 text-[#ff0040]">{state.message}</p>}
      <Field name="title" label="Title" error={e.title}>
        <input id="title" name="title" defaultValue={v.title} required maxLength={140} className={INPUT} {...ariaFor("title")} />
      </Field>
      <Field name="type" label="Type" error={e.type}>
        <select id="type" name="type" defaultValue={v.type || "hyfin-event"} className={INPUT} {...ariaFor("type")}>
          {EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </Field>
      <div className="grid gap-6 sm:grid-cols-3">
        <Field name="date" label="Date" error={e.date}><input id="date" name="date" defaultValue={v.date} type="date" required className={INPUT} {...ariaFor("date")} /></Field>
        <Field name="start" label="Starts (optional)" error={e.start}><input id="start" name="start" defaultValue={v.start} type="time" className={INPUT} {...ariaFor("start")} /></Field>
        <Field name="end" label="Ends (optional)" error={e.end}><input id="end" name="end" defaultValue={v.end} type="time" className={INPUT} {...ariaFor("end")} /></Field>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field name="venue" label="Venue"><input id="venue" name="venue" defaultValue={v.venue} className={INPUT} /></Field>
        <Field name="city" label="City"><input id="city" name="city" defaultValue={v.city ?? "Milwaukee"} className={INPUT} /></Field>
      </div>
      <Field name="address" label="Address"><input id="address" name="address" defaultValue={v.address} className={INPUT} /></Field>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field name="ticketUrl" label="Tickets or RSVP link" error={e.ticketUrl}><input id="ticketUrl" name="ticketUrl" defaultValue={v.ticketUrl} type="url" inputMode="url" placeholder="https://" className={INPUT} {...ariaFor("ticketUrl")} /></Field>
        <Field name="priceText" label="Price"><input id="priceText" name="priceText" defaultValue={v.priceText} placeholder="Free, or $15 advance" className={INPUT} /></Field>
      </div>
      <Field name="description" label="Description"><textarea id="description" name="description" defaultValue={v.description} rows={6} className={`${INPUT} py-3`} /></Field>
      <PhotoField error={e.photo} onBusy={setShrinking} />
      <label className="flex items-center gap-3 text-[17px]">
        <input type="checkbox" name="publish" defaultChecked={state.status !== "error" || v.publish === "on"} className="size-5 accent-[#00ff9f]" />
        Publish now (untick to save a draft for an admin to finish)
      </label>
      <button type="submit" disabled={pending || shrinking} className="sg-btn inline-flex min-h-14 items-center justify-center self-start bg-[#00ff9f] px-8 font-mono text-sm font-semibold uppercase tracking-[0.1em] text-black disabled:opacity-60">
        {shrinking ? "Preparing photo…" : pending ? "Saving…" : "Add event"}
      </button>
      <p className="m-0 text-sm text-ink-soft">Need a recap or more photos later? Open the event in Admin → Events.</p>
    </form>
  );
}
