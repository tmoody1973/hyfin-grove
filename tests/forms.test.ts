import { describe, expect, it, vi } from "vitest";
import { cleanSubmission, MAX_CHARS, type FormField } from "@/lib/forms/submit";
import { verifyTurnstile } from "@/lib/forms/turnstile";
import { createRateLimiter } from "@/lib/forms/rateLimit";

const FIELDS: FormField[] = [
  { blockType: "message", message: null },
  { blockType: "text", name: "name", label: "Your name", required: true },
  { blockType: "email", name: "email", label: "Email", required: true },
  { blockType: "textarea", name: "about", label: "About the track" },
  { blockType: "select", name: "genre", label: "Genre", options: [{ label: "Hip-hop", value: "hip-hop" }, { label: "R&B", value: "rnb" }] },
  { blockType: "checkbox", name: "local", label: "Milwaukee artist?" },
];

describe("cleanSubmission: only what the form asks for", () => {
  it("keeps the form's fields, trimmed, in the form's order", () => {
    const r = cleanSubmission(FIELDS, { email: " a@b.co ", name: " Kia ", genre: "rnb", local: "on", about: "" });
    expect(r).toEqual({
      ok: true,
      data: [
        { field: "name", value: "Kia" },
        { field: "email", value: "a@b.co" },
        { field: "about", value: "" },
        { field: "genre", value: "rnb" },
        { field: "local", value: "true" },
      ],
    });
  });
  it("drops fields the form doesn't have (an attacker's extras are never stored)", () => {
    const r = cleanSubmission(FIELDS, { name: "Kia", email: "a@b.co", isAdmin: "true", form: "7", company_url: "x" });
    expect(r.ok && r.data.map((d) => d.field)).toEqual(["name", "email", "about", "genre", "local"]);
  });
  it("enforces required fields and email format", () => {
    expect(cleanSubmission(FIELDS, { name: "  ", email: "not-an-email" })).toEqual({ ok: false, errors: { name: "Your name is required.", email: "Enter a valid email address." } });
  });
  it("refuses a select value that isn't one of the options", () => {
    expect(cleanSubmission(FIELDS, { name: "Kia", email: "a@b.co", genre: "<script>" })).toEqual({ ok: false, errors: { genre: "Choose one of the options." } });
  });
  it("refuses more than 5,000 characters in a field", () => {
    const r = cleanSubmission(FIELDS, { name: "Kia", email: "a@b.co", about: "x".repeat(MAX_CHARS + 1) });
    expect(r).toEqual({ ok: false, errors: { about: "Keep this under 5,000 characters." } });
    expect(cleanSubmission(FIELDS, { name: "Kia", email: "a@b.co", about: "x".repeat(MAX_CHARS) }).ok).toBe(true);
  });
  it("a required checkbox must be ticked; an unticked one is stored as false", () => {
    const fields: FormField[] = [{ blockType: "checkbox", name: "agree", label: "I own this music", required: true }];
    expect(cleanSubmission(fields, {})).toEqual({ ok: false, errors: { agree: "I own this music is required." } });
    expect(cleanSubmission([{ blockType: "checkbox", name: "x" }], {})).toEqual({ ok: true, data: [{ field: "x", value: "false" }] });
  });
  it("ignores non-string values (a File, an array) instead of storing them", () => {
    expect(cleanSubmission(FIELDS, { name: ["a", "b"], email: "a@b.co" })).toEqual({ ok: false, errors: { name: "Your name is required." } });
  });
});

describe("verifyTurnstile: Cloudflare's human check, on the server", () => {
  const ok = (body: unknown) => vi.fn(async () => new Response(JSON.stringify(body)));
  it("passes when Cloudflare says success", async () => {
    const fetch = ok({ success: true });
    expect(await verifyTurnstile("tok", "1.2.3.4", { secret: "s", fetch })).toBe(true);
    const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({ secret: "s", response: "tok", remoteip: "1.2.3.4" });
  });
  it("fails on a refused, missing or oversized token, or when Cloudflare can't be reached", async () => {
    expect(await verifyTurnstile("tok", null, { secret: "s", fetch: ok({ success: false, "error-codes": ["invalid-input-response"] }) })).toBe(false);
    const never = vi.fn();
    expect(await verifyTurnstile("", null, { secret: "s", fetch: never })).toBe(false);
    expect(await verifyTurnstile("x".repeat(2049), null, { secret: "s", fetch: never })).toBe(false);
    expect(never).not.toHaveBeenCalled();
    expect(await verifyTurnstile("tok", null, { secret: "s", fetch: vi.fn(async () => { throw new Error("down"); }) })).toBe(false);
  });
  it("is skipped (passes) only when no secret is configured", async () => {
    expect(await verifyTurnstile("", null, { secret: undefined, fetch: vi.fn() })).toBe(true);
  });
});

describe("createRateLimiter: 5 posts a minute per visitor per form", () => {
  it("refuses the 6th within a minute, allows again after", () => {
    const allow = createRateLimiter(5, 60_000);
    const t = 1_000_000;
    for (let i = 0; i < 5; i++) expect(allow("ip|form", t + i)).toBe(true);
    expect(allow("ip|form", t + 10)).toBe(false);
    expect(allow("other|form", t + 10)).toBe(true);
    expect(allow("ip|form", t + 60_001)).toBe(true);
  });
});

describe("submissionCutoff: submissions are kept 12 months", async () => {
  const { submissionCutoff } = await import("@/lib/forms/retention");
  it("is the same moment one year earlier", () => {
    expect(submissionCutoff(Date.parse("2026-11-20T17:00:00Z"))).toBe("2025-11-20T17:00:00.000Z");
    expect(submissionCutoff(Date.parse("2028-02-29T00:00:00Z"))).toBe("2027-03-01T00:00:00.000Z");
  });
});
