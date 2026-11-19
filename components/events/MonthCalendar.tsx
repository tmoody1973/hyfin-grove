import Link from "next/link";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const monthLabel = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", year: "numeric" });

/** The mockup's month grid: days with shows link to that day in the list; today is marked. */
export function MonthCalendar({ month, showDays, today, prevHref, nextHref }: { month: string; showDays: Set<string>; today: string; prevHref: string | null; nextHref: string | null }) {
  const [y, m] = month.split("-").map(Number);
  const firstWeekday = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells = [...Array(firstWeekday).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const nav = "grid size-11 place-items-center border border-white";
  return (
    <section aria-label="Calendar">
      <div className="flex items-center justify-between gap-3">
        {prevHref ? <Link href={prevHref} className={nav} aria-label="Previous month">←</Link> : <span className={`${nav} opacity-30`} aria-hidden="true">←</span>}
        <h2 className="whitespace-nowrap font-display text-xl uppercase">{monthLabel.format(Date.UTC(y, m - 1, 1))}</h2>
        {nextHref ? <Link href={nextHref} className={nav} aria-label="Next month">→</Link> : <span className={`${nav} opacity-30`} aria-hidden="true">→</span>}
      </div>
      <div className="mt-5 grid grid-cols-7 gap-1.5 text-center font-mono text-xs">
        {WEEKDAYS.map((d, i) => <span key={i} className="py-1 text-ink-soft" aria-hidden="true">{d}</span>)}
        {cells.map((d, i) => {
          if (d === null) return <span key={`b${i}`} />;
          const key = `${month}-${String(d).padStart(2, "0")}`;
          const has = showDays.has(key);
          const cls = `grid aspect-square place-items-center border ${key === today ? "border-white bg-white text-black" : has ? "border-[#ff0040] text-[#ff0040]" : "border-white/20 text-ink-soft"}`;
          return has ? <a key={key} href={`#day-${key}`} className={`${cls} hover:bg-[#ff0040] hover:text-black`} aria-label={`Shows on ${key}`}>{d}</a> : <span key={key} className={cls}>{d}</span>;
        })}
      </div>
      <p className="mt-4 flex gap-5 font-mono text-[11px] text-ink-soft">
        <span><span className="mr-1.5 inline-block size-2.5 bg-white align-middle" />Today</span>
        <span><span className="mr-1.5 inline-block size-2.5 border border-[#ff0040] align-middle" />Has shows</span>
      </p>
    </section>
  );
}
