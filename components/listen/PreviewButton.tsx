"use client";

import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import { useEffect, useState } from "react";
import { useOptionalPlayer } from "@/components/player/PlayerProvider";
import { previewPlayer, type PreviewState } from "@/lib/listen/previewPlayer";

const CONVEX_URL = process.env.NEXT_PUBLIC_RM_PLAYLIST_CONVEX_URL ?? "";

/** Looks up a preview rm-playlist hasn't cached yet (its public action; the URL is then cached for everyone). */
async function resolvePreview(appleMusicSongId: string): Promise<string | null> {
  if (!CONVEX_URL) return null;
  const r = (await new ConvexHttpClient(CONVEX_URL).action(anyApi.preview.resolvePreviewUrl, { appleMusicSongId })) as { previewUrl: string | null };
  return r.previewUrl;
}

/** Plays a 30-second Apple Music preview, pausing the live stream and resuming it afterwards. */
export function PreviewButton({ appleMusicSongId, previewUrl, label }: { appleMusicSongId: string; previewUrl: string | null; label: string }) {
  const [state, setState] = useState<PreviewState>({ kind: "idle" });
  const player = useOptionalPlayer();
  useEffect(() => previewPlayer().subscribe(setState), []);

  const mine = state.kind !== "idle" && state.id === appleMusicSongId;
  const active = mine && (state.kind === "loading" || state.kind === "playing");

  const onClick = async () => {
    const preview = previewPlayer();
    if (active) return preview.stop();
    const url = previewUrl ?? (await resolvePreview(appleMusicSongId).catch(() => null));
    if (!url) return;
    const liveWasPlaying = player && (player.state.status === "playing" || player.state.status === "loading");
    if (liveWasPlaying) player.pause();
    await preview.play(appleMusicSongId, url, liveWasPlaying ? () => player.resume() : undefined);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={active ? `Stop the preview of ${label}` : `Play a 30-second preview of ${label}`}
      aria-pressed={active}
      className={`grid size-11 shrink-0 place-items-center rounded-full border ${mine && state.kind === "error" ? "border-[#ff0040] text-[#ff0040]" : "border-white/40 hover:border-[#00ff9f] hover:text-[#00ff9f]"}`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d={active ? "M6 6h12v12H6z" : "M8 5l12 7-12 7z"} />
      </svg>
    </button>
  );
}
