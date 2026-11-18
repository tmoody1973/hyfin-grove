"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { initialPlayerState, isRealPlayFailure, needsSrcReset, playerReducer, type PlayerState, type Source } from "./playerState";

const STREAM_URL = process.env.NEXT_PUBLIC_HYFIN_STREAM_URL ?? "";

type Player = {
  state: PlayerState;
  play(source: Source): void;
  pause(): void;
  resume(): void;
  seek(seconds: number): void;
  volume: number;
  setVolume(v: number): void;
  time: number;
  duration: number;
};

const PlayerContext = createContext<Player | null>(null);

export function usePlayer(): Player {
  const player = useContext(PlayerContext);
  if (!player) throw new Error("usePlayer must be used inside <PlayerProvider>");
  return player;
}

const urlFor = (source: Source) => (source.kind === "live" ? STREAM_URL : source.url);

/** Owns the site's only <audio> element. Lives in the frontend layout, so it survives page changes. */
export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [state, dispatch] = useReducer(playerReducer, initialPlayerState);
  const [volume, setVolumeState] = useState(1);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Start (or restart) playback whenever the state machine asks for it.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || state.status !== "loading") return;
    const url = urlFor(state.source);
    if (!url) {
      dispatch({ type: "failed", message: "Stream unavailable" });
      return;
    }
    // Live always rejoins at the live edge; a story resumes where it paused.
    if (needsSrcReset({ kind: state.source.kind, currentSrc: audio.src, url, hasError: audio.error !== null })) {
      audio.src = url;
      setTime(0);
      setDuration(0);
    }
    audio.play().catch((error: unknown) => {
      // Pausing or switching source while buffering cancels play() with an AbortError: not a failure.
      if (isRealPlayFailure(error)) {
        dispatch({ type: "failed", message: state.source.kind === "live" ? "Stream unavailable" : "Audio unavailable" });
      }
    });
  }, [state.status, state.source]);

  useEffect(() => {
    if (state.status === "paused") audioRef.current?.pause();
  }, [state.status]);

  const play = useCallback((source: Source) => dispatch({ type: "play", source }), []);
  const pause = useCallback(() => dispatch({ type: "pause" }), []);
  const resume = useCallback(() => dispatch({ type: "resume" }), []);
  const seek = useCallback((seconds: number) => {
    if (audioRef.current) audioRef.current.currentTime = seconds;
  }, []);
  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    if (audioRef.current) audioRef.current.volume = v;
  }, []);

  const value = useMemo(
    () => ({ state, play, pause, resume, seek, volume, setVolume, time, duration }),
    [state, play, pause, resume, seek, volume, setVolume, time, duration],
  );

  return (
    <PlayerContext.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        preload="none"
        onPlaying={() => dispatch({ type: "started" })}
        onEnded={() => dispatch({ type: "ended" })}
        onError={() =>
          dispatch({ type: "failed", message: state.source.kind === "live" ? "Stream unavailable" : "Audio unavailable" })
        }
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0)}
      />
    </PlayerContext.Provider>
  );
}
