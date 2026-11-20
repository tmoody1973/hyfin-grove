"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePlayer } from "@/components/player/PlayerProvider";
import { installPlatform, shouldInvite } from "@/lib/pwa/installInvite";
import { isStandalone, serverFalse, subscribeStandalone } from "@/lib/mobile/standalone";

type InstallPrompt = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const VISITS = "hyfin-visits";
const COUNTED = "hyfin-visit-counted";
const DISMISSED = "hyfin-install-dismissed";
const noop = () => () => {};
const read = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};

/**
 * "Add HYFIN to your home screen" (plan 15, task 8): a slim card above the mini-player, never a pop-up and never on a
 * first look (second visit, or after a minute of listening). iPhone Safari gets the two steps; Android Chrome gets its
 * own install prompt. "Not now" holds for 30 days.
 */
export function InstallInvite() {
  const hydrated = useSyncExternalStore(noop, () => true, serverFalse);
  const installed = useSyncExternalStore(subscribeStandalone, isStandalone, serverFalse);
  const { state } = usePlayer();
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [listened, setListened] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [steps, setSteps] = useState(false);
  const [now] = useState(() => Date.now()); // once per page: "is a 30-day dismissal still in force?"

  // Count each browser session once as a visit.
  useEffect(() => {
    try {
      if (sessionStorage.getItem(COUNTED)) return;
      sessionStorage.setItem(COUNTED, "1");
      localStorage.setItem(VISITS, String(Number(localStorage.getItem(VISITS) ?? 0) + 1));
    } catch {
      // private mode: no invite, nothing breaks
    }
  }, []);
  useEffect(() => {
    const keep = (e: Event) => {
      e.preventDefault(); // we offer it in our own card instead of the browser's banner
      setPrompt(e as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", keep);
    return () => window.removeEventListener("beforeinstallprompt", keep);
  }, []);
  useEffect(() => {
    if (state.status !== "playing") return;
    const t = setInterval(() => setListened((s) => s + 5), 5000);
    return () => clearInterval(t);
  }, [state.status]);

  if (!hydrated || dismissed) return null;
  const platform = installPlatform(navigator.userAgent, prompt !== null);
  const dismissedAt = Number(read(DISMISSED)) || null;
  if (!shouldInvite({ installed, platform, visits: Number(read(VISITS) ?? 0), listenedSeconds: listened, dismissedAt, now })) return null;

  const notNow = () => {
    try {
      localStorage.setItem(DISMISSED, String(Date.now()));
    } catch {}
    setDismissed(true);
  };
  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice.catch(() => null);
    setPrompt(null);
    setDismissed(true);
  };
  const btn = "inline-flex min-h-11 items-center px-3 font-mono text-[11px] font-semibold uppercase tracking-[0.08em]";
  return (
    <section aria-label="Install HYFIN" className="border-t border-white bg-black px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="m-0 min-w-0 text-[14px] leading-snug">
          <strong className="font-semibold">Add HYFIN to your home screen.</strong> <span className="text-ink-soft">Full screen, one tap to the stream.</span>
        </p>
        <div className="flex shrink-0 gap-1">
          <button type="button" onClick={notNow} className={`${btn} text-ink-soft`}>Not now</button>
          {platform === "prompt" ? (
            <button type="button" onClick={install} className={`${btn} sg-btn bg-[#00ff9f] text-black`}>Install</button>
          ) : (
            <button type="button" onClick={() => setSteps((v) => !v)} aria-expanded={steps} className={`${btn} sg-btn bg-[#00ff9f] text-black`}>How</button>
          )}
        </div>
      </div>
      {steps && (
        <ol className="m-0 mt-3 flex list-decimal flex-col gap-1.5 pl-5 text-[14px]">
          <li>
            Tap{" "}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline align-[-2px]" aria-label="Share">
              <path d="M12 3v12M8 7l4-4 4 4M5 11v9h14v-9" />
            </svg>{" "}
            Share in Safari&rsquo;s toolbar.
          </li>
          <li>Choose &ldquo;Add to Home Screen&rdquo;.</li>
        </ol>
      )}
    </section>
  );
}
