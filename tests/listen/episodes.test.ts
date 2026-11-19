import { describe, expect, it } from "vitest";
import { episodesFor } from "@/lib/listen/episodes";
import type { Airing } from "@/lib/listen/rmPlaylist";

const ms = (iso: string) => Date.parse(iso);
const air = (name: string, from: string, to: string): Airing => ({ name, hosts: [], description: null, link: null, imageUrl: null, startsAt: ms(from), endsAt: ms(to) });

const rlr = [
  air("Rhythm Lab Radio", "2026-11-07T04:00:00Z", "2026-11-07T06:00:00Z"),
  air("Rhythm Lab Radio", "2026-11-14T04:00:00Z", "2026-11-14T06:00:00Z"),
  air("Rhythm Lab Radio", "2026-11-21T04:00:00Z", "2026-11-21T06:00:00Z"),
  air("Mid-day", "2026-11-14T18:00:00Z", "2026-11-14T21:00:00Z"),
];

describe("episodesFor", () => {
  it("lists aired episodes newest first and leaves out future ones", () => {
    expect(episodesFor(rlr, "Rhythm Lab Radio", ms("2026-11-19T12:00:00Z"), 5).map((e) => e.startsAt)).toEqual([ms("2026-11-14T04:00:00Z"), ms("2026-11-07T04:00:00Z")]);
  });
  it("puts an episode on air right now first", () => {
    expect(episodesFor(rlr, "Rhythm Lab Radio", ms("2026-11-21T05:00:00Z"), 5)[0].startsAt).toBe(ms("2026-11-21T04:00:00Z"));
  });
  it("matches the program name loosely and caps the count", () => {
    expect(episodesFor(rlr, " rhythm lab  radio", ms("2026-11-30T00:00:00Z"), 2)).toHaveLength(2);
    expect(episodesFor(rlr, "Nope", ms("2026-11-30T00:00:00Z"), 5)).toEqual([]);
  });
});
