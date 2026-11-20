"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { SearchHit } from "@/lib/search/query";
import type { SongHit } from "@/lib/search/songs";

type Answer = { hits: SearchHit[]; total: number; fuzzy: boolean; songs: SongHit[] };

const icon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </svg>
);

/**
 * Site search, as you type (plan 12). `variant="header"`: the desktop header's button, which also answers the "/" key.
 * `variant="phone"`: the phone top bar's square button (mockup 08-phone-app). Enter, or "See all", opens /search.
 */
export function SearchPanel({ variant }: { variant: "header" | "phone" }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [active, setActive] = useState(-1);
  const [failed, setFailed] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const id = useId();

  useEffect(() => {
    if (variant !== "header") return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key === "/" && !open && !(t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))) {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, variant]);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/site-search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((a: Answer | null) => {
          setAnswer(a);
          setFailed(a === null); // busy (too many searches) or down: the full search still works
          setActive(-1);
        })
        .catch((e: unknown) => {
          if ((e as { name?: string })?.name !== "AbortError") setFailed(true);
        });
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  const items = [...(answer?.hits ?? []).map((h) => ({ href: h.href, label: h.label, title: h.title })), ...(answer?.songs ?? []).map((s) => ({ href: s.href, label: "Song", title: `${s.title} · ${s.artist}` }))];
  const showing = q.trim().length >= 2 && answer;
  const all = `/search?q=${encodeURIComponent(q.trim())}`;
  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const button =
    variant === "header" ? (
      <button ref={trigger} type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className="inline-flex min-h-11 items-center gap-2 font-mono text-xs uppercase tracking-[0.1em] hover:text-[#00ff9f]">
        {icon}
        Search
        <kbd className="border border-white/40 px-1.5 font-mono text-[10px] text-ink-soft">/</kbd>
      </button>
    ) : (
      <button ref={trigger} type="button" onClick={() => setOpen(true)} aria-label="Search" aria-haspopup="dialog" className="ml-auto grid size-11 shrink-0 place-items-center border border-white">
        {icon}
      </button>
    );

  return (
    <>
      {button}
      {open && (
        <div role="dialog" aria-modal="true" aria-label="Search HYFIN" className="fixed inset-0 z-[60] bg-black/85 px-[clamp(16px,4vw,60px)] pt-[max(16px,env(safe-area-inset-top))]" onClick={(e) => e.target === e.currentTarget && close()}>
          <div className="mx-auto mt-4 max-w-[760px] border border-white bg-black p-4">
            <form
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                if (active >= 0 && items[active]) go(items[active].href);
                else if (q.trim().length >= 2) go(all);
              }}
              className="flex items-center gap-3"
            >
              <label htmlFor={`${id}-q`} className="sr-only">Search HYFIN</label>
              <input
                ref={input}
                id={`${id}-q`}
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") return close();
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActive((a) => Math.min(a + 1, items.length - 1));
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActive((a) => Math.max(a - 1, -1));
                  }
                }}
                placeholder="Artists, shows, stories, events…"
                autoComplete="off"
                maxLength={100}
                role="combobox"
                aria-expanded={Boolean(showing)}
                aria-controls={`${id}-list`}
                aria-activedescendant={active >= 0 ? `${id}-opt-${active}` : undefined}
                className="h-12 min-w-0 flex-1 border border-white bg-black px-3 text-[17px] text-white focus:border-[#00ff9f] focus:outline-none"
              />
              <button type="button" onClick={close} className="min-h-11 px-2 font-mono text-xs uppercase tracking-[0.1em] text-ink-soft">Close</button>
            </form>
            <p role="status" className="sr-only">{showing ? `${answer.total} results` : ""}</p>
            {showing && (
              <ul id={`${id}-list`} role="listbox" className="m-0 mt-3 max-h-[60vh] list-none overflow-y-auto p-0">
                {items.map((it, i) => (
                  <li key={`${it.href}-${i}`} id={`${id}-opt-${i}`} role="option" aria-selected={i === active}>
                    <Link href={it.href} onClick={() => setOpen(false)} className={`flex min-h-12 items-baseline gap-3 border-b border-white/20 px-2 py-2.5 ${i === active ? "bg-white/10" : ""} hover:text-[#00ff9f]`}>
                      <span className="w-16 shrink-0 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft">{it.label}</span>
                      <span className="min-w-0 text-[16px] leading-snug">{it.title}</span>
                    </Link>
                  </li>
                ))}
                {items.length === 0 && <li className="px-2 py-3 text-ink-soft">Nothing found. Try an artist, a show or a DJ.</li>}
              </ul>
            )}
            {failed && q.trim().length >= 2 && <p className="m-0 mt-3 text-ink-soft">Press Enter to see all results.</p>}
            {showing && (
              <Link href={all} onClick={() => setOpen(false)} className="mt-3 inline-flex min-h-11 items-center font-mono text-xs uppercase tracking-[0.1em] underline underline-offset-4">
                See all results{answer.fuzzy ? " (including close matches)" : ""}
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
