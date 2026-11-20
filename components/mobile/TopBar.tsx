"use client";

import { usePathname, useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { SiteLogo } from "@/components/brand/SiteLogo";
import { isStandalone, serverFalse, subscribeStandalone } from "@/lib/mobile/standalone";
import { sectionLabel, TABS } from "@/lib/mobile/tabs";

/**
 * The phone's top bar (mockup 08-phone-app: "HYFIN /mke"). In the installed app there's no browser back button,
 * so inner pages get one. Search joins when plan 12 (site search) ships.
 */
export function TopBar() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const installed = useSyncExternalStore(subscribeStandalone, isStandalone, serverFalse);
  const inner = !TABS.some((t) => t.href === pathname);
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-white bg-black px-4 pb-2.5 pt-[max(10px,env(safe-area-inset-top))] lg:hidden" style={{ viewTransitionName: "app-top" }}>
      {installed && inner && (
        <button
          type="button"
          aria-label="Back"
          onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
          className="grid size-11 shrink-0 place-items-center border border-white"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
      )}
      <div className="flex min-h-11 items-center gap-2.5">
        <SiteLogo className="h-7" />
        <span className="font-mono text-[10px] tracking-[0.08em] text-ink-soft">{sectionLabel(pathname)}</span>
      </div>
    </header>
  );
}
