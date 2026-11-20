import Link from "next/link";
import { EVENT_TYPES, type EventType } from "@/lib/events/types";

const chip = "inline-flex min-h-11 items-center border px-4 font-mono text-xs uppercase tracking-[0.1em]";

/** "All" plus one chip per event type (plan 9); `hrefFor(null)` clears the filter. */
export function TypeFilter({ current, hrefFor }: { current: EventType | null; hrefFor: (t: EventType | null) => string }) {
  const items: Array<{ value: EventType | null; label: string }> = [{ value: null, label: "All" }, ...EVENT_TYPES.map((t) => ({ value: t.value as EventType, label: t.label }))];
  return (
    <nav aria-label="Event type" className="mt-4 flex flex-wrap gap-2">
      {items.map((t) => (
        <Link
          key={t.value ?? "all"}
          href={hrefFor(t.value)}
          aria-current={current === t.value ? "page" : undefined}
          className={`${chip} ${current === t.value ? "border-[#00ff9f] bg-[#00ff9f] text-black" : "border-white/40 hover:border-[#00ff9f] hover:text-[#00ff9f]"}`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
