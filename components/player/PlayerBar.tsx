"use client";

import { Button } from "@ui-sdk/react/button";
import { Slider, SliderControl, SliderIndicator, SliderThumb, SliderTrack } from "@ui-sdk/react/slider";
import Link from "next/link";
import { useNowPlaying } from "@/lib/nowPlaying";
import { usePlayer } from "./PlayerProvider";

const clock = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;

const track = "relative h-1 w-full bg-[#555]";
const thumb = "absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 bg-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#00ff9f]";

/** The sticky on-air bar from the homepage mockup (#listen strip). */
export function PlayerBar() {
  const { state, play, pause, resume, seek, volume, setVolume, time, duration } = usePlayer();
  const nowPlaying = useNowPlaying();
  const isPlaying = state.status === "playing" || state.status === "loading";
  const isStory = state.source.kind === "story";

  const toggle = () => {
    if (isPlaying) pause();
    else if (state.status === "paused") resume();
    else play(state.source);
  };

  return (
    <div id="listen" className="sticky top-0 z-10 border-b border-white bg-black px-[clamp(20px,4vw,60px)] py-3 text-white">
      <div className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-x-7 gap-y-3">
        <div className="flex min-w-0 flex-[1_1_300px] items-center gap-4">
          <Button
            onClick={toggle}
            aria-label={isPlaying ? "Pause" : isStory ? "Play story" : "Play HYFIN live"}
            className="grid size-[52px] shrink-0 place-items-center bg-[#ff0040] text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00ff9f]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d={isPlaying ? "M6 4h4v16H6zM14 4h4v16h-4z" : "M7 4l14 8-14 8z"} />
            </svg>
          </Button>
          <div className="flex min-w-0 flex-col gap-0.5" aria-live="polite">
            <div className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#ff0040]">
              <span aria-hidden="true" className={`size-2 bg-[#ff0040] ${state.status === "playing" ? "animate-pulse" : ""}`} />
              <span>{state.error ?? (isStory ? "Now playing" : "On air now")}</span>
            </div>
            <div className="truncate text-[19px] leading-tight">
              {state.source.kind === "story" ? (
                <Link href={state.source.href} className="font-semibold hover:underline">{state.source.title}</Link>
              ) : nowPlaying ? (
                <>
                  <strong className="font-semibold">{nowPlaying.title}</strong> <span className="text-[#b8b8b8]">{nowPlaying.artist}</span>
                </>
              ) : (
                <strong className="font-semibold">HYFIN</strong>
              )}
            </div>
          </div>
        </div>

        {isStory && (
          <Button
            onClick={() => play({ kind: "live" })}
            className="inline-flex min-h-11 items-center gap-2 border border-[#ff0040] px-3.5 font-mono text-xs font-semibold uppercase tracking-[0.08em] text-[#ff0040] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00ff9f]"
          >
            <span aria-hidden="true" className="size-2 bg-[#ff0040]" />
            Back to live
          </Button>
        )}

        {isStory && (
          <div className="flex min-w-[220px] flex-[1_1_260px] items-center gap-3 font-mono text-xs text-[#b8b8b8]">
            <span>{clock(time)}</span>
            <Slider value={time} onValueChange={(v) => seek(v as number)} min={0} max={duration || 1} step={1} disabled={!duration} className="flex-1">
              <SliderControl className="flex h-6 items-center">
                <SliderTrack className={track}>
                  <SliderIndicator className="absolute h-full bg-[#ff0040]" />
                  <SliderThumb aria-label="Seek" className={thumb} />
                </SliderTrack>
              </SliderControl>
            </Slider>
            <span>{clock(duration)}</span>
          </div>
        )}

        <div className="ml-auto flex w-32 items-center">
          <Slider value={volume} onValueChange={(v) => setVolume(v as number)} min={0} max={1} step={0.05} className="w-full">
            <SliderControl className="flex h-6 items-center">
              <SliderTrack className={track}>
                <SliderIndicator className="absolute h-full bg-white" />
                <SliderThumb aria-label="Volume" className={thumb} />
              </SliderTrack>
            </SliderControl>
          </Slider>
        </div>
      </div>
    </div>
  );
}
