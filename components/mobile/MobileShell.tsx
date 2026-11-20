"use client";

import { useRef, useState } from "react";
import { MiniPlayer } from "./MiniPlayer";
import { MoreSheet } from "./MoreSheet";
import { TabBar } from "./TabBar";

/** The phone's bottom shell (plan 15, phase B): mini-player over the tab bar, plus the More sheet. Hidden from lg up. */
export function MobileShell() {
  const [more, setMore] = useState(false);
  const moreButton = useRef<HTMLButtonElement>(null);
  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
        <MiniPlayer />
        <TabBar moreOpen={more} onMore={() => setMore(true)} moreRef={moreButton} />
      </div>
      <MoreSheet open={more} onClose={() => setMore(false)} returnFocus={moreButton} />
    </>
  );
}
