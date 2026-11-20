"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Ref } from "react";
import { activeTab, TABS } from "@/lib/mobile/tabs";

/**
 * The bottom tab bar (mockup 08-phone-app): five equal columns, line icons, mono labels, a white line over the
 * active tab. Plain Tailwind: Konsta's Tabbar needed more overrides than this whole component (plan 15 spike).
 */
export function TabBar({ moreOpen, onMore, moreRef }: { moreOpen: boolean; onMore: () => void; moreRef: Ref<HTMLButtonElement> }) {
  const active = activeTab(usePathname() ?? "/");
  return (
    <nav aria-label="App sections" className="grid grid-cols-5 border-t border-[#555] bg-black px-1 pb-[max(14px,env(safe-area-inset-bottom))]">
      {TABS.map((t) => {
        const lit = moreOpen ? t.id === "more" : t.id === active;
        const cls = `flex min-h-14 flex-col items-center justify-center gap-1 border-t-2 font-mono text-[11px] ${lit ? "border-white text-white" : "border-transparent text-[#b8b8b8]"}`;
        const body = (
          <>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={t.icon} />
            </svg>
            <span>{t.label}</span>
          </>
        );
        return t.href ? (
          <Link key={t.id} href={t.href} aria-current={t.id === active ? "page" : undefined} className={cls}>
            {body}
          </Link>
        ) : (
          <button key={t.id} ref={moreRef} type="button" onClick={onMore} aria-haspopup="dialog" aria-expanded={moreOpen} className={cls}>
            {body}
          </button>
        );
      })}
    </nav>
  );
}
