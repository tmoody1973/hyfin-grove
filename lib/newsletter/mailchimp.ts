import { createHash } from "node:crypto";

/**
 * Newsletter signups into Mailchimp's HYFIN audience (plan 14). Never marks anyone "subscribed": new people go in
 * as "pending" and Mailchimp's confirmation email decides. Reference: mailchimp.com/developer/marketing/api/list-members
 * (PUT …/members/{hash}: status_if_new applies only to someone new; POST …/members/{hash}/tags).
 */
export type SignupResult = "pending" | "already" | "resubscribe-sent" | { error: "forgotten" | "invalid" | "unavailable" | "not-configured" };

type Opts = { apiKey: string | undefined; audienceId: string | undefined; fetch?: typeof fetch };

/** Mailchimp's member id: the md5 of the lowercase email. */
export const subscriberHash = (email: string) => createHash("md5").update(email.trim().toLowerCase()).digest("hex");

/** Mailchimp titles for addresses it won't put back on the list. */
const REFUSED = new Set(["Member In Compliance State", "Forgotten Email Not Subscribed"]);

type Reply = { ok: boolean; status: number; body: { status?: string; title?: string } };

export async function addPendingMember({ email, firstName, tags }: { email: string; firstName?: string; tags: string[] }, { apiKey, audienceId, fetch: f = fetch }: Opts): Promise<SignupResult> {
  // The key ends in its data center ("-us7"); anything else would point requests at another host.
  const dc = apiKey?.match(/-(us\d{1,3})$/)?.[1];
  if (!apiKey || !dc || !audienceId || !/^[a-z0-9]+$/i.test(audienceId)) return { error: "not-configured" };
  const member = `https://${dc}.api.mailchimp.com/3.0/lists/${audienceId}/members/${subscriberHash(email)}`;
  const call = async (url: string, method: string, body: unknown): Promise<Reply> => {
    const res = await f(url, {
      method,
      headers: { authorization: `Basic ${Buffer.from(`hyfin:${apiKey}`).toString("base64")}`, "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    return { ok: res.ok, status: res.status, body: res.status === 204 ? {} : ((await res.json().catch(() => ({}))) as Reply["body"]) };
  };
  const fail = (r: Reply): SignupResult => ({ error: REFUSED.has(r.body.title ?? "") ? "forgotten" : r.body.title === "Invalid Resource" ? "invalid" : "unavailable" });

  try {
    const name = firstName?.trim();
    const put = await call(member, "PUT", { email_address: email.trim().toLowerCase(), status_if_new: "pending", ...(name ? { merge_fields: { FNAME: name } } : {}) });
    if (!put.ok) return fail(put);
    let result: SignupResult;
    if (put.body.status === "subscribed") result = "already";
    else if (put.body.status === "pending") result = "pending";
    else if (put.body.status === "unsubscribed" || put.body.status === "archived") {
      const again = await call(member, "PATCH", { status: "pending" });
      if (!again.ok) return fail(again);
      result = "resubscribe-sent";
    } else return { error: "forgotten" }; // "cleaned" (bounced) and anything new Mailchimp adds
    // Tags show which signup box worked; a failure here never undoes the signup.
    await call(`${member}/tags`, "POST", { tags: tags.map((name) => ({ name, status: "active" })) }).catch(() => undefined);
    return result;
  } catch {
    return { error: "unavailable" };
  }
}

/** The HYFIN List's own Mailchimp signup page: for addresses Mailchimp won't let the site re-add. */
export const HOSTED_SIGNUP_URL = "https://hyfin.us7.list-manage.com/subscribe?u=5661fd65be23b95118fe7686f&id=dbf0d7bdf6";

/** Where a signup box sits; sent to Mailchimp as the tag signup:<placement>. */
export const PLACEMENTS = ["home", "footer", "story", "events", "playlist", "page"] as const;
export type Placement = (typeof PLACEMENTS)[number];
