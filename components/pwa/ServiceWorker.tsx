"use client";

import { useEffect, useState } from "react";

/**
 * Registers /sw.js in production (plan 15, task 2) and offers updates. A new version waits until the visitor taps
 * "Refresh": the page never reloads on its own, so the stream is never cut off mid-song.
 */
export function ServiceWorker() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    let reg: ServiceWorkerRegistration | undefined;
    const offer = (w: ServiceWorker | null) => {
      if (w && navigator.serviceWorker.controller) setWaiting(w); // controller: not the very first install
    };
    const recheck = () => {
      if (document.visibilityState === "visible") reg?.update().catch(() => undefined);
    };
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((r) => {
        reg = r;
        offer(r.waiting);
        r.addEventListener("updatefound", () => {
          const next = r.installing;
          next?.addEventListener("statechange", () => {
            if (next.state === "installed") offer(next);
          });
        });
      })
      .catch(() => undefined); // no worker means a normal website, nothing else breaks
    document.addEventListener("visibilitychange", recheck);
    return () => document.removeEventListener("visibilitychange", recheck);
  }, []);

  if (!waiting) return null;
  const refresh = () => {
    navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), { once: true });
    waiting.postMessage({ type: "SKIP_WAITING" });
  };
  return (
    <div role="status" className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-[520px] items-center justify-between gap-4 border border-white bg-black p-4 font-mono text-xs uppercase tracking-[0.1em]">
      <span>New version of HYFIN</span>
      <span className="flex gap-2">
        <button type="button" onClick={() => setWaiting(null)} className="min-h-11 px-3 text-ink-soft">Later</button>
        <button type="button" onClick={refresh} className="sg-btn min-h-11 bg-[#00ff9f] px-4 font-semibold text-black">Refresh</button>
      </span>
    </div>
  );
}
