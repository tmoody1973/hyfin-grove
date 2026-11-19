import { describe, expect, it } from "vitest";
import { groupPlaysByAiring, mergeLive } from "@/lib/listen/group";
import type { Airing, Play } from "@/lib/listen/rmPlaylist";

const ms = (iso: string) => Date.parse(iso);
const play = (id: string, iso: string): Play => ({ id, playedAt: ms(iso), artist: "A", title: id, album: null, artworkUrl: null, spotifyTrackId: null, appleMusicSongId: null, liveEvent: null });
const airing = (name: string, from: string, to: string): Airing => ({ name, hosts: [], description: null, link: null, imageUrl: null, startsAt: ms(from), endsAt: ms(to) });

const morning = airing("The Morning Mix", "2026-11-19T12:00:00Z", "2026-11-19T18:00:00Z"); // 6 am to 12 pm CT
const megan = airing("DJ Megan Mathews", "2026-11-19T18:00:00Z", "2026-11-19T23:00:00Z"); // 12 to 5 pm CT

describe("groupPlaysByAiring", () => {
  it("puts songs under the show that aired them, newest first", () => {
    const groups = groupPlaysByAiring([play("a", "2026-11-19T17:56:00Z"), play("b", "2026-11-19T20:37:00Z")], [morning, megan]);
    expect(groups.map((g) => [g.airing?.name, g.plays.map((p) => p.id)])).toEqual([["DJ Megan Mathews", ["b"]], ["The Morning Mix", ["a"]]]);
  });
  it("a song at the exact end of a show belongs to the next one", () => {
    expect(groupPlaysByAiring([play("x", "2026-11-19T18:00:00Z")], [morning, megan])[0].airing?.name).toBe("DJ Megan Mathews");
  });
  it("songs outside every show form their own runs", () => {
    const groups = groupPlaysByAiring([play("late", "2026-11-20T01:00:00Z"), play("b", "2026-11-19T20:00:00Z"), play("early", "2026-11-19T08:00:00Z")], [megan]);
    expect(groups.map((g) => [g.airing?.name ?? null, g.plays.map((p) => p.id)])).toEqual([[null, ["late"]], ["DJ Megan Mathews", ["b"]], [null, ["early"]]]);
  });
  it("no songs, no groups", () => expect(groupPlaysByAiring([], [megan])).toEqual([]));
  it("today's live list never shows yesterday's songs", () => {
    const midnight = ms("2026-11-19T06:00:00Z");
    const merged = mergeLive([play("late", "2026-11-19T05:55:00Z"), play("new", "2026-11-19T06:05:00Z")], [play("new", "2026-11-19T06:05:00Z"), play("first", "2026-11-19T06:01:00Z")], midnight);
    expect(merged.map((p) => p.id)).toEqual(["new", "first"]);
  });
});
