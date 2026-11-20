"use client";

import { KonstaProvider, Sheet } from "konsta/react";
import { domMax, LazyMotion, m } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type RefObject, useEffect, useEffectEvent, useRef, useState } from "react";
import { StabilizeSwitch } from "@/components/brand/StabilizeSwitch";

const LINKS = [
  ["Music", "/music"],
  ["Culture", "/culture"],
  ["Events", "/events"],
  ["Shows", "/shows"],
  ["Schedule", "/listen/schedule"],
  ["Support", "/support"],
  ["Newsletter", "/newsletter"],
] as const;

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The tab bar's "More" (plan 15, task 3): Konsta's bottom sheet (backdrop, slide, safe areas), restyled to Signal,
 * with Motion's drag-to-close. Focus stays inside while open; Escape, a tap outside, a downward swipe or a page
 * change closes it, and focus returns to the More button.
 */
export function MoreSheet({ open, onClose, returnFocus }: { open: boolean; onClose: () => void; returnFocus: RefObject<HTMLButtonElement | null> }) {
  const panel = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const close = useEffectEvent(() => onClose());
  // Loaded on the first tap: mount closed, then open on the next frame so the sheet still slides in.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const shown = open && ready;

  // Close when the visitor navigates (not when the sheet first mounts, which happens on the opening tap).
  const shownAt = useRef(pathname);
  useEffect(() => {
    if (pathname !== shownAt.current) {
      shownAt.current = pathname;
      close();
    }
  }, [pathname]);

  useEffect(() => {
    if (!shown) return;
    const el = panel.current;
    el?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return close();
      if (e.key !== "Tab" || !el) return;
      const items = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const back = returnFocus.current;
    return () => {
      document.removeEventListener("keydown", onKey);
      back?.focus();
    };
  }, [shown, returnFocus]);

  return (
    <KonstaProvider theme="ios" dark>
      <Sheet opened={shown} onBackdropClick={onClose} className="hyfin-sheet dark lg:hidden" colors={{ bgIos: "bg-black" }}>
        <LazyMotion features={domMax} strict>
          <m.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label="More"
            inert={!shown}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 80 || info.velocity.y > 500) onClose();
            }}
            className="border-t border-white px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-2 text-white"
          >
            <div aria-hidden className="mx-auto mb-2 h-1 w-10 bg-[#555]" />
            <nav aria-label="More sections">
              <ul className="m-0 list-none p-0">
                {LINKS.map(([label, href]) => (
                  <li key={href} className="border-b border-white/25">
                    <Link href={href} className="flex min-h-12 items-center font-mono text-xs uppercase tracking-[0.1em] active:text-[#00ff9f]">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <StabilizeSwitch />
              <Link href="/staff/add-event" rel="nofollow" className="inline-flex min-h-11 items-center font-mono text-[11px] uppercase tracking-[0.1em] text-ink-soft">
                Add an event · staff only
              </Link>
            </div>
          </m.div>
        </LazyMotion>
      </Sheet>
    </KonstaProvider>
  );
}
