"use client";

import { useEffect, useState } from "react";
import { STABLE_KEY } from "@/lib/signal";

/**
 * Concept slide 6: "A Stabilize switch calms every effect." Sets data-stable on <html>; the CSS in globals.css turns
 * every glitch off under it. STABLE_SCRIPT (layout) applies a saved choice before first paint; this mirrors it.
 */
export function StabilizeSwitch() {
  const [stable, setStable] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- read once from the attribute the pre-paint script set
  useEffect(() => setStable(document.documentElement.hasAttribute("data-stable")), []);

  function toggle() {
    const next = !stable;
    document.documentElement.toggleAttribute("data-stable", next);
    try {
      localStorage.setItem(STABLE_KEY, next ? "1" : "0");
    } catch {
      // Storage blocked (private mode): the choice lasts for this page only.
    }
    setStable(next);
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={stable}
      onClick={toggle}
      className="inline-flex min-h-11 items-center gap-2.5 border border-white px-3.5 font-mono text-xs uppercase tracking-[0.1em]"
    >
      <span aria-hidden className={`flex h-4 w-[34px] border border-white p-0.5 ${stable ? "justify-end" : "justify-start"}`}>
        <span className={`h-2.5 w-2.5 ${stable ? "bg-[#00ff9f]" : "bg-white"}`} />
      </span>
      Stabilize
    </button>
  );
}
