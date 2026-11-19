/** One source at a time: the HYFIN live stream, or one story's audio. */
export type Source = { kind: "live" } | { kind: "story"; url: string; title: string; href: string };

export type PlayerStatus = "idle" | "loading" | "playing" | "paused" | "error";
export type PlayerState = { source: Source; status: PlayerStatus; error: string | null };

export type PlayerAction =
  | { type: "play"; source: Source }
  | { type: "started" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "ended" }
  | { type: "failed"; message: string };

export const initialPlayerState: PlayerState = { source: { kind: "live" }, status: "idle", error: null };

export function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case "play":
      return { source: action.source, status: "loading", error: null };
    case "started":
      // A queued "playing" event can arrive after a pause: the listener's pause wins.
      return state.status === "paused" ? state : { ...state, status: "playing", error: null };
    case "pause":
      return { ...state, status: "paused" };
    case "resume":
      return { ...state, status: "loading", error: null };
    case "ended":
      return { ...state, status: "idle" };
    case "failed":
      return { ...state, status: "error", error: action.message };
  }
}

/** A play() rejected with AbortError was cancelled by pause() or a source switch, not a broken stream. */
export const isRealPlayFailure = (error: unknown): boolean => !(error instanceof Error && error.name === "AbortError") && (error as { name?: string })?.name !== "AbortError";

/** Load the source again for live (rejoin the live edge), a different URL, or a retry after an error. */
export const needsSrcReset = (s: { kind: Source["kind"]; currentSrc: string; url: string; hasError: boolean }): boolean =>
  s.kind === "live" || s.currentSrc !== s.url || s.hasError;
