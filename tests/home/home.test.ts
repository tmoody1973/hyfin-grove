import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SignalLog } from "@/components/home/SignalLog";
import { HeardLive } from "@/components/home/HeardLive";
import { Originals } from "@/components/home/Originals";
import { radioStationJsonLd } from "@/lib/home";
import type { Play } from "@/lib/listen/rmPlaylist";
import type { Concert } from "@/lib/events/rmEvents";

const play = (id: string, playedAt: number, over: Partial<Play> = {}): Play => ({
  id, playedAt, artist: `Artist ${id}`, title: `Song ${id}`, album: null, artworkUrl: null, spotifyTrackId: null, appleMusicSongId: null, previewUrl: null, liveEvent: null, ...over,
});
// 2026-11-19 14:37 and 14:33 Central
const T1 = Date.UTC(2026, 10, 19, 20, 37);
const T2 = Date.UTC(2026, 10, 19, 20, 33);

describe("SignalLog", () => {
  it("lists songs newest first with times, and links to the playlist", () => {
    const html = renderToStaticMarkup(createElement(SignalLog, { initial: [play("a", T2), play("b", T1)] }));
    expect(html.indexOf("Song b")).toBeLessThan(html.indexOf("Song a"));
    expect(html).toContain("2:37 pm");
    expect(html).toContain("2:33 pm");
    expect(html).toContain('href="/listen/playlist"');
  });
  it("shows at most 12 songs", () => {
    const many = Array.from({ length: 20 }, (_, i) => play(String(i), T1 - i * 60_000));
    const html = renderToStaticMarkup(createElement(SignalLog, { initial: many }));
    expect(html.match(/data-play=/g)?.length).toBe(12);
  });
  it("links a song's upcoming show to its event page", () => {
    const liveEvent = { eventId: "e1", title: null, venue: "Pabst", city: "Milwaukee", startsAtMs: Date.UTC(2026, 11, 4, 2), dateOnly: false, ticketUrl: null, imageUrl: null };
    const html = renderToStaticMarkup(createElement(SignalLog, { initial: [play("a", T1, { liveEvent })] }));
    expect(html).toContain('href="/events/e1"');
    expect(html).toContain("MKE Dec 3");
  });
  it("says so when there are no songs (rm-playlist down)", () => {
    expect(renderToStaticMarkup(createElement(SignalLog, { initial: [] }))).toContain("Playlist unavailable");
  });
});

describe("HeardLive", () => {
  it("renders nothing for an empty list", () => {
    expect(renderToStaticMarkup(HeardLive({ concerts: [] }) ?? createElement("i"))).toBe("<i></i>");
  });
  it("lists concerts with a tickets link only when the URL is http(s)", () => {
    const c = (id: string, ticketUrl: string | null) => ({ id, artist: `Act ${id}`, title: `Act ${id}`, venue: "Pabst", city: "Milwaukee", metro: "Milwaukee", startsAtMs: Date.UTC(2026, 11, 4, 2), dateOnly: false, ticketUrl }) as unknown as Concert;
    const html = renderToStaticMarkup(HeardLive({ concerts: [c("1", "https://t.example/1"), c("2", "javascript:alert(1)")] })!);
    expect(html).toContain("Act 1");
    expect(html).toContain('href="https://t.example/1"');
    expect(html).not.toContain("javascript:");
    expect(html).toContain('href="/events"');
  });
});

describe("Originals", () => {
  it("numbers shows and shows the weekly slot when known", () => {
    const html = renderToStaticMarkup(Originals({ shows: [{ slug: "ladies-first", name: "Ladies First", slot: "Sundays 10 am" }, { slug: "nmm", name: "New Music Mondays", slot: null }] })!);
    expect(html).toContain("01");
    expect(html).toContain("Sundays 10 am");
    expect(html).toContain('href="/shows/nmm"');
  });
});

describe("radioStationJsonLd", () => {
  it("describes HYFIN as a RadioStation and escapes <", () => {
    const json = radioStationJsonLd("https://example.org</script>");
    expect(json).not.toContain("<");
    const data = JSON.parse(json);
    expect(data["@type"]).toBe("RadioStation");
    expect(data.name).toBe("HYFIN");
    expect(data.parentOrganization.name).toBe("Radio Milwaukee");
    expect(data.sameAs).toContain("https://hyfin.org");
  });
});
