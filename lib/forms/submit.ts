/**
 * Public form answers → what gets stored (plan 13). Only the form's own fields survive, so a bot can't add
 * fields, and nothing longer than MAX_CHARS is accepted.
 */
export const MAX_CHARS = 5000;

/** The decoy field: hidden from people, filled in by bots. */
export const HONEYPOT = "company_url";

export type FormField = {
  blockType: string;
  name?: string | null;
  label?: string | null;
  required?: boolean | null;
  options?: { label: string; value: string }[] | null;
  [key: string]: unknown;
};

export type SubmissionRow = { field: string; value: string };
export type CleanResult = { ok: true; data: SubmissionRow[] } | { ok: false; errors: Record<string, string> };

/** Blocks a visitor answers; "message" is staff text with no input. */
const INPUTS = new Set(["text", "email", "textarea", "select", "checkbox"]);
// ponytail: pragmatic email check (something@something.tld); the confirmation email is the real test.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

function check(f: FormField & { name: string }, raw: unknown): { value: string } | { error: string } {
  const label = f.label || f.name;
  if (f.blockType === "checkbox") {
    const on = raw === "on" || raw === "true";
    return f.required && !on ? { error: `${label} is required.` } : { value: String(on) };
  }
  const value = str(raw);
  if (value.length > MAX_CHARS) return { error: "Keep this under 5,000 characters." };
  if (!value) return f.required ? { error: `${label} is required.` } : { value };
  if (f.blockType === "email" && !EMAIL.test(value)) return { error: "Enter a valid email address." };
  if (f.blockType === "select" && !(f.options ?? []).some((o) => o.value === value)) return { error: "Choose one of the options." };
  return { value };
}

export function cleanSubmission(fields: readonly FormField[], raw: Record<string, unknown>): CleanResult {
  const data: SubmissionRow[] = [];
  const errors: Record<string, string> = {};
  for (const f of fields) {
    if (!INPUTS.has(f.blockType) || !f.name) continue;
    const r = check(f as FormField & { name: string }, raw[f.name]);
    if ("error" in r) errors[f.name] = r.error;
    else data.push({ field: f.name, value: r.value });
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, data };
}
