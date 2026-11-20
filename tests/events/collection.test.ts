import { describe, expect, it } from "vitest";
import { EVENT_TYPES } from "@/lib/events/types";
import { eventSlugify, staffEventSlug } from "@/lib/events/slug";
import { rmLocked } from "@/lib/events/fieldAccess";

describe("event types", () => {
  it("are the six from plan 9, concerts first", () => {
    expect(EVENT_TYPES.map((t) => t.value)).toEqual(["concert", "hyfin-event", "community", "workshop", "party", "broadcast"]);
    expect(EVENT_TYPES.find((t) => t.value === "workshop")?.label).toBe("Workshop or panel");
  });
});

describe("staffEventSlug: a staff event's address", () => {
  it("is the title plus its Milwaukee date", () => {
    expect(staffEventSlug("Anti-Gala: Harlem Nights!", "2026-12-05T01:00:00Z")).toBe("anti-gala-harlem-nights-2026-12-04");
    expect(staffEventSlug("Afrobeats Brunch", "2026-12-06T18:00:00Z")).toBe("afrobeats-brunch-2026-12-06");
  });
  it("strips accents and symbols, and never starts or ends with a dash", () => {
    expect(staffEventSlug("  Café ¡Música! & Friends  ", "2026-12-06T18:00:00Z")).toBe("cafe-musica-friends-2026-12-06");
  });
  it("falls back to 'event' when the title has no letters", () => {
    expect(staffEventSlug("🎉", "2026-12-06T18:00:00Z")).toBe("event-2026-12-06");
  });
});

describe("rmLocked: staff can't edit fields the concert sync owns", () => {
  const call = (doc: unknown) => (rmLocked as (a: unknown) => boolean)({ doc });
  it("locks synced concerts and leaves staff events editable", () => {
    expect(call({ source: "rm-playlist" })).toBe(false);
    expect(call({ source: "staff" })).toBe(true);
    expect(call(undefined)).toBe(true);
  });
});

describe("eventSlugify: the rule slugField() uses for events", () => {
  it("keeps a synced concert's rm-playlist id, so /events/<id> links never break", () => {
    expect(eventSlugify({ data: { source: "rm-playlist", externalId: "abc123", title: "Tems live" } })).toBe("abc123");
  });
  it("builds title + Milwaukee date for a new staff event", () => {
    expect(eventSlugify({ data: { title: "Afrobeats Brunch", startsAt: "2026-12-06T18:00:00Z" } })).toBe("afrobeats-brunch-2026-12-06");
  });
  it("keeps an address an editor typed, cleaned up", () => {
    expect(eventSlugify({ data: { slug: "Brunch Dec 6", title: "Afrobeats Brunch", startsAt: "2026-12-06T18:00:00Z" } })).toBe("brunch-dec-6");
  });
  it("uses the event's own date for an all-day event (stored at midnight UTC), not the evening before", () => {
    expect(eventSlugify({ data: { title: "Afrobeats Brunch", startsAt: "2026-12-06T00:00:00.000Z", dateOnly: true } })).toBe("afrobeats-brunch-2026-12-06");
  });
  it("uses the title alone while the date is still empty", () => {
    expect(eventSlugify({ data: { title: "Afrobeats Brunch" } })).toBe("afrobeats-brunch");
  });
});
