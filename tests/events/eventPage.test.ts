import { describe, expect, it } from "vitest";
import { artistMatches, eventJsonLd, eventState, mergeConcert, mergeLookups, upcomingOnly } from "@/lib/events/eventPage";
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

describe("mergeConcert", () => {
  it("keeps HYFIN's own view (the artist it plays, plays, metro) when the show is in the station list", () => {
    const fromLookup = { ...c, artist: "Jorja Smith", playCount: null, metro: null };
    const fromList = { ...c, artist: "Lila Iké", playCount: 3, metro: "Chicago" };
    expect(mergeConcert(fromLookup, fromList)).toMatchObject({ artist: "Lila Iké", playCount: 3, metro: "Chicago", status: "buyTickets" });
  });
  it("uses whichever source has the show", () => {
    expect(mergeConcert(c, undefined)).toBe(c);
    expect(mergeConcert(null, c)).toBe(c);
    expect(mergeConcert(null, undefined)).toBeNull();
  });
});

describe("artistMatches", () => {
  it("matches the whole name, case-insensitively, including features", () => {
    expect(artistMatches("Tems", "Wizkid feat. TEMS")).toBe(true);
    expect(artistMatches("Tems", "Systems")).toBe(false);
    expect(artistMatches("Common", "Uncommon Valor")).toBe(false);
    expect(artistMatches("The Roots", "Roots of the Blues")).toBe(false);
    expect(artistMatches("The Roots", "The Roots")).toBe(true);
    expect(artistMatches("Ty Dolla $ign", "Ty Dolla $ign & Future")).toBe(true);
  });
  it("a blank name matches nothing", () => expect(artistMatches("  ", "anything")).toBe(false));
});

describe("upcomingOnly", () => {
  it("lists drop a timed show once it starts (its own page says 'passed' later)", () => {
    expect(upcomingOnly([c], ms("2026-11-24T02:30:00Z"))).toEqual([]); // started 30 min ago
    expect(upcomingOnly([c], ms("2026-11-24T01:59:00Z")).length).toBe(1);
    const dateOnly = { ...c, dateOnly: true, startsAtMs: ms("2026-12-04T00:00:00Z") };
    expect(upcomingOnly([dateOnly], ms("2026-12-05T03:00:00Z")).length).toBe(1); // 9 pm Dec 4 Central, still its day
  });
  it("drops shows that have started or been cancelled", () => {
    const now = ms("2026-11-24T09:00:00Z");
    expect(upcomingOnly([c, { ...c, id: "later", startsAtMs: ms("2026-12-01T02:00:00Z") }, { ...c, id: "x", status: "cancelled", startsAtMs: ms("2026-12-02T02:00:00Z") }], now).map((x) => x.id)).toEqual(["later"]);
  });
});

describe("eventJsonLd details", () => {
  const url = "https://hyfin-grove.vercel.app/events/e1";
  it("rescheduled, sold out, and a show with no listed lineup", () => {
    expect(eventJsonLd({ ...c, status: "rescheduled" }, url, 0).eventStatus).toBe("https://schema.org/EventRescheduled");
    expect((eventJsonLd({ ...c, status: "soldOut" }, url, 0).offers as Record<string, unknown>).availability).toBe("https://schema.org/SoldOut");
    expect((eventJsonLd(c, url, 0).offers as Record<string, unknown>).availability).toBe("https://schema.org/InStock");
    expect(eventJsonLd({ ...c, headliners: [], supports: [] }, url, 0).performer).toEqual([{ "@type": "MusicGroup", name: "Jorja Smith" }]);
  });
});

describe("mergeLookups", () => {
  it("a failed lookup plus a list without the show is 'unavailable', not 'not found'", () => {
    expect(mergeLookups({ ok: false }, { ok: true, value: [] }, "e1")).toEqual({ ok: false });
  });
  it("a lookup that says 'no such event' is a real not-found", () => {
    expect(mergeLookups({ ok: true, value: null }, { ok: true, value: [] }, "e1")).toEqual({ ok: true, value: null });
  });
  it("the list alone is enough when the lookup fails but the show is listed", () => {
    expect(mergeLookups({ ok: false }, { ok: true, value: [c] }, "e1")).toEqual({ ok: true, value: c });
  });
});

describe("events of every type (plan 9)", () => {
  const party = { ...c, id: "brunch", title: "Afrobeats Brunch", artist: "", headliners: [], supports: [], status: null, type: "party" as const, endsAtMs: null as number | null };

  it("an event with an end time stays upcoming until it ends", () => {
    const fest = { ...party, startsAtMs: ms("2026-12-05T18:00:00Z"), endsAtMs: ms("2026-12-07T04:00:00Z") };
    expect(eventState(fest, ms("2026-12-06T20:00:00Z"))).toBe("upcoming"); // a day in, past the 6-hour rule
    expect(eventState(fest, ms("2026-12-07T05:00:00Z"))).toBe("passed");
  });

  it("search engines get a plain Event, without performers, for non-concert types", () => {
    const ld = eventJsonLd(party, "https://hyfin.org/events/brunch", ms("2026-11-20T00:00:00Z"));
    expect(ld["@type"]).toBe("Event");
    expect(ld).not.toHaveProperty("performer");
  });

  it("concerts stay MusicEvent; an event without a venue has no location", () => {
    expect(eventJsonLd({ ...c, type: "concert" }, "u", 0)["@type"]).toBe("MusicEvent");
    expect(eventJsonLd({ ...party, venue: "" }, "u", 0)).not.toHaveProperty("location");
  });
});
