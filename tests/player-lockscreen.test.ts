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
