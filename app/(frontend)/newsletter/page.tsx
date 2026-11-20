import type { Metadata } from "next";
import config from "@payload-config";
import { connection } from "next/server";
import { getPayload } from "payload";
import { cache } from "react";
import { JoinBand } from "@/components/newsletter/JoinBand";
import { SignupBox } from "@/components/newsletter/SignupBox";
import { mergeNewsletter } from "@/lib/newsletter/content";
import { CHANNEL } from "@/lib/signal";

// connection(): read per request, so the build (CI has no database) never pre-renders this page.
const content = cache(async () => {
  await connection();
  return mergeNewsletter(await (await getPayload({ config })).findGlobal({ slug: "newsletter-page", depth: 0 }).catch(() => null));
});

export async function generateMetadata(): Promise<Metadata> {
  const c = await content();
  return { title: "Newsletter", description: c.dek, alternates: { canonical: "/newsletter" } };
}

/** /newsletter (plan 14): the case for joining, with the form at the top and again at the bottom. Words from Admin → Newsletter page. */
export default async function NewsletterPage() {
  const c = await content();
  return (
    <div className="px-[clamp(20px,4vw,60px)] pb-10 pt-11">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-16">
        <section className="flex flex-col gap-6">
          <span className="font-mono text-xs uppercase tracking-[0.12em] text-ink-soft">{c.eyebrow}</span>
          <JoinBand as="h1" placement="page" headline={c.headline} dek={c.dek} withName />
        </section>

        <section aria-labelledby="inside" className="flex flex-col gap-7 border-t border-white pt-[22px]">
          <h2 id="inside" className="sg-lines m-0 font-display text-[clamp(30px,3.6vw,52px)] uppercase leading-none">What&rsquo;s inside</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {c.reasons.map((r) => (
              <div key={r.title} className="flex flex-col gap-3 border-t-4 pt-4" style={{ borderColor: CHANNEL[r.channel] }}>
                <h3 className="m-0 font-mono text-sm font-semibold uppercase tracking-[0.1em]" style={{ color: CHANNEL[r.channel] }}>{r.title}</h3>
                <p className="m-0 text-[17px] leading-[1.5]">{r.body}</p>
              </div>
            ))}
          </div>
          {c.latestIssueUrl && (
            <a href={c.latestIssueUrl} target="_blank" rel="noreferrer" className="self-start font-mono text-sm uppercase tracking-[0.1em] underline underline-offset-4 hover:text-[#00ff9f]">Read the latest issue</a>
          )}
        </section>

        <section aria-label="Sign up" className="flex max-w-[720px] flex-col gap-4 border-t border-white pt-[22px]">
          <p className="m-0 text-xl">In? One box, one click.</p>
          <SignupBox placement="page" />
          <p className="m-0 font-mono text-xs text-ink-soft">
            {c.trust}{" "}
            <a href={c.privacyUrl} className="underline underline-offset-4" target="_blank" rel="noreferrer">Privacy policy</a>
          </p>
        </section>
      </div>
    </div>
  );
}
