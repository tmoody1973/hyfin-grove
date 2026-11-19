import { describe, expect, it } from "vitest";
import { chicagoDayRange, dayPrefix, formatRange, formatTime, isValidDayKey, todayKey, weekKeys } from "@/lib/listen/time";

const ms = (iso: string) => Date.parse(iso);
const HOUR = 3_600_000;

describe("Listen time helpers (America/Chicago)", () => {
  it("chicagoDayRange handles DST days", () => {
    const span = (key: string) => { const r = chicagoDayRange(key); return (r.toMs - r.fromMs) / HOUR; };
    expect(span("2026-11-01")).toBe(25);
    expect(span("2026-03-08")).toBe(23);
    expect(span("2026-11-19")).toBe(24);
    expect(chicagoDayRange("2026-11-19").fromMs).toBe(ms("2026-11-19T06:00:00Z"));
  });
  it("todayKey uses the Chicago date, not UTC", () => {
    expect(todayKey(ms("2026-11-20T03:00:00Z"))).toBe("2026-11-19"); // 9 pm Thursday in Milwaukee
  });
  it("weekKeys runs Monday to Sunday of the current week", () => {
    expect(weekKeys(ms("2026-11-19T18:00:00Z"))).toEqual(["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21", "2026-11-22"]);
    expect(weekKeys(ms("2026-11-22T18:00:00Z"))[0]).toBe("2026-11-16"); // Sunday belongs to the week that started Monday
  });
  it("formats times the way the mockups do", () => {
    expect(formatTime(ms("2026-11-19T20:37:00Z"))).toBe("2:37 pm");
    expect(formatRange(ms("2026-11-19T18:00:00Z"), ms("2026-11-19T23:00:00Z"))).toBe("12 to 5 pm");
    expect(formatRange(ms("2026-11-19T12:00:00Z"), ms("2026-11-19T18:00:00Z"))).toBe("6 am to 12 pm");
    expect(formatRange(ms("2026-11-21T04:00:00Z"), ms("2026-11-21T06:00:00Z"))).toBe("10 pm to 12 am");
    expect(formatRange(ms("2026-11-20T03:30:00Z"), ms("2026-11-20T05:00:00Z"))).toBe("9:30 to 11 pm");
  });
  it("isValidDayKey rejects anything but a real date", () => {
    expect(isValidDayKey("2026-11-19")).toBe(true);
    expect(isValidDayKey("2026-13-01")).toBe(false);
    expect(isValidDayKey("2026-02-30")).toBe(false);
    expect(isValidDayKey("../x")).toBe(false);
  });
  it("dayPrefix names yesterday so a rolling 24 hours reads clearly", () => {
    const now = ms("2026-11-19T12:43:00Z"); // 6:43 am Thursday in Milwaukee
    expect(dayPrefix(ms("2026-11-19T12:00:00Z"), now)).toBe("");
    expect(dayPrefix(ms("2026-11-19T03:30:00Z"), now)).toBe("Yesterday · "); // 9:30 pm Wednesday
    expect(dayPrefix(ms("2026-11-17T20:00:00Z"), now)).toBe("Tue, Nov 17 · ");
  });
});
