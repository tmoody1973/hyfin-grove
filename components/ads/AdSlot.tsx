"use client";

import { useEffect, useId, useState, type CSSProperties } from "react";
import type { ActiveSlot } from "@/lib/ads/slots";

// The few Google Publisher Tag calls used here (https://developers.google.com/publisher-tag/reference).
type GptSlot = { defineSizeMapping(m: unknown): GptSlot; setTargeting(k: string, v: string): GptSlot; addService(s: unknown): GptSlot };
type RenderEnded = { slot: GptSlot; isEmpty: boolean };
type PubAds = {
  enableLazyLoad(o: object): void; enableSingleRequest(): void; collapseEmptyDivs(): void; disableInitialLoad(): void;
  refresh(slots: GptSlot[]): void;
  addEventListener(e: "slotRenderEnded", f: (ev: RenderEnded) => void): void;
  removeEventListener(e: "slotRenderEnded", f: (ev: RenderEnded) => void): void;
};
type GoogleTag = {
  cmd: { push(f: () => void): void };
  pubads(): PubAds; enableServices(): void; display(id: string): void; destroySlots(s: GptSlot[]): void;
  defineSlot(path: string, sizes: number[][], id: string): GptSlot | null;
  sizeMapping(): { addSize(view: number[], sizes: number[][]): ReturnType<GoogleTag["sizeMapping"]>; build(): unknown };
};
declare global {
  interface Window { googletag?: GoogleTag }
}

const GPT = "https://securepubads.g.doubleclick.net/tag/js/gpt.js";
const DESKTOP_FROM = 768; // Tailwind's md breakpoint, so the reserved height and the ad size switch together
let configured = false;
let blocked = false; // the tag failed to load (an ad blocker, usually): spots collapse

/** Google's tag, added once per visit, with radiomilwaukee.org's settings (issue #22). */
function googletag(onBlocked: () => void): GoogleTag {
  window.googletag ??= { cmd: [] } as unknown as GoogleTag;
  let script = document.getElementById("gpt-js") as HTMLScriptElement | null;
  if (!script) {
    script = Object.assign(document.createElement("script"), { id: "gpt-js", async: true, src: GPT });
    script.addEventListener("error", () => { blocked = true; });
    document.head.append(script);
  }
  script.addEventListener("error", onBlocked);
  return window.googletag;
}

/**
 * One Ad Manager spot (issue #22): a black box with a mono label; the ad itself is Google's, untouched. Its height is
 * reserved before the ad arrives; the box disappears when Google has nothing for it or the tag is blocked. The slot
 * is destroyed on unmount, since the site changes pages without reloading.
 */
export function AdSlot({ slot, page }: { slot: ActiveSlot; page: string }) {
  const id = `ad-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const [empty, setEmpty] = useState(() => blocked); // tag already failed on an earlier page: no box at all
  const { path } = slot;
  const [dw, dh] = slot.desktop;
  const [mw, mh] = slot.mobile;

  useEffect(() => {
    if (blocked) return;
    const hide = () => setEmpty(true);
    const gt = googletag(hide);
    let defined: GptSlot | null = null;
    let cancelled = false;
    const onRender = (e: RenderEnded) => { if (e.slot === defined) setEmpty(e.isEmpty); };
    gt.cmd.push(() => {
      if (cancelled) return;
      const ads = gt.pubads();
      if (!configured) {
        ads.enableLazyLoad({ fetchMarginPercent: 100, renderMarginPercent: 100, mobileScaling: 1 });
        ads.enableSingleRequest();
        ads.collapseEmptyDivs();
        ads.disableInitialLoad();
        gt.enableServices();
        configured = true;
      }
      const desktop = [dw, dh];
      const mobile = [mw, mh];
      defined = gt.defineSlot(path, [desktop, mobile], id);
      if (!defined) return;
      defined
        .defineSizeMapping(gt.sizeMapping().addSize([DESKTOP_FROM, 0], [desktop]).addSize([0, 0], [mobile]).build())
        .setTargeting("site", "hyfin")
        .setTargeting("page", page)
        .addService(ads);
      ads.addEventListener("slotRenderEnded", onRender);
      gt.display(id);
      ads.refresh([defined]);
    });
    return () => {
      cancelled = true;
      document.getElementById("gpt-js")?.removeEventListener("error", hide);
      gt.cmd.push(() => {
        gt.pubads().removeEventListener("slotRenderEnded", onRender);
        if (defined) gt.destroySlots([defined]);
      });
    };
  }, [id, path, page, dw, dh, mw, mh]); // numbers, not arrays: a re-render with equal sizes must not re-request

  if (empty) return null;
  const reserve = { "--ad-m": `${mh}px`, "--ad-d": `${dh}px` } as CSSProperties;
  return (
    <aside aria-label="Advertisement" className="border-y border-white/30 py-3">
      <p className="m-0 mb-2 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-ink-soft">{slot.label ?? "Advertisement"}</p>
      <div id={id} style={reserve} className="flex min-h-[var(--ad-m)] items-center justify-center md:min-h-[var(--ad-d)]" />
    </aside>
  );
}
