import Link from "next/link";

const TABS = [
  { key: "playlist", href: "/listen/playlist", label: "Playlist" },
  { key: "schedule", href: "/listen/schedule", label: "Schedule" },
  { key: "shows", href: "/shows", label: "Shows" },
] as const;

/** Playlist · Schedule · Shows tabs from the Listen mockups. */
export function ListenNav({ active }: { active: (typeof TABS)[number]["key"] }) {
  return (
    <nav aria-label="Listen" className="flex">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.key === active ? "page" : undefined}
          className={`-ml-px inline-flex min-h-11 items-center border border-white px-4 font-mono text-xs uppercase tracking-[0.1em] first:ml-0 ${t.key === active ? "bg-white text-black" : "hover:text-[#00ff9f]"}`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
