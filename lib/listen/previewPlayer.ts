/**
 * One shared player for Apple's 30-second song previews (like the rm-playlist widget). Only one clip plays at
 * a time. Whoever starts the first clip may pass `resume`, called exactly once when previews stop for good
 * (ended, stopped or failed), so the site's live stream picks back up. Switching clips doesn't call it.
 */
export type PreviewState = { kind: "idle" } | { kind: "loading" | "playing" | "error"; id: string };

type AudioLike = { src: string; play(): Promise<void>; pause(): void; addEventListener(type: string, fn: () => void): void };

export function createPreviewPlayer(makeAudio: () => AudioLike) {
  let audio: AudioLike | null = null;
  let state: PreviewState = { kind: "idle" };
  let resume: (() => void) | null = null;
  const listeners = new Set<(s: PreviewState) => void>();

  const set = (next: PreviewState) => {
    state = next;
    listeners.forEach((fn) => fn(state));
  };
  const finish = (next: PreviewState) => {
    if (state.kind === "idle") return;
    set(next);
    const r = resume;
    resume = null;
    r?.();
  };
  const element = () => {
    if (audio) return audio;
    const a = makeAudio();
    a.addEventListener("playing", () => state.kind === "loading" && set({ kind: "playing", id: state.id }));
    a.addEventListener("ended", () => finish({ kind: "idle" }));
    a.addEventListener("error", () => state.kind !== "idle" && finish({ kind: "error", id: state.id }));
    audio = a;
    return a;
  };

  return {
    get: () => state,
    subscribe(fn: (s: PreviewState) => void) {
      listeners.add(fn);
      return () => void listeners.delete(fn);
    },
    async play(id: string, url: string, onResume?: () => void) {
      if (onResume && !resume) resume = onResume;
      const a = element();
      a.pause();
      a.src = url;
      set({ kind: "loading", id });
      await a.play().catch(() => finish({ kind: "error", id }));
    },
    stop() {
      audio?.pause();
      finish({ kind: "idle" });
    },
  };
}

let shared: ReturnType<typeof createPreviewPlayer> | null = null;
/** The page's one preview player (browser only). */
export const previewPlayer = () => (shared ??= createPreviewPlayer(() => new Audio()));
