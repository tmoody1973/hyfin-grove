"use client";

import { useState } from "react";

/** Share a story or event: the phone's own share sheet where there is one, else copy the link (plan 15, task 7). */
export function ShareButton({ title, path }: { title: string; path: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = new URL(path, window.location.origin).href;
    if (navigator.share) {
      await navigator.share({ title, url }).catch(() => undefined); // closing the sheet isn't an error
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link", url);
    }
  };
  return (
    <button type="button" onClick={share} className="inline-flex min-h-11 items-center gap-2 border border-white px-3.5 font-mono text-xs uppercase tracking-[0.1em] hover:text-[#00ff9f]">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3v12M8 7l4-4 4 4M5 11v9h14v-9" />
      </svg>
      <span aria-live="polite">{copied ? "Link copied" : "Share"}</span>
    </button>
  );
}
