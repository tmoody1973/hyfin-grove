import type { Metadata } from "next";
import config from "@payload-config";
import Image from "next/image";
import { getPayload } from "payload";
import { cache } from "react";
import { WaysIn } from "@/components/support/WaysIn";
import { getSupportContent, type SupportContent } from "@/lib/supportContent";
import type { SupportState } from "@/lib/supportFlow";

const content = cache(async () => getSupportContent(await getPayload({ config })));

export async function generateMetadata(): Promise<Metadata> {
  const c = await content();
  return { title: "Support HYFIN", description: c.hero.dek, alternates: { canonical: "/support" } };
}

const LABEL = "font-mono text-xs uppercase tracking-[0.12em] text-ink-soft";
const H2 = "sg-lines m-0 font-display text-[clamp(40px,5.5vw,80px)] uppercase leading-[0.92] tracking-[-0.02em]";

/** Outside production only: `?step=checkout|thanks&plan=<plan id>` opens that screen, for screenshots without a real gift. */
function previewState(q: Record<string, string | string[] | undefined>, c: SupportContent): SupportState | undefined {
  if (process.env.NODE_ENV === "production") return undefined;
  const plan = c.plans.find((p) => p.id === q.plan);
  if (!plan) return undefined;
  if (q.step === "checkout") return { step: "checkout", plan: plan.id };
  if (q.step === "thanks") return { step: "thanks", plan: plan.id, name: "Ada" };
  return undefined;
}

/** /support (mockup docs/mockups-html/screens/07-support; plans 8 and 10). Words come from Admin → Support page. */
export default async function SupportPage({ searchParams }: PageProps<"/support">) {
  const q = await searchParams;
  const c = await content();
  const initial = previewState(q, c);
  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-24 px-[clamp(20px,4vw,60px)] pb-10 pt-14">
      <header className="flex flex-col gap-7">
        <span className={`flex items-center gap-3 ${LABEL}`}>
          <span aria-hidden className="flex gap-2.5">
            <i className="h-3 w-3 bg-[#ff0040]" />
            <i className="h-3 w-3 bg-[#00ff9f]" />
            <i className="h-3 w-3 bg-[#0070ff]" />
          </span>
          {c.hero.eyebrow}
        </span>
        <h1 className="sg-fx sg-lines m-0 max-w-[1200px] font-display text-[clamp(52px,8.4vw,128px)] uppercase leading-[0.9] tracking-[-0.02em]">{c.hero.headline}</h1>
        <p className="m-0 max-w-[700px] text-[21px] leading-snug text-[#e6e6e6]">{c.hero.dek}</p>
      </header>

      <WaysIn content={{ share: c.share, member: c.member, hyfin100: c.hyfin100, plans: c.plans, thanks: c.thanks }} initial={initial} />

      <section aria-labelledby="gear" className="flex flex-wrap items-center gap-x-14 gap-y-10">
        <div className="relative min-w-0 flex-[1_1_420px]">
          <span aria-hidden className="absolute -left-3 top-6 h-[90%] w-[96%] bg-[#ff0040]" />
          <span aria-hidden className="absolute -top-3 left-6 h-[96%] w-[96%] bg-[#0070ff]" />
          <Image src={c.gear.imageUrl} alt={c.gear.imageAlt} width={1200} height={1200} sizes="(min-width: 1024px) 45vw, 100vw" className="sg-frame relative block w-full border-[12px] border-white object-cover" />
        </div>
        <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-6">
          <span className={LABEL}>{c.gear.eyebrow}</span>
          <h2 id="gear" className={H2}>{c.gear.headline}</h2>
          <p className="m-0 text-[19px] leading-snug text-[#e6e6e6]">{c.gear.body}</p>
          <dl className="m-0 grid grid-cols-[auto_1fr] border-t border-[#333] font-mono text-[13px]">
            {c.gear.facts.map(({ label, value }) => (
              <div key={label} className="contents">
                <dt className="border-b border-[#333] py-3 pr-6 uppercase tracking-[0.08em] text-ink-soft">{label}</dt>
                <dd className="m-0 border-b border-[#333] py-3">{value}</dd>
              </div>
            ))}
          </dl>
          <a href="#ways-in" className="sg-btn inline-flex min-h-12 items-center self-start bg-white px-[22px] font-mono text-[13px] font-semibold uppercase tracking-[0.08em] text-black">{c.gear.buttonLabel}</a>
        </div>
      </section>

      <section aria-labelledby="who" className="flex flex-col gap-6">
        <span className={LABEL}>{c.who.eyebrow}</span>
        <h2 id="who" className={H2}>{c.who.headline}</h2>
        <div className="grid max-w-[1100px] grid-cols-[repeat(auto-fit,minmax(min(380px,100%),1fr))] gap-8 text-[19px] leading-snug text-[#e6e6e6]">
          {c.who.paragraphs.map((p) => <p key={p} className="m-0">{p}</p>)}
        </div>
      </section>

      <section aria-labelledby="pillars" className="flex flex-col gap-8">
        <h2 id="pillars" className={H2}>{c.pillars.headline}</h2>
        <ol className="m-0 grid list-none grid-cols-1 gap-6 p-0 sm:grid-cols-2 lg:grid-cols-4">
          {c.pillars.items.map(({ title, body }, i) => (
            <li key={title} className="flex flex-col gap-3 border-t border-white pt-5">
              <span className="font-mono text-[13px] text-[#00ff9f]">{String(i + 1).padStart(2, "0")}</span>
              <h3 lang="en" className="m-0 break-words font-display text-[clamp(19px,1.6vw,24px)] uppercase leading-none hyphens-auto">{title}</h3>
              <p className="m-0 text-[17px] leading-snug text-[#e6e6e6]">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      {c.impact.show && (
        <section aria-labelledby="impact" className="flex flex-col gap-8">
          <h2 id="impact" className={H2}>{c.impact.headline}</h2>
          <dl className="m-0 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {c.impact.stats.map((s) => (
              <div key={s.label} className="flex flex-col gap-2 border-t border-white pt-5">
                <dt className="order-2 font-mono text-xs uppercase tracking-[0.1em] text-ink-soft">{s.label}</dt>
                <dd className="order-1 m-0 font-display text-[clamp(48px,6vw,88px)] leading-none text-[#00ff9f]">{s.value}</dd>
                {s.note && <dd className="order-3 m-0 text-[15px] text-[#e6e6e6]">{s.note}</dd>}
              </div>
            ))}
          </dl>
        </section>
      )}

      <section id="share" aria-labelledby="share-heading" className="flex scroll-mt-24 flex-col gap-6">
        <span className="font-mono text-xs uppercase tracking-[0.12em] text-[#ff0040]">{c.social.eyebrow}</span>
        <h2 id="share-heading" className={H2}>{c.social.headline}</h2>
        <p className="m-0 max-w-[700px] text-[19px] leading-snug text-[#e6e6e6]">{c.social.body}</p>
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-4 p-0">
          {c.social.links.map(({ network, handle, url }) => (
            <li key={url}>
              <a href={url} target="_blank" rel="noopener noreferrer" className="flex min-h-20 flex-col justify-center gap-1 border border-white px-5 py-4 hover:bg-white hover:text-black">
                <span className="font-mono text-xs uppercase tracking-[0.1em] opacity-70">{network}</span>
                <span className="font-display text-xl">{handle}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="protect" className="flex flex-col gap-6 border-t border-white pt-14">
        <h2 id="protect" className={H2}>{c.closing.headline}</h2>
        <p className="m-0 max-w-[820px] text-[19px] leading-snug text-[#e6e6e6]">{c.closing.body}</p>
        <a href="#ways-in" className="sg-btn inline-flex min-h-12 items-center self-start bg-white px-[22px] font-mono text-[13px] font-semibold uppercase tracking-[0.08em] text-black">{c.closing.buttonLabel}</a>
        <p className="m-0 font-mono text-[13px] text-ink-soft">{c.closing.tagline}</p>
        {c.closing.legalLine && <p className="m-0 font-mono text-[12px] text-ink-soft">{c.closing.legalLine}</p>}
      </section>
    </div>
  );
}
