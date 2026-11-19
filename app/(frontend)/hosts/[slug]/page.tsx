import { legacyOr404 } from "@/lib/legacy/legacyOr404";
import config from "@payload-config";
import type { Metadata } from "next";
import Link from "next/link";

import { connection } from "next/server";
import { getPayload } from "payload";
import { cache } from "react";
import { ListenLiveButton } from "@/components/listen/ListenLiveButton";
import { StoryList } from "@/components/listen/StoryList";
import { normalizeName, weeklyLabel } from "@/lib/listen/attach";
import { toHostLite, toShowLite } from "@/lib/listen/directory";
import { getAirings, type Airing } from "@/lib/listen/rmPlaylist";
import { formatClock, formatDayKey, todayKey } from "@/lib/listen/time";
import { getPostsByByline } from "@/lib/posts";

const DAY = 86_400_000;
const RECENT_SETS = 3;

const getHost = cache(async (slug: string) => {
  const payload = await getPayload({ config });
  const { docs } = await payload.find({ collection: "hosts", where: { slug: { equals: slug } }, limit: 1, depth: 1 });
  const host = docs[0];
  if (!host) return null;
  const shows = await payload.find({ collection: "shows", where: { hosts: { contains: host.id } }, pagination: false, depth: 0, sort: "name" });
  return { host, shows: shows.docs };
});

async function requestTime(): Promise<number> {
  await connection();
  return Date.now();
}

export async function generateMetadata({ params }: PageProps<"/hosts/[slug]">): Promise<Metadata> {
  const found = await getHost((await params).slug);
  if (!found) return {};
  return { title: found.host.name, description: found.host.bio?.split("\n")[0] ?? `${found.host.name} on HYFIN.`, alternates: { canonical: `/hosts/${found.host.slug}` } };
}

export default async function HostPage({ params }: PageProps<"/hosts/[slug]">) {
  const { slug } = await params;
  const found = await getHost(slug);
  if (!found) return legacyOr404(`/hosts/${slug}`);
  const now = await requestTime();
  const host = toHostLite(found.host);
  const shows = found.shows.map(toShowLite);
  const programs = new Set(shows.flatMap((s) => (s.cadenceProgramName ? [normalizeName(s.cadenceProgramName)] : [])));
  const hostKey = host.cadenceHostName ? normalizeName(host.cadenceHostName) : null;
  const isTheirs = (a: Airing) => programs.has(normalizeName(a.name)) || (hostKey !== null && a.hosts.some((h) => normalizeName(h) === hostKey));

  const [airings, stories] = await Promise.all([getAirings(now - 28 * DAY, now + 7 * DAY), getPostsByByline(found.host.name, 12)]);
  const theirs = airings.ok ? airings.value.airings.filter(isTheirs) : [];
  const onNow = theirs.find((a) => a.startsAt <= now && now < a.endsAt);
  const recent = theirs.filter((a) => a.startsAt <= now).sort((a, b) => b.startsAt - a.startsAt).slice(0, RECENT_SETS);
  const showFor = (a: Airing) => shows.find((s) => s.cadenceProgramName && normalizeName(s.cadenceProgramName) === normalizeName(a.name));
  const upcoming = theirs.filter((a) => a.startsAt > now - DAY);

  return (
    <div className="mx-auto max-w-[1320px] px-[clamp(20px,4vw,60px)] pt-10">
      <p className="font-mono text-xs text-ink-soft">/hosts/{host.slug}</p>
      <div className="mt-6 grid gap-10 md:grid-cols-[320px_1fr]">
        {host.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- staff-uploaded host photo
          <img src={host.photoUrl} alt={host.name} width={320} height={320} className="aspect-square w-full border border-white object-cover" />
        ) : (
          <span aria-hidden="true" className="block aspect-square w-full border border-white bg-[#1a1a1a]" />
        )}
        <div className="min-w-0">
          {onNow && <p className="font-mono text-xs uppercase tracking-[0.12em] text-[#ff0040]">On air now · until {formatClock(onNow.endsAt)}</p>}
          <h1 className="mt-3 break-words font-display text-[clamp(44px,7vw,96px)] uppercase leading-[0.85] tracking-[-0.02em]">{host.name}</h1>
          {shows.length > 0 && (
            <ul className="mt-5 flex flex-col gap-1.5">
              {shows.map((s) => {
                const label = s.cadenceProgramName ? weeklyLabel(upcoming.filter((a) => normalizeName(a.name) === normalizeName(s.cadenceProgramName!))) : null;
                return (
                  <li key={s.slug} className="text-lg">
                    <Link href={`/shows/${s.slug}`} className="underline underline-offset-2 hover:text-[#00ff9f]">{s.name}</Link>
                    {label && <span className="text-ink-soft"> · {label}</span>}
                  </li>
                );
              })}
            </ul>
          )}
          {found.host.bio && (
            <div className="mt-6 flex max-w-[680px] flex-col gap-2 text-ink-soft">
              {found.host.bio.split("\n").map((line, i) => <p key={i}>{line}</p>)}
            </div>
          )}
          {onNow && <div className="mt-6"><ListenLiveButton /></div>}
        </div>
      </div>

      <div className="mt-14 grid gap-12 lg:grid-cols-[1fr_340px]">
        <section aria-labelledby="stories-heading">
          <h2 id="stories-heading" className="border-b border-white pb-2 font-display text-3xl uppercase">Stories by {host.name}</h2>
          {stories.length > 0 ? <StoryList stories={stories} /> : <p className="py-6 text-ink-soft">No stories yet.</p>}
        </section>
        {!airings.ok && <p className="text-ink-soft">Recent sets are unavailable right now. Try again in a minute.</p>}
        {recent.length > 0 && (
          <aside aria-labelledby="sets-heading">
            <h2 id="sets-heading" className="border-b border-white pb-2 font-mono text-xs uppercase tracking-[0.12em] text-[#00ff9f]">Recent sets</h2>
            <ul>
              {recent.map((a) => {
                const show = showFor(a);
                return (
                  <li key={a.startsAt} className="border-b border-white/25 py-3">
                    {show ? (
                      <Link href={`/shows/${show.slug}?episode=${a.startsAt}`} className="block hover:text-[#00ff9f]">{formatDayKey(todayKey(a.startsAt))} · {a.name} · <span className="font-mono text-xs">tracklist</span></Link>
                    ) : (
                      <span>{formatDayKey(todayKey(a.startsAt))} · {a.name}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </aside>
        )}
      </div>
    </div>
  );
}
