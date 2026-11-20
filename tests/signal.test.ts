import { describe, expect, it } from "vitest";
import { CHANNEL, logoChannel } from "@/lib/signal";

describe("logoChannel: the Signal logo color for a page", () => {
  it("is red where HYFIN is live and on air", () => {
    expect(logoChannel("/listen/playlist")).toBe("red");
    expect(logoChannel("/listen/schedule")).toBe("red");
    expect(logoChannel("/hosts/tarik-moody")).toBe("red");
  });

  it("is green for Milwaukee and events, including Milwaukee stories", () => {
    expect(logoChannel("/milwaukee")).toBe("green");
    expect(logoChannel("/milwaukee/some-story")).toBe("green");
    expect(logoChannel("/events")).toBe("green");
    expect(logoChannel("/events/abc123")).toBe("green");
  });

  it("is blue for series and originals", () => {
    expect(logoChannel("/shows")).toBe("blue");
    expect(logoChannel("/shows/rhythm-lab-radio")).toBe("blue");
  });

  it("is white everywhere else", () => {
    for (const p of ["/", "/music", "/culture/a-story", "/tag/interviews", "/npr/123", "/thewiz", ""]) {
      expect(logoChannel(p)).toBe("white");
    }
  });

  it("maps each channel to the brand hex from docs/HYFIN_Logos/README.txt", () => {
    expect(CHANNEL).toEqual({ red: "#ff0040", green: "#00ff9f", blue: "#0070ff", white: "#ffffff" });
  });
});
