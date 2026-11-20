import { describe, expect, it } from "vitest";
import { pastWhere, toEventView, upcomingWhere } from "@/lib/events/store";
import { parseEventsParams, eventsHref } from "@/lib/events/params";

const NOW = Date.parse("2026-11-20T18:00:00Z"); // Nov 20, noon in Milwaukee
const SIX_H_AGO = new Date(NOW - 6 * 3_600_000).toISOString();

describe("upcomingWhere / pastWhere (the 6-hour rule, as Payload queries)", () => {
  it("upcoming: published, not hidden, scheduled, and still on", () => {
    expect(upcomingWhere(NOW)).toEqual({
      and: [
        { _status: { equals: "published" } },
        { hidden: { not_equals: true } },
        { eventStatus: { equals: "scheduled" } },
        {
          or: [
            { and: [{ dateOnly: { equals: true } }, { startsAt: { greater_than_equal: "2026-11-20T00:00:00.000Z" } }] },
            { and: [{ dateOnly: { not_equals: true } }, { startsAt: { greater_than: SIX_H_AGO } }] },
            { endsAt: { greater_than: new Date(NOW).toISOString() } },
          ],
        },
      ],
    });
  });
  it("adds the type when asked", () => {
    expect(upcomingWhere(NOW, "party").and).toContainEqual({ type: { equals: "party" } });
  });
  it("past: the complement, cancelled shows left out of the archive", () => {
    const w = pastWhere(NOW);
    expect(w.and).toContainEqual({ eventStatus: { not_equals: "cancelled" } });
    expect(w.and).toContainEqual({
      or: [
        { and: [{ dateOnly: { equals: true } }, { startsAt: { less_than: "2026-11-20T00:00:00.000Z" } }] },
        { and: [{ dateOnly: { not_equals: true } }, { startsAt: { less_than_equal: SIX_H_AGO } }] },
      ],
    });
    expect(w.and).toContainEqual({ or: [{ endsAt: { exists: false } }, { endsAt: { less_than_equal: new Date(NOW).toISOString() } }] });
  });
});

describe("toEventView", () => {
  const doc = {
    id: 5, slug: "afrobeats-brunch-2026-12-06", title: "Afrobeats Brunch", type: "party", source: "staff", startsAt: "2026-12-06T18:00:00.000Z",
    endsAt: null, dateOnly: false, venue: "Bounce", city: "Milwaukee", metro: null, ticketUrl: null, imageUrl: "https://synced.jpg",
    image: { url: "https://blob/own.jpg" }, artist: null, headliners: null, supports: null, eventStatus: "scheduled", playCount: null, featured: true,
  };
  it("is concert-shaped, with the staff image beating the synced one and an /events/<slug> address", () => {
    expect(toEventView(doc as never)).toMatchObject({
      id: "afrobeats-brunch-2026-12-06", href: "/events/afrobeats-brunch-2026-12-06", type: "party", typeLabel: "Party or DJ night",
      startsAtMs: Date.parse("2026-12-06T18:00:00.000Z"), imageUrl: "https://blob/own.jpg", headliners: [], supports: [], status: null, featured: true, artist: "",
    });
  });
  it("carries cancelled / postponed as the concert status", () => {
    expect(toEventView({ ...doc, eventStatus: "cancelled" } as never).status).toBe("cancelled");
  });
});

describe("events URL parameters", () => {
  it("reads a known type and keeps it in links", () => {
    const p = parseEventsParams({ type: "workshop" }, NOW);
    expect(p.type).toBe("workshop");
    expect(eventsHref(p, "2026-11")).toBe("/events?type=workshop");
    expect(parseEventsParams({ type: "bogus" }, NOW).type).toBeNull();
  });
});
