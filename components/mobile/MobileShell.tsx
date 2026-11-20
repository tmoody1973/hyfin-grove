"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { InstallInvite } from "@/components/pwa/InstallInvite";
import { MiniPlayer } from "./MiniPlayer";
import { PullToRefresh } from "./PullToRefresh";
import { TabBar } from "./TabBar";

// Konsta's sheet and Motion's drag code load on the first tap of More, not with every page: most visitors never
// open it, and together they were most of phase B's +59 KB first-visit download (measured 2026-11-20).
const MoreSheet = dynamic(() => import("./MoreSheet").then((m) => m.MoreSheet), { ssr: false });

/** The phone's bottom shell (plan 15, phase B): mini-player over the tab bar, plus the More sheet. Hidden from lg up. */
export function MobileShell() {
  const [more, setMore] = useState(false);
  const [sheetLoaded, setSheetLoaded] = useState(false);
  const moreButton = useRef<HTMLButtonElement>(null);
  const openMore = () => {
    setSheetLoaded(true);
    setMore(true);
  };
  return (
    <>
      <PullToRefresh />
      {/* Named so screen transitions slide the page, not the shell (globals.css). */}
      <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden" style={{ viewTransitionName: "app-shell" }}>
        <InstallInvite />
        <MiniPlayer />
        <TabBar moreOpen={more} onMore={openMore} moreRef={moreButton} />
      </div>
      {sheetLoaded && <MoreSheet open={more} onClose={() => setMore(false)} returnFocus={moreButton} />}
    </>
  );
}
