import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ScheduleDay } from "@/components/listen/ScheduleDay";
import { attachPayload, normalizeName, weeklyLabel, type HostLite, type ShowLite } from "@/lib/listen/attach";
import type { Airing } from "@/lib/listen/rmPlaylist";

const ms = (iso: string) => Date.parse(iso);
const airing = (name: string, hosts: string[], from: string, to: string, extra: Partial<Airing> = {}): Airing =>
  ({ name, hosts, description: null, link: null, imageUrl: null, startsAt: ms(from), endsAt: ms(to), ...extra });

const megan: HostLite = { slug: "megan-mathews", name: "Megan Mathews", cadenceHostName: "Megan Mathews", photoUrl: "/m.jpg" };
const rhythmLab: ShowLite = { slug: "rhythm-lab-radio", name: "Rhythm Lab Radio", cadenceProgramName: "Rhythm Lab Radio", description: "Staff blurb", artworkUrl: null };

describe("attachPayload", () => {
  it("normalizes names and never guesses", () => {
    expect(normalizeName("  DJ  Megan   Mathews ")).toBe("megan mathews");
    const [a] = attachPayload([airing("Weekends", ["DJ Megan Mathews ", "Megan"], "2026-11-21T18:00:00Z", "2026-11-21T23:00:00Z")], [], [megan]);
    expect(a.hostCards).toEqual([
      { name: "DJ Megan Mathews ".trim(), slug: "megan-mathews", photoUrl: "/m.jpg" },
      { name: "Megan", slug: null, photoUrl: null },
    ]);
    expect(a.show).toBeNull();
  });
  it("Payload text wins; Cadence art fills in when the show has none", () => {
    const [a] = attachPayload([airing("rhythm lab radio", ["Tarik Moody"], "2026-11-21T04:00:00Z", "2026-11-21T06:00:00Z", { description: "Cadence blurb", imageUrl: "/cadence.jpg" })], [rhythmLab], []);
    expect(a.show?.slug).toBe("rhythm-lab-radio");
    expect(a.blurb).toBe("Staff blurb");
    expect(a.artUrl).toBe("/cadence.jpg");
  });
});

describe("weeklyLabel", () => {
  it("labels a once-a-week show", () => {
    const fri = [airing("RLR", [], "2026-11-21T04:00:00Z", "2026-11-21T06:00:00Z"), airing("RLR", [], "2026-11-28T04:00:00Z", "2026-11-28T06:00:00Z")];
    expect(weeklyLabel(fri)).toBe("Fridays, 10 pm to 12 am");
  });
  it("returns null for a show on several weekdays", () => {
    expect(weeklyLabel([airing("Mid-day", [], "2026-11-16T18:00:00Z", "2026-11-16T21:00:00Z"), airing("Mid-day", [], "2026-11-17T18:00:00Z", "2026-11-17T21:00:00Z")])).toBeNull();
    expect(weeklyLabel([])).toBeNull();
  });
});

describe("ScheduleDay", () => {
  it("schedule renders the empty state", () => {
    const html = renderToStaticMarkup(ScheduleDay({ airings: [], now: 0 }));
    expect(html).toContain("The schedule is on its way.");
  });
});
