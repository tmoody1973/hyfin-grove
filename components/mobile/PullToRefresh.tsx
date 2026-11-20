"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { pullState } from "@/lib/mobile/pullToRefresh";
import { isStandalone, serverFalse, subscribeStandalone } from "@/lib/mobile/standalone";

/**
 * Pull down from the top to refresh, in the installed app only (iOS gives home-screen web apps none, so news would go
 * stale). Starts only at the very top of the page, ignores sideways swipes (the Latest row) and the open More sheet.
 */
export function PullToRefresh() {
  const installed = useSyncExternalStore(subscribeStandalone, isStandalone, serverFalse);
  const router = useRouter();
  const [travel, setTravel] = useState(0);
  const [refreshing, refresh] = useTransition();

  useEffect(() => {
    if (!installed) return;
    let start: { x: number; y: number } | null = null;
    let last = 0;
    const down = (e: TouchEvent) => {
      const sheetOpen = document.querySelector('[role="dialog"]:not([inert])');
      start = window.scrollY <= 0 && !sheetOpen ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
      last = 0;
    };
    const move = (e: TouchEvent) => {
      if (!start) return;
      const dy = e.touches[0].clientY - start.y;
      if (Math.abs(e.touches[0].clientX - start.x) > Math.abs(dy)) {
        start = null; // a sideways swipe, not a pull
        setTravel(0);
        return;
      }
      last = dy;
      setTravel(dy);
    };
    const up = () => {
      if (start && pullState(last).ready) refresh(() => router.refresh());
      start = null;
      setTravel(0);
    };
    window.addEventListener("touchstart", down, { passive: true });
    window.addEventListener("touchmove", move, { passive: true });
    window.addEventListener("touchend", up);
    window.addEventListener("touchcancel", up);
    return () => {
      window.removeEventListener("touchstart", down);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
      window.removeEventListener("touchcancel", up);
    };
  }, [installed, router]);

  const { offset, ready } = pullState(travel);
  if (!installed || (offset === 0 && !refreshing)) return null;
  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+72px)] z-20 flex justify-center lg:hidden"
      style={{ transform: `translateY(${refreshing ? 24 : offset - 40}px)` }}
    >
      <span className="border border-white bg-black px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.1em]">
        {refreshing ? "Refreshing…" : ready ? "Release to refresh" : "Pull to refresh"}
      </span>
    </div>
  );
}
