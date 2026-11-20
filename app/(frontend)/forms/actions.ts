"use server";

import config from "@payload-config";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getPayload } from "payload";
import { cleanSubmission, HONEYPOT, type FormField } from "@/lib/forms/submit";
import { createRateLimiter } from "@/lib/forms/rateLimit";
import { verifyTurnstile } from "@/lib/forms/turnstile";

export type FormState =
  | { status: "idle" }
  | { status: "error"; at: number; message?: string; errors?: Record<string, string>; values?: Record<string, string> }
  | { status: "sent" };

const allow = createRateLimiter(5, 60_000);

const valuesOf = (fd: FormData) =>
  Object.fromEntries([...fd.entries()].filter(([k, v]) => typeof v === "string" && k !== HONEYPOT && !k.startsWith("cf-") && !k.startsWith("$")) as [string, string][]);

/**
 * A visitor submits a public form (plan 13). Spam checks run before anything is saved: the honeypot, a per-visitor
 * limit, then Cloudflare Turnstile. Only the form's own fields are stored, and the plugin emails staff afterwards
 * (a failed email is logged, never shown to the visitor).
 */
export async function submitForm(_prev: FormState, fd: FormData): Promise<FormState> {
  const h = await headers();
  const payload = await getPayload({ config });
  const formId = Number(fd.get("formId"));
  const form = Number.isInteger(formId) && formId > 0 ? await payload.findByID({ collection: "forms", id: formId, depth: 0, disableErrors: true }) : null;
  if (!form) return { status: "error", at: Date.now(), message: "This form isn't available any more." };

  // A bot filled in the decoy: pretend it worked, store nothing.
  if (String(fd.get(HONEYPOT) ?? "").trim()) return { status: "sent" };

  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const values = valuesOf(fd);
  if (!allow(`${ip ?? "unknown"}|${formId}`)) return { status: "error", at: Date.now(), message: "Too many tries. Wait a minute and send it again.", values };
  if (!(await verifyTurnstile(String(fd.get("cf-turnstile-response") ?? ""), ip, { secret: process.env.TURNSTILE_SECRET_KEY }))) {
    return { status: "error", at: Date.now(), message: "We couldn't confirm you're a person. Try sending it again.", values };
  }

  const clean = cleanSubmission((form.fields ?? []) as FormField[], Object.fromEntries(fd.entries()));
  if (!clean.ok) return { status: "error", at: Date.now(), errors: clean.errors, values };

  try {
    // overrideAccess: the public API can't create submissions (payload.config.ts); this checked path can.
    await payload.create({ collection: "form-submissions", data: { form: formId, submissionData: clean.data } });
  } catch (err) {
    payload.logger.error(`[forms] submission to form ${formId} failed: ${err instanceof Error ? err.message : String(err)}`);
    return { status: "error", at: Date.now(), message: "Couldn't send it. Try again in a minute.", values };
  }
  const url = form.confirmationType === "redirect" ? form.redirect?.url : null;
  if (url && /^(\/(?!\/)|https:\/\/)/.test(url)) redirect(url);
  return { status: "sent" };
}
