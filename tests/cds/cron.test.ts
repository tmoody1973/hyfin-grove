import { describe, expect, it } from "vitest";
import { healthOf, isAuthorizedCron } from "@/lib/cds/cron";

describe("isAuthorizedCron", () => {
  it("accepts only the exact bearer secret", () => {
    expect(isAuthorizedCron("Bearer s3cret", "s3cret")).toBe(true);
    expect(isAuthorizedCron("Bearer wrong", "s3cret")).toBe(false);
    expect(isAuthorizedCron(null, "s3cret")).toBe(false);
  });
  it("refuses everything when no secret is configured", () => {
    expect(isAuthorizedCron("Bearer ", "")).toBe(false);
    expect(isAuthorizedCron("Bearer undefined", undefined)).toBe(false);
  });
});

describe("healthOf", () => {
  const now = new Date("2026-11-19T12:00:00Z");
  it("is healthy within 60 minutes of the last success", () => {
    expect(healthOf({ lastSuccessAt: "2026-11-19T11:01:00Z", lastError: null }, now).ok).toBe(true);
  });
  it("is unhealthy after 60 minutes, or when it never succeeded", () => {
    expect(healthOf({ lastSuccessAt: "2026-11-19T10:59:00Z", lastError: "boom" }, now)).toEqual({ ok: false, lastSuccessAt: "2026-11-19T10:59:00Z", lastError: "boom" });
    expect(healthOf({ lastSuccessAt: null, lastError: null }, now).ok).toBe(false);
  });
  it("truncates a long error", () => {
    expect(healthOf({ lastSuccessAt: null, lastError: "x".repeat(500) }, now).lastError).toHaveLength(200);
  });
});
