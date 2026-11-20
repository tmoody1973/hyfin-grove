# Launch plan 13: Payload Form Builder, email and spam protection

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. TDD per task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Staff build public forms in the admin (fields, a confirmation message, who gets notified), and the site renders any of them in the Signal style. Submissions are stored in Payload, staff get an email, and bots are kept out. The first form is "Submit music" (`/submit-music`), which replaces the old `/submitmusic` page that currently redirects home.

**Architecture:**
- **Payload's official `@payloadcms/plugin-form-builder`** adds a `forms` collection (staff build forms) and a `form-submissions` collection. Anyone can create a submission; only staff can read them.
- **One `<FormRenderer form={…} />` component** draws any form's fields: text, email, textarea, select, checkbox, message. A server action posts the answers.
- **Spam protection** happens before anything is saved: a hidden "honeypot" field (a decoy only bots fill in), Cloudflare Turnstile (an invisible human check), and a per-IP limit.
- **Email:** Payload gets an email adapter so the plugin can send notifications. The provider is decided in Task 1.

**Tech Stack:** Payload 3.94, `@payloadcms/plugin-form-builder`, a Payload email adapter, Cloudflare Turnstile, Next.js 16 server actions.

**Spec:** the legacy-address list in `data/legacy-redirects.json` (`/submitmusic/`, `/submit-event/` and `/hyfin-fam-newsletter/` are marked "no replacement yet"). Tarik, 2026-11-20: add the official forms plugin; the newsletter (plan 14) follows it.

## Global Constraints
- **Payload skill rules.** The plugin's own access rules stay: create is public; read and update are staff only. Hooks that write to other collections pass `req`.
- **Submissions keep only what the form asks for.** No IP address or user agent is stored; the IP is used for the rate limit only, in memory. Submissions older than 12 months are deleted by the existing cron.
- **No secrets in code.** Keys are environment variables in Vercel and `.env.local`: `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, and the email provider's key.
- **The build must not need these keys** (CI has none). Without them the forms render, Turnstile is skipped in dev, and email is logged instead of sent.

## Review Focus
1. **A bot posts straight to the server action** (no browser): the honeypot and the Turnstile check on the server both refuse it. Test.
2. **A form staff deleted, or saved as a draft,** is never shown or accepted.
3. **An attacker sends extra fields the form doesn't have:** they're dropped, never stored.
4. **Email provider down:** the submission is still saved and the visitor still sees the confirmation. The failure is logged.
5. **A huge textarea (1 MB):** capped at 5,000 characters per field.

---

### Task 1: Email provider (decision first)
- [ ] Decide with Tarik, written down in decision record 014:
  - **(a) Resend** through the Vercel Marketplace, with `@payloadcms/email-resend`;
  - **(b) Radio Milwaukee's Google Workspace SMTP** (already paid for), with `@payloadcms/email-nodemailer`;
  - **(c) Mailchimp Transactional** (a paid add-on).

  Check the Marketplace before recommending. Cost, deliverability and who owns the sending domain go in the record.
- [ ] Add the adapter to `payload.config.ts`. Send one test email to Tarik. Commit.

### Task 2: The plugin and the forms model
**Files:** `payload.config.ts` (`formBuilderPlugin({ fields: { text, email, textarea, select, checkbox, message }, formOverrides, formSubmissionOverrides })`), migration, `lib/forms/submit.ts` (`cleanSubmission(form, raw): { ok; data } | { ok: false; errors }`).
- [ ] Failing tests: fields the form doesn't have are dropped; required fields are enforced; email format is checked; values are capped at 5,000 characters.
- [ ] Implement; `migrate:create form_builder`, read it, apply it (shared database: ledger it).
- [ ] Commit `feat: Payload form builder`.

### Task 3: Spam protection
**Files:** `lib/forms/turnstile.ts` (`verifyTurnstile(token, ip)`), `lib/forms/rateLimit.ts` (in memory, 5 a minute per IP per form), honeypot field `company_url`.
- [ ] Failing tests: honeypot filled → silently "accepted" but not saved; Turnstile failure → refused; the 6th post in a minute → refused.
- [ ] Commit `feat: spam protection for public forms`.

### Task 4: Render a form, and the first one
**Files:** `components/forms/FormRenderer.tsx` (Signal style, `useActionState`, values kept on error), `app/(frontend)/[category]/page.tsx` or a `/f/[slug]` route (decide: forms embedded in Pages vs their own address), `scripts/seed-forms.ts` (creates "Submit music": name, artist name, email, link to the track, genre select, Milwaukee artist yes/no, message; notifies the music team).
- [ ] Browser check: submit with a typo (values kept), then for real. The submission shows in the admin; the notification email arrives.
- [ ] Redirect `/submitmusic/` to `/submit-music`. Smoke check. Final review. PR.
