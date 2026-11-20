import { describe, expect, it } from "vitest";
import { installPlatform, shouldInvite } from "@/lib/pwa/installInvite";
import { pullState } from "@/lib/mobile/pullToRefresh";

const DAY = 86_400_000;
const now = Date.parse("2026-11-20T20:00:00Z");
const base = { installed: false, platform: "ios" as const, visits: 2, listenedSeconds: 0, dismissedAt: null, now };

describe("shouldInvite: the 'add HYFIN to your home screen' card (plan 15, task 8)", () => {
  it("never on a first visit with no listening", () => {
    expect(shouldInvite({ ...base, visits: 1 })).toBe(false);
  });
  it("on the second visit, or after a minute of listening on the first", () => {
    expect(shouldInvite(base)).toBe(true);
    expect(shouldInvite({ ...base, visits: 1, listenedSeconds: 60 })).toBe(true);
    expect(shouldInvite({ ...base, visits: 1, listenedSeconds: 59 })).toBe(false);
  });
  it("never once installed, or where installing isn't possible", () => {
    expect(shouldInvite({ ...base, installed: true })).toBe(false);
    expect(shouldInvite({ ...base, platform: "other" })).toBe(false);
  });
  it("a dismissal holds for 30 days", () => {
    expect(shouldInvite({ ...base, dismissedAt: now - 29 * DAY })).toBe(false);
    expect(shouldInvite({ ...base, dismissedAt: now - 31 * DAY })).toBe(true);
  });
});

describe("installPlatform: how this phone installs", () => {
  it("iPhone and iPad Safari use Share → Add to Home Screen", () => {
    expect(installPlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 26_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1", false)).toBe("ios");
  });
  it("Android Chrome offers its own install prompt", () => {
    expect(installPlatform("Mozilla/5.0 (Linux; Android 15) Chrome/131.0 Mobile Safari/537.36", true)).toBe("prompt");
  });
  it("anything else gets no invite (Chrome on iPhone can't add to the home screen the same way, desktop isn't the target)", () => {
    expect(installPlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 26_7 like Mac OS X) CriOS/131.0 Mobile/15E148 Safari/604.1", false)).toBe("other");
    expect(installPlatform("Mozilla/5.0 (Linux; Android 15) Chrome/131.0 Mobile Safari/537.36", false)).toBe("other");
  });
});

describe("pullState: pull down to refresh (installed app only)", () => {
  it("follows the finger at half speed, capped", () => {
    expect(pullState(0)).toEqual({ offset: 0, ready: false });
    expect(pullState(100)).toEqual({ offset: 50, ready: false });
    expect(pullState(1000)).toEqual({ offset: 96, ready: true });
  });
  it("is ready to refresh past 140 px of finger travel (70 px shown)", () => {
    expect(pullState(139).ready).toBe(false);
    expect(pullState(140).ready).toBe(true);
  });
  it("ignores upward movement", () => {
    expect(pullState(-50)).toEqual({ offset: 0, ready: false });
  });
});
