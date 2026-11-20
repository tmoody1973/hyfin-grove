import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { addPendingMember, subscriberHash } from "@/lib/newsletter/mailchimp";

const KEY = "abc123-us7";
const md5 = (s: string) => createHash("md5").update(s).digest("hex");
const json = (status: number, body: unknown) => new Response(status === 204 ? null : JSON.stringify(body), { status });

/** A fake Mailchimp: answers each call in turn and records what was sent. */
function fake(...answers: (Response | Error)[]) {
  const calls: { url: string; method: string; body: unknown; auth: string | null }[] = [];
  const fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), method: init?.method ?? "GET", body: init?.body ? JSON.parse(String(init.body)) : null, auth: new Headers(init?.headers).get("authorization") });
    const a = answers.shift() ?? json(204, null);
    if (a instanceof Error) throw a;
    return a;
  });
  return { fetch: fetch as unknown as typeof globalThis.fetch, calls };
}
const opts = (f: typeof fetch, apiKey: string | undefined = KEY) => ({ apiKey, audienceId: "dbf0d7bdf6", fetch: f });

describe("subscriberHash", () => {
  it("is the md5 of the trimmed, lowercase email (Tarik@ and tarik@ are one member)", () => {
    expect(subscriberHash(" Tarik@Example.COM ")).toBe(md5("tarik@example.com"));
  });
});

describe("addPendingMember", () => {
  const who = { email: "Kia@Example.com", firstName: "Kia", tags: ["hyfin-site", "signup:home"] };

  it("adds someone new as pending (Mailchimp sends one confirmation email), then tags them", async () => {
    const { fetch, calls } = fake(json(200, { status: "pending" }), json(204, null));
    expect(await addPendingMember(who, opts(fetch))).toBe("pending");
    const hash = md5("kia@example.com");
    expect(calls[0]).toEqual({
      url: `https://us7.api.mailchimp.com/3.0/lists/dbf0d7bdf6/members/${hash}`,
      method: "PUT",
      body: { email_address: "kia@example.com", status_if_new: "pending", merge_fields: { FNAME: "Kia" } },
      auth: `Basic ${Buffer.from(`hyfin:${KEY}`).toString("base64")}`,
    });
    expect(calls[1]).toMatchObject({ url: `https://us7.api.mailchimp.com/3.0/lists/dbf0d7bdf6/members/${hash}/tags`, method: "POST", body: { tags: [{ name: "hyfin-site", status: "active" }, { name: "signup:home", status: "active" }] } });
  });
  it("leaves out the first name when none was given (never blanks an existing one)", async () => {
    const { fetch, calls } = fake(json(200, { status: "pending" }));
    await addPendingMember({ ...who, firstName: "" }, opts(fetch));
    expect(calls[0].body).toEqual({ email_address: "kia@example.com", status_if_new: "pending" });
  });
  it("someone already subscribed: 'already', and their status is never changed", async () => {
    const { fetch, calls } = fake(json(200, { status: "subscribed" }));
    expect(await addPendingMember(who, opts(fetch))).toBe("already");
    expect(calls.filter((c) => c.method === "PATCH")).toEqual([]);
  });
  it("someone who unsubscribed earlier: set back to pending, so they get one confirmation email", async () => {
    const { fetch, calls } = fake(json(200, { status: "unsubscribed" }), json(200, { status: "pending" }));
    expect(await addPendingMember(who, opts(fetch))).toBe("resubscribe-sent");
    expect(calls[1]).toMatchObject({ method: "PATCH", body: { status: "pending" } });
  });
  it("an address Mailchimp won't re-add (cleaned, compliance, permanently deleted): 'forgotten'", async () => {
    expect(await addPendingMember(who, opts(fake(json(200, { status: "cleaned" })).fetch))).toEqual({ error: "forgotten" });
    expect(await addPendingMember(who, opts(fake(json(400, { title: "Member In Compliance State" })).fetch))).toEqual({ error: "forgotten" });
    expect(await addPendingMember(who, opts(fake(json(400, { title: "Forgotten Email Not Subscribed" })).fetch))).toEqual({ error: "forgotten" });
    expect(await addPendingMember(who, opts(fake(json(200, { status: "unsubscribed" }), json(400, { title: "Member In Compliance State" })).fetch))).toEqual({ error: "forgotten" });
  });
  it("an address Mailchimp says is fake: 'invalid'", async () => {
    expect(await addPendingMember(who, opts(fake(json(400, { title: "Invalid Resource" })).fetch))).toEqual({ error: "invalid" });
  });
  it("Mailchimp down, a wrong key, or no answer: 'unavailable'", async () => {
    expect(await addPendingMember(who, opts(fake(json(503, { title: "Service Unavailable" })).fetch))).toEqual({ error: "unavailable" });
    expect(await addPendingMember(who, opts(fake(json(401, { title: "API Key Invalid" })).fetch))).toEqual({ error: "unavailable" });
    expect(await addPendingMember(who, opts(fake(new Error("ECONNRESET")).fetch))).toEqual({ error: "unavailable" });
  });
  it("a failed tag call never undoes a signup", async () => {
    expect(await addPendingMember(who, opts(fake(json(200, { status: "pending" }), json(500, {})).fetch))).toBe("pending");
  });
  it("no key, or a key without a data-center suffix: 'not-configured', and nothing is sent", async () => {
    const { fetch, calls } = fake();
    expect(await addPendingMember(who, opts(fetch, ""))).toEqual({ error: "not-configured" });
    expect(await addPendingMember(who, opts(fetch, "abc123-evil.example/x"))).toEqual({ error: "not-configured" });
    expect(calls).toEqual([]);
  });
});

describe("mergeNewsletter: Admin → Newsletter page over the default pitch", async () => {
  const { DEFAULT_NEWSLETTER: D, mergeNewsletter } = await import("@/lib/newsletter/content");
  it("shows the default pitch when nothing is set or everything was cleared", () => {
    expect(mergeNewsletter(null)).toEqual(D);
    expect(mergeNewsletter({ headline: " ", reasons: [] })).toEqual(D);
  });
  it("overrides only what staff filled in, trimmed", () => {
    const c = mergeNewsletter({ headline: " Get in the Fam ", reasons: [{ channel: "green", title: "Events", body: "First." }, { channel: "green", title: " ", body: "x" }] });
    expect(c.headline).toBe("Get in the Fam");
    expect(c.dek).toBe(D.dek);
    expect(c.reasons).toEqual([{ channel: "green", title: "Events", body: "First." }]);
  });
  it("links only to https pages (privacy policy, latest issue)", () => {
    expect(mergeNewsletter({ latestIssueUrl: "javascript:alert(1)" }).latestIssueUrl).toBeNull();
    expect(mergeNewsletter({ latestIssueUrl: " https://eepurl.com/phfRaptJh2 " }).latestIssueUrl).toBe("https://eepurl.com/phfRaptJh2");
    expect(D.privacyUrl).toBe("https://radiomilwaukee.org/privacy-policy/");
  });
});
