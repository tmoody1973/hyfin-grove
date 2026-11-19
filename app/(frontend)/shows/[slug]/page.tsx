import config from "@payload-config";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getPayload } from "payload";
import { cache } from "react";
import { ListenLiveButton } from "@/components/listen/ListenLiveButton";
import { PlayRow } from "@/components/listen/PlayRow";
import { StoryList } from "@/components/listen/StoryList";
import { normalizeName, weeklyLabel } from "@/lib/listen/attach";
import { toHostLite, toShowLite } from "@/lib/listen/directory";
import { episodesFor } from "@/lib/listen/episodes";
import { getAirings, getPlays } from "@/lib/listen/rmPlaylist";
import { formatDayKey, formatRange, todayKey } from "@/lib/listen/time";
import { getPostsByShow } from "@/lib/posts";
import type { Host } from "@/payload-types";

const DAY = 86_400_000;
const PAST_EPISODES = 4;

const getShow = cache(async (slug: string) => {
  const { docs } = await (await getPayload({ config })).find({ collection: "shows", where: { slug: { equals: slug } }, limit: 1, depth: 1 });
  return docs[0] ?? null;
});

async function requestTime(): Promise<number> {
  await connection();
  return Date.now();
}

export async function generateMetadata({ params }: PageProps<"/shows/[slug]">): Promise<Metadata> {
  const show = await getShow((await params).slug);
  if (!show) return {};
  return { title: show.name, description: show.description ?? undefined, alternates: { canonical: `/shows/${show.slug}` } };
}

export default async function ShowPage({ params, searchParams }: PageProps<"/shows/[slug]">) {
  const show = await getShow((await params).slug);
  if (!show) notFound();
  const now = await requestTime();
  const lite = toShowLite(show);
  const hosts = (show.hosts ?? []).filter((h): h is Host => typeof h === "object").map(toHostLite);
  const program = lite.cadenceProgramName;

  // Four weeks back for past episodes, one week ahead for the weekly label (35 days: rm-playlist's cap).
  const airings = program ? await getAirings(now - 28 * DAY, now + 7 * DAY) : null;
  const mine = airings?.ok ? airings.value.airings.filter((a) => normalizeName(a.name) === normalizeName(program!)) : [];
  const label = weeklyLabel(mine.filter((a) => a.startsAt > now - DAY));
  const episodes = program ? episodesFor(mine, program, now, PAST_EPISODES + 1) : [];
  const asked = Number((await searchParams).episode);
  const episode = episodes.find((e) => e.startsAt === asked) ?? episodes[0];
  const onNow = episodes[0] && episodes[0].endsAt > now ? episodes[0] : null;
  const [tracks, stories] = await Promise.all([
    episode ? getPlays({ afterMs: episode.startsAt, beforeMs: Math.min(episode.endsAt, now), limit: 200 }) : null,
    getPostsByShow(show.id, 12),
  ]);

  return (
    <div className="mx-auto max-w-[1320px] px-[clamp(20px,4vw,60px)] pt-10">
      <p className="font-mono text-xs text-ink-soft">/shows/{show.slug}</p>
      <h1 className="mt-3 break-words font-display text-[clamp(48px,8vw,104px)] uppercase leading-[0.85] tracking-[-0.02em]">{show.name}</h1>
      {(label || hosts.length > 0) && (
        <p className="mt-4 text-lg">
          {label}
          {label && hosts.length > 0 && " · "}
          {hosts.length > 0 && <>With {hosts.map((h, i) => <span key={h.slug}>{i > 0 && " & "}<Link className="underline underline-offset-2" href={`/hosts/${h.slug}`}>{h.name}</Link></span>)}</>}
        </p>
      )}
      {show.description && <p className="mt-5 max-w-[720px] text-ink-soft">{show.description}</p>}
      {onNow && <div className="mt-6 flex items-center gap-4"><span className="font-mono text-xs uppercase tracking-[0.12em] text-[#ff0040]">On air now</span><ListenLiveButton /></div>}

      <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-14">
          {episode && (
            <section aria-labelledby="episode-heading">
              <div className="flex items-baseline justify-between gap-4 border-b border-white pb-2">
                <h2 id="episode-heading" className="font-display text-3xl uppercase">{episode === episodes[0] ? "Latest episode" : "Episode"}</h2>
                <span className="font-mono text-xs text-ink-soft">{formatDayKey(todayKey(episode.startsAt))} · {formatRange(episode.startsAt, episode.endsAt)}</span>
              </div>
              {!tracks?.ok ? (
                <p className="py-6 text-ink-soft">The tracklist is unavailable right now.</p>
              ) : tracks.value.length === 0 ? (
                <p className="py-6 text-ink-soft">No songs logged for this episode yet.</p>
              ) : (
                <ol>{[...tracks.value].sort((a, b) => a.playedAt - b.playedAt).map((p) => <PlayRow key={p.id} play={p} />)}</ol>
              )}
            </section>
          )}
          {stories.length > 0 && (
            <section aria-labelledby="stories-heading">
              <h2 id="stories-heading" className="border-b border-white pb-2 font-display text-3xl uppercase">Stories</h2>
              <StoryList stories={stories} />
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-10">
          {episodes.length > 1 && (
            <section aria-labelledby="past-heading">
              <h2 id="past-heading" className="border-b border-white pb-2 font-mono text-xs uppercase tracking-[0.12em] text-[#00ff9f]">Past episodes</h2>
              <ul>
                {episodes.map((e) => (
                  <li key={e.startsAt} className="border-b border-white/25 py-3">
                    <Link href={e === episodes[0] ? `/shows/${show.slug}` : `/shows/${show.slug}?episode=${e.startsAt}`} aria-current={e === episode ? "page" : undefined} className="block hover:text-[#00ff9f] aria-[current=page]:text-[#00ff9f]">
                      {formatDayKey(todayKey(e.startsAt))} · <span className="font-mono text-xs">tracklist</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {hosts.length > 0 && (
            <section aria-labelledby="hosts-heading">
              <h2 id="hosts-heading" className="border-b border-white pb-2 font-mono text-xs uppercase tracking-[0.12em] text-[#00ff9f]">Hosted by</h2>
              <ul className="mt-4 flex flex-col gap-4">
                {hosts.map((h) => (
                  <li key={h.slug}>
                    <Link href={`/hosts/${h.slug}`} className="group flex items-center gap-4">
                      {h.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- staff-uploaded host photo
                        <img src={h.photoUrl} alt="" width={72} height={72} loading="lazy" className="size-[72px] border border-white/40 object-cover" />
                      ) : (
                        <span aria-hidden="true" className="size-[72px] border border-white/40 bg-[#1a1a1a]" />
                      )}
                      <span className="font-display text-xl uppercase group-hover:text-[#00ff9f]">{h.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
