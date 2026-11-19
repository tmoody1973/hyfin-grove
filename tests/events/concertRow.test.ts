import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ConcertRow } from "@/components/events/ConcertRow";
import type { Concert } from "@/lib/events/rmEvents";

const base: Concert = {
  id: "e1", title: "Jorja Smith - Ages 18+", artist: "Jorja Smith", headliners: ["Jorja Smith"], supports: ["Lila Iké"], venue: "Riviera Theatre", city: "Chicago",
  region: null, metro: "Chicago", startsAtMs: Date.parse("2026-11-24T02:00:00Z"), dateOnly: false, doorsAt: null, genre: null,
  imageUrl: "https://s1.ticketm.net/x.jpg", ticketUrl: "https://tm.example/e1", playCount: 3, status: null,
};
const html = (c: Partial<Concert> = {}) => renderToStaticMarkup(ConcertRow({ concert: { ...base, ...c } })).replace(/<!-- -->/g, "");

describe("ConcertRow", () => {
  it("links the title to the event page and shows when, where, lineup and plays", () => {
    const h = html();
    expect(h).toContain('href="/events/e1"');
    expect(h).toContain("Mon, Nov 23 · 8 pm");
    expect(h).toContain("Riviera Theatre, Chicago");
    expect(h).toContain("with Lila Iké");
    expect(h).toContain("In rotation · 3 plays");
    expect(h).toMatch(/href="https:\/\/tm.example\/e1"[^>]*target="_blank"/);
  });
  it("Time TBA for a date-only show; no badge without a play count; no Tickets for a bad link", () => {
    const h = html({ dateOnly: true, startsAtMs: Date.parse("2026-12-04T00:00:00Z"), playCount: null, ticketUrl: "javascript:x" });
    expect(h).toContain("Fri, Dec 4 · Time TBA");
    expect(h).not.toContain("In rotation");
    expect(h).not.toContain("Tickets");
  });
  it("keeps long titles whole and shows a placeholder when there's no image", () => {
    const long = "*SOLD OUT* " + "Love Stories Tour ".repeat(10);
    const h = html({ title: long, imageUrl: null });
    expect(h).toContain(long);
    expect(h).not.toContain("<img");
    expect(h).toContain('data-image-placeholder="true"');
  });
});
