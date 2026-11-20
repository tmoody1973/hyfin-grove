import type { Metadata } from "next";
import config from "@payload-config";
import { headers } from "next/headers";
import { getPayload } from "payload";
import { EventForm } from "@/components/staff/EventForm";

export const metadata: Metadata = { title: "Add an event", robots: { index: false, follow: false } };

/**
 * The staff quick-add link (plan 9, task 6; Tarik 2026-11-20): sign in with a Radio Milwaukee Google account, see
 * only the event form. Anyone signed in to the admin can use it; it never shows the rest of Payload.
 */
export default async function AddEventPage() {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: await headers() });
  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-8 px-[clamp(20px,4vw,60px)] pb-10 pt-12">
      <header className="flex flex-col gap-4">
        <span className="font-mono text-xs uppercase tracking-[0.12em] text-[#00ff9f]">Staff</span>
        <h1 className="sg-fx sg-lines m-0 font-display text-[clamp(44px,7vw,88px)] uppercase leading-[0.9]">Add an event</h1>
        {user && <p className="m-0 font-mono text-xs text-ink-soft">Signed in as {user.email}</p>}
      </header>
      {user ? (
        <EventForm />
      ) : (
        <div className="flex flex-col gap-5 border border-white p-7">
          <p className="m-0 text-[19px]">Sign in with your Radio Milwaukee Google account to add an event to the HYFIN site.</p>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a full page load: the route sets a cookie and hands off to Google */}
          <a href="/staff/sign-in?next=/staff/add-event" className="sg-btn inline-flex min-h-12 items-center self-start bg-white px-6 font-mono text-[13px] font-semibold uppercase tracking-[0.08em] text-black">Sign in with Google</a>
        </div>
      )}
    </div>
  );
}
