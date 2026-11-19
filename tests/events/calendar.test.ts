import { describe, expect, it } from "vitest";
import { concertDayKey, formatConcertWhen } from "@/lib/events/calendar";
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
