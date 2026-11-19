import { describe, expect, it } from "vitest";
import { eventJsonLd, eventState } from "@/lib/events/eventPage";
import type { Concert } from "@/lib/events/rmEvents";

const c: Concert = {
  id: "e1", title: "Jorja Smith - Ages 18+", artist: "Jorja Smith", headliners: ["Jorja Smith"], supports: ["Lila Iké"], venue: "Riviera Theatre", city: "Chicago",
  region: "IL", metro: "Chicago", startsAtMs: Date.parse("2026-11-24T02:00:00Z"), dateOnly: false, doorsAt: null, genre: "R&B",
  imageUrl: "https://s1.ticketm.net/x.jpg", ticketUrl: "https://tm.example/e1", playCount: 3, status: "buyTickets",
};
const ms = (iso: string) => Date.parse(iso);

describe("eventState", () => {
  it("upcoming until 6 hours after the start, then passed", () => {
    expect(eventState(c, ms("2026-11-24T01:00:00Z"))).toBe("upcoming");
    expect(eventState(c, ms("2026-11-24T07:00:00Z"))).toBe("upcoming");
    expect(eventState(c, ms("2026-11-24T08:01:00Z"))).toBe("passed");
  });
  it("a date-only show passes when its date is over in Milwaukee", () => {
    const d = { ...c, dateOnly: true, startsAtMs: ms("2026-12-04T00:00:00Z") };
    expect(eventState(d, ms("2026-12-05T05:00:00Z"))).toBe("upcoming"); // 11 pm Dec 4 Central
    expect(eventState(d, ms("2026-12-05T07:00:00Z"))).toBe("passed"); // 1 am Dec 5 Central
  });
  it("cancelled and postponed win over the date", () => {
    expect(eventState({ ...c, status: "cancelled" }, 0)).toBe("cancelled");
    expect(eventState({ ...c, status: "postponed" }, 0)).toBe("postponed");
  });
});

describe("eventJsonLd", () => {
  const url = "https://hyfin-grove.vercel.app/events/e1";
  it("describes the show for search engines", () => {
    const j = eventJsonLd(c, url, ms("2026-11-20T00:00:00Z"));
    expect(j).toMatchObject({
      "@context": "https://schema.org", "@type": "MusicEvent", name: "Jorja Smith - Ages 18+", url,
      startDate: "2026-11-24T02:00:00.000Z", eventStatus: "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      location: { "@type": "Place", name: "Riviera Theatre", address: { "@type": "PostalAddress", addressLocality: "Chicago", addressRegion: "IL" } },
      image: ["https://s1.ticketm.net/x.jpg"],
      offers: { "@type": "Offer", url: "https://tm.example/e1" },
    });
    expect((j.performer as unknown[]).length).toBe(2);
  });
  it("a date-only show has a date-only start", () => {
    expect(eventJsonLd({ ...c, dateOnly: true, startsAtMs: ms("2026-12-04T00:00:00Z") }, url, 0).startDate).toBe("2026-12-04");
  });
  it("no ticket offer for a passed show or an unsafe link; cancelled says so", () => {
    expect(eventJsonLd(c, url, ms("2026-12-01T00:00:00Z")).offers).toBeUndefined();
    expect(eventJsonLd({ ...c, ticketUrl: "javascript:x" }, url, 0).offers).toBeUndefined();
    expect(eventJsonLd({ ...c, status: "cancelled" }, url, 0).eventStatus).toBe("https://schema.org/EventCancelled");
  });
});
