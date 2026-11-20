import { describe, expect, it } from "vitest";
import { eventsHref, parseEventsParams } from "@/lib/events/params";

const now = Date.parse("2026-11-19T18:00:00Z");

describe("events URL parameters", () => {
  it("reads the metro, case-insensitively, and ignores anything else", () => {
    expect(parseEventsParams({ metro: "milwaukee" }, now).metro).toBe("Milwaukee");
    expect(parseEventsParams({ metro: "Gary" }, now).metro).toBeNull();
    expect(parseEventsParams({}, now).metro).toBeNull();
  });
  it("allows this month through 5 months ahead, else this month", () => {
    expect(parseEventsParams({}, now).month).toBe("2026-11");
    expect(parseEventsParams({ month: "2027-04" }, now).month).toBe("2027-04");
    expect(parseEventsParams({ month: "2027-05" }, now).month).toBe("2026-11");
    expect(parseEventsParams({ month: "2026-10" }, now).month).toBe("2026-11");
    expect(parseEventsParams({ month: "../x" }, now).month).toBe("2026-11");
    expect(parseEventsParams({ month: "2026-13" }, now).month).toBe("2026-11");
  });
  it("builds short URLs", () => {
    expect(eventsHref({ metro: null, month: "2026-11", type: null }, "2026-11")).toBe("/events");
    expect(eventsHref({ metro: "Chicago", month: "2026-12", type: null }, "2026-11")).toBe("/events?metro=chicago&month=2026-12");
  });
});
