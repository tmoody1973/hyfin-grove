import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ListenHeader } from "@/components/listen/ListenHeader";
import { normalizeName, weeklyLabel } from "@/lib/listen/attach";
import { getDirectory, toShowLite } from "@/lib/listen/directory";
import { getAirings } from "@/lib/listen/rmPlaylist";

export const metadata: Metadata = { title: "Shows", description: "HYFIN's shows and series.", alternates: { canonical: "/shows" } };

async function requestTime(): Promise<number> {
  await connection();
  return Date.now();
}

export default async function ShowsPage() {
  const now = await requestTime();
  const [{ shows }, week] = await Promise.all([getDirectory(), getAirings(now, now + 7 * 86_400_000)]);
  const airings = week.ok ? week.value.airings : [];
  const items = shows.map(toShowLite).map((s) => ({
    ...s,
    label: s.cadenceProgramName ? weeklyLabel(airings.filter((a) => normalizeName(a.name) === normalizeName(s.cadenceProgramName!))) : null,
  }));
  return (
    <div className="mx-auto max-w-[1320px] px-[clamp(20px,4vw,60px)] pt-10">
      <ListenHeader path="/shows" title="Shows" lede="The shows and series on HYFIN." active="shows" />
      <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((s) => (
          <li key={s.slug}>
            <Link href={`/shows/${s.slug}`} className="group block border border-white p-4">
              {s.artworkUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- staff-uploaded show art
                <img src={s.artworkUrl} alt="" width={400} height={400} loading="lazy" className="aspect-square w-full border border-white/40 object-cover" />
              ) : (
                <span aria-hidden="true" className="block aspect-square w-full border border-white/40 bg-[#1a1a1a]" />
              )}
              <span className="mt-4 block font-display text-2xl uppercase leading-none group-hover:text-[#00ff9f]">{s.name}</span>
              {s.label && <span className="mt-2 block font-mono text-xs text-ink-soft">{s.label}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
