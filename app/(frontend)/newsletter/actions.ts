"use server";

import { headers } from "next/headers";
import { cleanSubmission, HONEYPOT } from "@/lib/forms/submit";
import { createRateLimiter } from "@/lib/forms/rateLimit";
import { verifyTurnstile } from "@/lib/forms/turnstile";
import { addPendingMember, HOSTED_SIGNUP_URL, PLACEMENTS, type Placement } from "@/lib/newsletter/mailchimp";

export type SignupState =
  | { status: "idle" }
  | { status: "error"; at: number; message: string; email?: string; firstName?: string; fallbackUrl?: string }
  | { status: "done"; kind: "pending" | "already" | "resubscribe-sent" };

const allow = createRateLimiter(5, 60_000);
const FIELDS = [
  { blockType: "email", name: "email", label: "Email", required: true },
  { blockType: "text", name: "firstName", label: "First name" },
];

/**
 * A newsletter signup (plan 14): plan 13's spam checks, then straight to Mailchimp's HYFIN List as "pending".
 * Nothing is stored on this site, and no email address is ever logged.
 */
export async function subscribe(_prev: SignupState, fd: FormData): Promise<SignupState> {
  if (String(fd.get(HONEYPOT) ?? "").trim()) return { status: "done", kind: "pending" }; // a bot: pretend, send nothing
  const email = String(fd.get("email") ?? "");
  const firstName = String(fd.get("firstName") ?? "");
  const again = (message: string, extra: Partial<Extract<SignupState, { status: "error" }>> = {}): SignupState => ({ status: "error", at: Date.now(), message, email, firstName, ...extra });

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  if (!allow(`${ip ?? "unknown"}|newsletter`)) return again("Too many tries. Wait a minute and try again.");
  if (!(await verifyTurnstile(String(fd.get("cf-turnstile-response") ?? ""), ip, { secret: process.env.TURNSTILE_SECRET_KEY }))) {
    return again("We couldn't confirm you're a person. Try again.");
  }
  const clean = cleanSubmission(FIELDS, { email, firstName });
  if (!clean.ok) return again(clean.errors.email ?? clean.errors.firstName ?? "Check your email address.");
  const value = (f: string) => clean.data.find((d) => d.field === f)?.value ?? "";
  const raw = String(fd.get("placement") ?? "");
  const placement: Placement = (PLACEMENTS as readonly string[]).includes(raw) ? (raw as Placement) : "page";

  const result = await addPendingMember(
    { email: value("email"), firstName: value("firstName"), tags: ["hyfin-site", `signup:${placement}`] },
    { apiKey: process.env.MAILCHIMP_API_KEY, audienceId: process.env.MAILCHIMP_AUDIENCE_ID },
  );
  if (typeof result === "string") return { status: "done", kind: result };
  switch (result.error) {
    case "invalid":
      return again("Mailchimp can't send to that address. Check it and try again.");
    case "forgotten":
      return again("This address left the list before, so Mailchimp needs you to rejoin on its own page.", { fallbackUrl: HOSTED_SIGNUP_URL });
    case "not-configured":
      console.error("[newsletter] Mailchimp not configured (MAILCHIMP_API_KEY / MAILCHIMP_AUDIENCE_ID)");
      return again("Signups are down for a moment. Try again later.");
    default:
      console.error(`[newsletter] Mailchimp unavailable (signup:${placement})`);
      return again("Something went wrong. Try again in a minute.");
  }
}
