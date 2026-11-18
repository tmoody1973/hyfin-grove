import { describe, expect, it } from "vitest";
import { initialPlayerState, playerReducer, type Source } from "@/components/player/playerState";

const live: Source = { kind: "live" };
const story: Source = { kind: "story", url: "https://x/a.mp3", title: "A", href: "/music/a" };

describe("playerReducer", () => {
  it("starts on the live stream, idle", () => {
    expect(initialPlayerState).toEqual({ source: live, status: "idle", error: null });
  });

  it("goes to loading when asked to play, then playing when audio starts", () => {
    const loading = playerReducer(initialPlayerState, { type: "play", source: live });
    expect(loading.status).toBe("loading");
    expect(playerReducer(loading, { type: "started" }).status).toBe("playing");
  });

  it("has exactly one source: playing a story while live replaces live", () => {
    const s = playerReducer({ source: live, status: "playing", error: null }, { type: "play", source: story });
    expect(s).toEqual({ source: story, status: "loading", error: null });
  });

  it("shows the error instead of a stuck loading state", () => {
    const s = playerReducer({ source: live, status: "loading", error: null }, { type: "failed", message: "Stream unavailable" });
    expect(s).toEqual({ source: live, status: "error", error: "Stream unavailable" });
  });

  it("clears a previous error when playing again", () => {
    const s = playerReducer({ source: live, status: "error", error: "Stream unavailable" }, { type: "play", source: live });
    expect(s.error).toBeNull();
  });

  it("pauses and resumes the same source", () => {
    const paused = playerReducer({ source: story, status: "playing", error: null }, { type: "pause" });
    expect(paused).toEqual({ source: story, status: "paused", error: null });
    expect(playerReducer(paused, { type: "resume" }).status).toBe("loading");
  });

  it("stops at the end of a story; it does not jump back to live", () => {
    expect(playerReducer({ source: story, status: "playing", error: null }, { type: "ended" })).toEqual({ source: story, status: "idle", error: null });
  });

  it("returns a new object; never mutates the old state", () => {
    const before = { source: live, status: "idle", error: null } as const;
    const after = playerReducer(before, { type: "play", source: story });
    expect(after).not.toBe(before);
    expect(before.status).toBe("idle");
  });
});
