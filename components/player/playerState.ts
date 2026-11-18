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
      return { ...state, status: "playing", error: null };
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
