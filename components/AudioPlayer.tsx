"use client";

import { useEffect, useRef, useState } from "react";

function clock(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function AudioPlayer({ src, title, durationHint }: { src: string; title: string; durationHint: number | null }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(durationHint ?? 0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onTime = () => setTime(el.currentTime);
    const onMeta = () => setDuration(el.duration);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onPause);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onPause);
    };
  }, []);

  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) void el.play();
    else el.pause();
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const el = ref.current;
    if (!el) return;
    el.currentTime = Number(e.target.value);
    setTime(el.currentTime);
  };

  const pct = duration ? (time / duration) * 100 : 0;

  return (
    <div className="border-y border-rule bg-paper-deep/60 px-4 py-4 sm:px-5">
      <audio ref={ref} src={src} preload="metadata" />
      <div className="flex items-center gap-4">
        <button
          type="button" onClick={toggle} aria-label={playing ? `Pause ${title}` : `Play ${title}`}
          className="grid size-12 shrink-0 place-items-center rounded-full bg-ink text-paper transition hover:bg-accent"
        >
          {playing ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="2" width="3.5" height="12" /><rect x="9.5" y="2" width="3.5" height="12" /></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2.5v11l9-5.5z" /></svg>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{title}</p>
          <div className="mt-2 flex items-center gap-3 text-xs tabular-nums text-ink-soft">
            <span>{clock(time)}</span>
            <input
              type="range" min={0} max={duration || 0} step={1} value={Math.min(time, duration || 0)} onChange={seek}
              aria-label="Seek" className="h-1 flex-1 cursor-pointer appearance-none rounded-full accent-accent"
              style={{ background: `linear-gradient(to right, var(--accent) ${pct}%, var(--rule) ${pct}%)` }}
            />
            <span>{clock(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
