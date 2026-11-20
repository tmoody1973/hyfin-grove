// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlayerProvider, usePlayer, type Player } from "@/components/player/PlayerProvider";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * A locked iPhone runs a lock-screen tap's handler, then holds the page's later work back, and only lets audio start
 * inside the tap itself. So play, resume and pause must reach the <audio> element synchronously, inside the call,
 * not in an effect after the next render (2026-11-20: play after pause did nothing on the lock screen).
 */
describe("the player acts on the audio inside the call (lock screen)", () => {
  let host: HTMLDivElement;
  afterEach(() => {
    host.remove();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  async function mount() {
    vi.stubEnv("NEXT_PUBLIC_HYFIN_STREAM_URL", "https://stream.example/hyfin");
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(() => Promise.resolve());
    const pause = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    let player!: Player;
    const Grab = () => {
      player = usePlayer();
      return null;
    };
    host = document.body.appendChild(document.createElement("div"));
    await act(async () => createRoot(host).render(createElement(PlayerProvider, null, createElement(Grab))));
    return { play, pause, get: () => player };
  }

  it("play() starts the audio before returning", async () => {
    const m = await mount();
    m.get().play({ kind: "story", url: "https://example.com/a.mp3", title: "A", href: "/a" });
    expect(m.play).toHaveBeenCalledTimes(1);
  });

  it("pause() then resume(): each reaches the audio before returning", async () => {
    const m = await mount();
    await act(async () => m.get().play({ kind: "story", url: "https://example.com/a.mp3", title: "A", href: "/a" }));
    m.play.mockClear();
    m.get().pause();
    expect(m.pause).toHaveBeenCalledTimes(1);
    await act(async () => {});
    m.get().resume();
    expect(m.play).toHaveBeenCalledTimes(1);
  });

  it("resume() from the very start plays live (the lock screen's play button)", async () => {
    const m = await mount();
    m.get().resume();
    expect(m.play).toHaveBeenCalledTimes(1);
    await act(async () => {});
    expect(m.get().state).toMatchObject({ source: { kind: "live" }, status: "loading" });
  });

  it("starts once, not twice (no second start after the render)", async () => {
    const m = await mount();
    await act(async () => m.get().resume());
    expect(m.play).toHaveBeenCalledTimes(1);
  });
});

/**
 * Second report (2026-11-20, iPhone): play after a lock-screen pause still did nothing. Once paused, iOS suspends the
 * page in the background, so a play handler of ours never runs. The fix lets iOS drive the <audio> element itself (no
 * play/pause action handlers), and the player follows the element's own pause and play events.
 */
describe("the player follows the audio element when the lock screen drives it", () => {
  let host: HTMLDivElement;
  afterEach(() => {
    host.remove();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  async function mountPlaying() {
    vi.stubEnv("NEXT_PUBLIC_HYFIN_STREAM_URL", "https://stream.example/hyfin");
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(() => Promise.resolve());
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    let player!: Player;
    const Grab = () => {
      player = usePlayer();
      return null;
    };
    host = document.body.appendChild(document.createElement("div"));
    await act(async () => createRoot(host).render(createElement(PlayerProvider, null, createElement(Grab))));
    const audio = host.querySelector("audio")!;
    await act(async () => player.resume());
    await act(async () => audio.dispatchEvent(new Event("playing")));
    return { audio, get: () => player };
  }

  it("a pause from outside the page (lock screen) shows as paused", async () => {
    const m = await mountPlaying();
    expect(m.get().state.status).toBe("playing");
    await act(async () => m.audio.dispatchEvent(new Event("pause")));
    expect(m.get().state.status).toBe("paused");
  });

  it("then a play from outside the page shows as playing again", async () => {
    const m = await mountPlaying();
    await act(async () => m.audio.dispatchEvent(new Event("pause")));
    await act(async () => {
      m.audio.dispatchEvent(new Event("play"));
      m.audio.dispatchEvent(new Event("playing"));
    });
    expect(m.get().state.status).toBe("playing");
  });

  it("switching source (the element pauses while it loads the new one) is not mistaken for a listener's pause", async () => {
    const m = await mountPlaying();
    await act(async () => {
      m.get().play({ kind: "story", url: "https://example.com/a.mp3", title: "A", href: "/a" });
      m.audio.dispatchEvent(new Event("pause"));
    });
    expect(m.get().state.status).toBe("loading");
  });
});

describe("useMediaSession leaves play and pause to the browser", async () => {
  const { useMediaSession } = await import("@/components/mobile/useMediaSession");
  it("registers no play or pause handlers (iOS drives the audio itself, even while the page sleeps)", async () => {
    const setActionHandler = vi.fn();
    Object.defineProperty(navigator, "mediaSession", { configurable: true, value: { setActionHandler, metadata: null, playbackState: "none" } });
    (globalThis as { MediaMetadata?: unknown }).MediaMetadata = class {
      constructor(public init: unknown) {}
    };
    const Probe = () => {
      useMediaSession({ state: { source: { kind: "live" }, status: "playing", error: null } }, null, null);
      return null;
    };
    const el = document.body.appendChild(document.createElement("div"));
    await act(async () => createRoot(el).render(createElement(Probe)));
    expect(setActionHandler.mock.calls.filter(([a, h]) => (a === "play" || a === "pause") && h !== null)).toEqual([]);
    el.remove();
  });
});
