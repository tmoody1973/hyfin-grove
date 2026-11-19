import { describe, expect, it } from "vitest";
import { concertDayKey, formatConcertWhen, inTown } from "@/lib/events/calendar";
import { eventPath, safeTicketUrl } from "@/lib/events/links";

describe("concert dates", () => {
  it("a date-only show sits on its own date; a timed show on its Central date", () => {
    expect(concertDayKey({ startsAtMs: Date.parse("2026-12-04T00:00:00Z"), dateOnly: true })).toBe("2026-12-04");
    expect(concertDayKey({ startsAtMs: Date.parse("2026-12-05T02:00:00Z"), dateOnly: false })).toBe("2026-12-04");
  });
  it("reads like a listing", () => {
    expect(formatConcertWhen({ startsAtMs: Date.parse("2026-12-05T02:00:00Z"), dateOnly: false })).toBe("Fri, Dec 4 · 8 pm");
    expect(formatConcertWhen({ startsAtMs: Date.parse("2026-12-04T00:00:00Z"), dateOnly: true })).toBe("Fri, Dec 4 · Time TBA");
  });
});

describe("links", () => {
  it("only web ticket links become buttons", () => {
    expect(safeTicketUrl("https://www.ticketmaster.com/e/1")).toBe("https://www.ticketmaster.com/e/1");
    expect(safeTicketUrl("javascript:alert(1)")).toBeNull();
    expect(safeTicketUrl(null)).toBeNull();
  });
  it("event pages live at /events/<id>", () => expect(eventPath("j97 x")).toBe("/events/j97%20x"));
});

describe("inTown", () => {
  it("puts Milwaukee shows first, then the rest, soonest first", () => {
    const show = (id: string, city: string, day: number, metro: string | null = null) => ({ id, city, metro, startsAtMs: day });
    const picked = inTown([show("chi1", "Chicago", 1), show("mke", "Milwaukee", 5), show("gary", "Gary", 2, "Chicago"), show("mad", "Madison", 3)], 3);
    expect(picked.map((c) => c.id)).toEqual(["mke", "chi1", "gary"]);
  });
});
