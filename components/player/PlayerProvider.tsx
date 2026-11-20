"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { initialPlayerState, isRealPlayFailure, needsSrcReset, playerReducer, type PlayerState, type Source } from "./playerState";


export type Player = {
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

/** The player when inside <PlayerProvider>, otherwise null (for parts that also render outside it). */
export const useOptionalPlayer = (): Player | null => useContext(PlayerContext);

export function usePlayer(): Player {
  const player = useContext(PlayerContext);
  if (!player) throw new Error("usePlayer must be used inside <PlayerProvider>");
  return player;
}

// Read when called (Next inlines the value at build time either way), so tests can set it.
const urlFor = (source: Source) => (source.kind === "live" ? (process.env.NEXT_PUBLIC_HYFIN_STREAM_URL ?? "") : source.url);

/** Owns the site's only <audio> element. Lives in the frontend layout, so it survives page changes. */
export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [state, dispatch] = useReducer(playerReducer, initialPlayerState);
  const [volume, setVolumeState] = useState(1);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // The latest state, for resume() (which must not wait for a render to know the source).
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  /**
   * Starts the audio now, inside the caller's tap. A locked iPhone runs a lock-screen tap's handler, then holds the
   * page's later work back, and only lets audio start inside the tap itself: starting from an effect after the next
   * render never ran there (2026-11-20, tests/player-lockscreen.test.ts).
   */
  const begin = useCallback((source: Source) => {
    const audio = audioRef.current;
    if (!audio) return;
    const url = urlFor(source);
    const failure = source.kind === "live" ? "Stream unavailable" : "Audio unavailable";
    if (!url) {
      dispatch({ type: "failed", message: "Stream unavailable" });
      return;
    }
    // Live always rejoins at the live edge; a story resumes where it paused.
    // audio.src is always absolute; resolve ours the same way so a relative story URL can still resume.
    const absolute = new URL(url, window.location.href).href;
    if (needsSrcReset({ kind: source.kind, currentSrc: audio.src, url: absolute, hasError: audio.error !== null })) {
      audio.src = url;
      setTime(0);
      setDuration(0);
    }
    audio.play().catch((error: unknown) => {
      // Pausing or switching source while buffering cancels play() with an AbortError: not a failure.
      if (isRealPlayFailure(error)) dispatch({ type: "failed", message: failure });
    });
  }, []);

  // Signal design: pressing play locks the signal, so headlines stop glitching while audio plays (globals.css).
  useEffect(() => {
    document.documentElement.toggleAttribute("data-locked", state.status === "playing");
  }, [state.status]);

  const play = useCallback(
    (source: Source) => {
      dispatch({ type: "play", source });
      begin(source);
    },
    [begin],
  );
  const pause = useCallback(() => {
    dispatch({ type: "pause" });
    audioRef.current?.pause();
  }, []);
  const resume = useCallback(() => {
    dispatch({ type: "resume" });
    begin(stateRef.current.source);
  }, [begin]);
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
