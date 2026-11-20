import { describe, expect, it } from "vitest";
import { chicagoToIso, parseEventInput } from "@/lib/staff/eventInput";

const form = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};
const ok = { title: "Afrobeats Brunch", type: "party", date: "2026-12-06", start: "19:00", publish: "on" };

describe("chicagoToIso", () => {
  it("turns Milwaukee local time into an exact time, across daylight saving", () => {
    expect(chicagoToIso("2026-12-06", "19:00")).toBe("2026-12-07T01:00:00.000Z"); // CST
    expect(chicagoToIso("2026-07-04", "19:00")).toBe("2026-07-05T00:00:00.000Z"); // CDT
    expect(chicagoToIso("2026-03-08", "19:00")).toBe("2026-03-09T00:00:00.000Z"); // the day clocks spring forward
  });
});

describe("parseEventInput: the staff quick-add form", () => {
  it("accepts a complete event", () => {
    const r = parseEventInput(form({ ...ok, end: "22:00", venue: "Bounce", city: "Milwaukee", ticketUrl: "https://tix.example/1", priceText: "Free", description: "Brunch.\n\nDJs all day." }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data).toMatchObject({ title: "Afrobeats Brunch", type: "party", startsAt: "2026-12-07T01:00:00.000Z", endsAt: "2026-12-07T04:00:00.000Z", venue: "Bounce", publish: true, ticketUrl: "https://tix.example/1" });
    expect((r.data.description as { root: { children: unknown[] } }).root.children).toHaveLength(2);
  });
  it("needs a title, a known type and a date", () => {
    const r = parseEventInput(form({ type: "rave", date: "" , start: "19:00" }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.errors).sort()).toEqual(["date", "title", "type"]);
  });
  it("rolls an end time at or before the start to the next day (a 10 pm to 2 am DJ night)", () => {
    const r = parseEventInput(form({ ...ok, start: "22:00", end: "02:00" }));
    expect(r.ok && r.data).toMatchObject({ startsAt: "2026-12-07T04:00:00.000Z", endsAt: "2026-12-07T08:00:00.000Z" });
  });
  it("rejects a non-web ticket link, and an end time without a start", () => {
    const r = parseEventInput(form({ title: "x", type: "party", date: "2026-12-06", end: "18:00", ticketUrl: "javascript:alert(1)" }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.errors).sort()).toEqual(["end", "ticketUrl"]);
  });
  it("hands back what was typed with the errors, so the form can refill itself", () => {
    const r = parseEventInput(form({ ...ok, ticketUrl: "javascript:alert(1)", description: "Long text" }));
    expect(!r.ok && r.values).toMatchObject({ title: "Afrobeats Brunch", ticketUrl: "javascript:alert(1)", description: "Long text", publish: "on" });
  });
  it("saves a draft when Publish now is unticked; an event with no start time is all-day", () => {
    const r = parseEventInput(form({ title: "Panel", type: "workshop", date: "2026-12-10" }));
    expect(r.ok && r.data).toMatchObject({ publish: false, dateOnly: true, startsAt: "2026-12-10T00:00:00.000Z" });
  });
  it("caps the title at 140 characters", () => {
    const r = parseEventInput(form({ ...ok, title: "x".repeat(141) }));
    expect(!r.ok && r.errors.title).toBeTruthy();
  });
});
