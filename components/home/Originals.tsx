import Link from "next/link";

export type OriginalShow = { slug: string; name: string; slot: string | null };

/** HYFIN's own shows (mockup homepage.html "Originals"): numbered frames, weekly slot when on the schedule. */
export function Originals({ shows }: { shows: OriginalShow[] }) {
  if (shows.length === 0) return null;
  return (
    <section aria-labelledby="originals" className="flex flex-col gap-7">
      <div className="flex items-baseline gap-4 border-t border-white pt-[22px]">
        <span className="font-mono text-[13px] text-ink-soft">03</span>
        <h2 id="originals" className="m-0 font-display text-[clamp(34px,4.4vw,60px)] uppercase leading-none tracking-[-0.02em]">
          Originals
        </h2>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))] gap-6">
        {shows.map((s, i) => (
          <Link key={s.slug} href={`/shows/${s.slug}`} className="flex min-h-[180px] flex-col gap-3 border border-white p-5 hover:bg-white hover:text-black">
            <span className="font-mono text-xs opacity-70">{String(i + 1).padStart(2, "0")}</span>
            <span className="font-display text-[26px] uppercase leading-[1.05]">{s.name}</span>
            {s.slot && <span className="mt-auto font-mono text-xs opacity-70">{s.slot}</span>}
          </Link>
        ))}
      </div>
    </section>
  );
}
