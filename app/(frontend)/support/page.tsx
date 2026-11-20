import type { Metadata } from "next";
import Image from "next/image";
import { WaysIn } from "@/components/support/WaysIn";
import { planById } from "@/lib/support";
import type { SupportState } from "@/lib/supportFlow";

const DEK =
  "Black culture, powerful voices, and a community that sees itself reflected in every beat, every story, every moment. HYFIN is more than a platform. It’s a cultural home where we gather around our music and stories.";

export const metadata: Metadata = {
  title: "Support HYFIN",
  description: DEK,
  alternates: { canonical: "/support" },
};

const PILLARS = [
  ["Culture", "Showcasing the full spectrum of Black music, art, and cultural expression, from jazz to Amapiano, gospel to Afrobeats."],
  ["Tech & entrepreneurship", "Creating opportunities for Black businesses and professionals to thrive and get recognition."],
  ["Youth & education", "Investing in the next generation through Grace Weber’s Music Lab and mentorship programs."],
  ["Storytelling", "Amplifying Black voices, narratives, and experiences in Milwaukee and beyond."],
] as const;

const SOCIAL = [
  ["Instagram", "@hyfin.mke", "https://instagram.com/hyfin.mke"],
  ["TikTok", "@hyfin.mke", "https://www.tiktok.com/@hyfin.mke"],
  ["Facebook", "hyfinmke", "https://facebook.com/hyfinmke"],
  ["LinkedIn", "hyfinmke", "https://www.linkedin.com/company/hyfinmke/"],
] as const;

const LABEL = "font-mono text-xs uppercase tracking-[0.12em] text-ink-soft";
const H2 = "sg-lines m-0 font-display text-[clamp(40px,5.5vw,80px)] uppercase leading-[0.92] tracking-[-0.02em]";

/** Outside production only: `?step=checkout|thanks&plan=<PlanId>` opens that screen, for screenshots without a real gift. */
function previewState(q: Record<string, string | string[] | undefined>): SupportState | undefined {
  if (process.env.NODE_ENV === "production") return undefined;
  const plan = planById(typeof q.plan === "string" ? q.plan : undefined);
  if (!plan) return undefined;
  if (q.step === "checkout") return { step: "checkout", plan: plan.id };
  if (q.step === "thanks") return { step: "thanks", plan: plan.id, name: "Ada" };
  return undefined;
}

/** /support (mockup docs/mockups-html/screens/07-support; plan 8). Giving opens Funraise's form on this page. */
export default async function SupportPage({ searchParams }: PageProps<"/support">) {
  const initial = previewState(await searchParams);
  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-24 px-[clamp(20px,4vw,60px)] pb-10 pt-14">
      <header className="flex flex-col gap-7">
        <span className={`flex items-center gap-3 ${LABEL}`}>
          <span aria-hidden className="flex gap-2.5">
            <i className="h-3 w-3 bg-[#ff0040]" />
            <i className="h-3 w-3 bg-[#00ff9f]" />
            <i className="h-3 w-3 bg-[#0070ff]" />
          </span>
          Why support HYFIN
        </span>
        <h1 className="sg-fx sg-lines m-0 max-w-[1200px] font-display text-[clamp(52px,8.4vw,128px)] uppercase leading-[0.9] tracking-[-0.02em]">
          Connect the culture, spread the love!
        </h1>
        <p className="m-0 max-w-[700px] text-[21px] leading-snug text-[#e6e6e6]">{DEK}</p>
      </header>

      <WaysIn initial={initial} />

      <section aria-labelledby="gear" className="flex flex-wrap items-center gap-x-14 gap-y-10">
        <div className="relative min-w-0 flex-[1_1_420px]">
          <span aria-hidden className="absolute -left-3 top-6 h-[90%] w-[96%] bg-[#ff0040]" />
          <span aria-hidden className="absolute -top-3 left-6 h-[96%] w-[96%] bg-[#0070ff]" />
          <Image src="/support/member-tee.jpg" alt="The HYFIN member t-shirt, back: “Culture is currency, and we’ve been rich.” —Rapsody" width={1200} height={1200} sizes="(min-width: 1024px) 45vw, 100vw" className="sg-frame relative block w-full border-[12px] border-white" />
        </div>
        <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-6">
          <span className={LABEL}>Member gear / Edition 01</span>
          <h2 id="gear" className={H2}>
            Wear the signal.
          </h2>
          <p className="m-0 text-[19px] leading-snug text-[#e6e6e6]">Our new HYFIN t-shirt, designed by Milwaukee artist Nehemiah R. Edwards. It’s the official member tee.</p>
          <dl className="m-0 grid grid-cols-[auto_1fr] border-t border-[#333] font-mono text-[13px]">
            {[["Artist", "Nehemiah R. Edwards"], ["Comes with", "Membership, $10/month"], ["Sizes", "Small to XXL"]].map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="border-b border-[#333] py-3 pr-6 uppercase tracking-[0.08em] text-ink-soft">{k}</dt>
                <dd className="m-0 border-b border-[#333] py-3">{v}</dd>
              </div>
            ))}
          </dl>
          <a href="#ways-in" className="sg-btn inline-flex min-h-12 items-center self-start bg-white px-[22px] font-mono text-[13px] font-semibold uppercase tracking-[0.08em] text-black">
            Become a member
          </a>
        </div>
      </section>

      <section aria-labelledby="who" className="flex flex-col gap-6">
        <span className={LABEL}>Who we are</span>
        <h2 id="who" className={H2}>
          Accountable to you, our community.
        </h2>
        <div className="grid max-w-[1100px] grid-cols-[repeat(auto-fit,minmax(min(380px,100%),1fr))] gap-8 text-[19px] leading-snug text-[#e6e6e6]">
          <p className="m-0">HYFIN is a community-funded platform, part of non-profit Radio Milwaukee. Because we’re community-funded, we’re not beholden to corporate interests or traditional funders.</p>
          <p className="m-0">A shifting media landscape and recent federal budget cuts have created an even more urgent need for direct community investment. This is a challenge we know we can meet because we’ve got each other’s backs.</p>
        </div>
      </section>

      <section aria-labelledby="pillars" className="flex flex-col gap-8">
        <h2 id="pillars" className={H2}>
          Our pillars of impact
        </h2>
        <ol className="m-0 grid list-none grid-cols-1 gap-6 p-0 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map(([title, body], i) => (
            <li key={title} className="flex flex-col gap-3 border-t border-white pt-5">
              <span className="font-mono text-[13px] text-[#00ff9f]">{String(i + 1).padStart(2, "0")}</span>
              <h3 lang="en" className="m-0 break-words font-display text-[clamp(19px,1.6vw,24px)] uppercase leading-none hyphens-auto">{title}</h3>
              <p className="m-0 text-[17px] leading-snug text-[#e6e6e6]">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="share" aria-labelledby="share-heading" className="flex scroll-mt-24 flex-col gap-6">
        <span className="font-mono text-xs uppercase tracking-[0.12em] text-[#ff0040]">CH R / Share the love</span>
        <h2 id="share-heading" className={H2}>
          Spread the word on social media.
        </h2>
        <p className="m-0 max-w-[700px] text-[19px] leading-snug text-[#e6e6e6]">Help us reach more people by sharing HYFIN with your network. Use these handles to tag us and amplify our mission.</p>
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-4 p-0">
          {SOCIAL.map(([network, handle, href]) => (
            <li key={network}>
              <a href={href} target="_blank" rel="noopener noreferrer" className="flex min-h-20 flex-col justify-center gap-1 border border-white px-5 py-4 hover:bg-white hover:text-black">
                <span className="font-mono text-xs uppercase tracking-[0.1em] opacity-70">{network}</span>
                <span className="font-display text-xl">{handle}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="protect" className="flex flex-col gap-6 border-t border-white pt-14">
        <h2 id="protect" className={H2}>
          Protect what matters.
        </h2>
        <p className="m-0 max-w-[820px] text-[19px] leading-snug text-[#e6e6e6]">
          HYFIN exists because we support each other. However you choose to participate, you’re making HYFIN possible. You’re investing in a space where Black excellence is expected, where our narrative is ours to control, and where community comes first.
        </p>
        <a href="#ways-in" className="sg-btn inline-flex min-h-12 items-center self-start bg-white px-[22px] font-mono text-[13px] font-semibold uppercase tracking-[0.08em] text-black">
          Choose your way in
        </a>
        <p className="m-0 font-mono text-[13px] text-ink-soft">HYFIN is a media movement from Radio Milwaukee.</p>
      </section>
    </div>
  );
}
