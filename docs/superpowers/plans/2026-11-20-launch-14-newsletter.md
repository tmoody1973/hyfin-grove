# Launch plan 14: HYFIN Fam newsletter signup, into Mailchimp

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. TDD per task. Steps use checkbox (`- [ ]`) syntax. **Depends on plan 13** (Form Builder, issue #30). Issue #31.

**Goal:** People join the HYFIN newsletter from a page that makes the case for it (`/newsletter`), from a band on the homepage, from the footer of every page, and at the end of every story. Each signup lands in Mailchimp's **HYFIN** audience as "pending", and Mailchimp sends one confirmation email (double opt-in, so bots never become subscribers). Each signup is tagged with where it came from, so we can see which spot works.

**Architecture:**
- **One "Newsletter" form in Form Builder** (plan 13). Staff edit its labels and confirmation message in the admin; every signup box on the site renders it, with email plus an optional first name.
- **A submission hook adds the person to Mailchimp:** `PUT /3.0/lists/{audience}/members/{md5(lowercase email)}` with `status_if_new: "pending"`, `merge_fields.FNAME`, and tags `hyfin-site` and `signup:<home|footer|story|events|page>`.
- **Once Mailchimp accepts the address, the submission is deleted,** so Payload doesn't keep a second copy of the email list. Failed attempts stay for retry, then are deleted after 7 days.
- **The page's pitch and the placements** are settings in a `newsletter-page` global (same pattern as Admin → Support page, plan 10).

**Tech Stack:** Payload Form Builder (plan 13), Mailchimp Marketing API v3 (`fetch`, no SDK), Next.js 16, Vitest.

**Spec / design:**
- Homepage mockup `docs/mockups-html/screens/01-home/homepage.html`, section `#join`: "Join the HYFIN Fam / New music, interviews and what's happening in Milwaukee, in your inbox. / Email address / Subscribe", a big glitch headline (red/blue split) with the form beside it.
- The contests mockup's "We'll send one email to confirm" (double opt-in).
- Tarik, 2026-11-20: "newsletter page needs to make the case on why someone should sign up."

## Global Constraints
- **Secrets as environment variables only:** `MAILCHIMP_API_KEY` (in `.env.local`; add it to Vercel production when building) and `MAILCHIMP_AUDIENCE_ID=dbf0d7bdf6`. The server prefix comes from the end of the key (`us7`), so there's no separate setting. Never in code or the database.
- **The audience (read-only check, 2026-11-20):** "HYFIN List", 3,383 members, 470 unsubscribed over time, from-name "HYFIN". Audience-level double opt-in is off; this plan still sends new signups as `pending`, so each gets one confirmation email. It already has `FNAME`, plus `LNAME`, `PHONE` and social fields. Tags: `hyfin-site`, `signup:<placement>`.
- **Never mark anyone "subscribed" directly.** Always "pending", so Mailchimp's confirmation email decides. Existing members:
  - **Already subscribed:** the visitor sees "You're already in the Fam."
  - **Unsubscribed earlier:** set to "pending" again; they get one confirmation email.
  - **"Cleaned" or permanently deleted by Mailchimp:** Mailchimp refuses re-adding them. Show a link to the audience's Mailchimp-hosted signup form. (Task 1 checks the exact error titles against the API reference.)
- **Spam protection from plan 13** (honeypot, Turnstile, per-IP limit) applies to every signup box. One signup box per page view sends at most one request.
- **Placement tag** on every signup: `home`, `footer`, `story`, `events`, `page`.
- **Copy claims Tarik must confirm before launch** (marked ⚠ in the draft below): how often it's sent, and "we never sell your address" (must match Radio Milwaukee's privacy policy).

## The case for signing up (draft copy for `/newsletter`; Tarik edits in the admin)
- **Headline (glitch):** Join the HYFIN Fam
- **Dek:** New music, interviews and what's happening in Milwaukee, in your inbox.
- **What HYFIN List actually sends (last 8 campaigns, March–June 2026; opens 31–85%):** Anti-Gala VIP access and tickets before everyone else, HYFIN 100 perks, membership drives, and "Enter to Win" giveaways. There's no fixed schedule, so the page promises **first access**, not a frequency. ⚠ Tarik: confirm, or start a regular send.
- **What's inside**, one block per Signal channel:
  - 🟥 **On air:** what HYFIN is playing right now, and the artists we can't stop spinning.
  - 🟩 **Milwaukee and events:** first access to HYFIN's own events (Anti-Gala VIP tickets went to the list before anyone else), plus concerts by artists we play.
  - **Perks and giveaways:** member and HYFIN 100 perks, and "Enter to Win" packages.
  - 🟦 **Series and originals:** New Music Mondays, Ladies First, Rhythm Lab and HYFIN's interviews and stories.
- **Proof (optional, Tarik decides):**
  - a link to the latest issue: Mailchimp gives every campaign an archive link (e.g. the 2026-06-08 Anti-Gala thank-you, 61% opened);
  - "Join [N] people in the HYFIN Fam" (Mailchimp's member count, refreshed daily), only if the number helps.
- **Trust line:** One email to confirm. Unsubscribe anytime. ⚠ *We never sell your address.* Plus a link to the privacy policy.
- **Form:** first name (optional), email, Subscribe. The success state says "Check your inbox to confirm. Look for an email from HYFIN."

## Where it goes (recommendation)

| Place | What | Why |
|---|---|---|
| **`/newsletter`** | The full case (above), with the form near the top and again at the bottom | Somewhere to link from social, on-air reads and email signatures. Old `/hyfin-fam-newsletter/` redirects here (today it goes home). |
| **Homepage** | The mockup's "Join the HYFIN Fam" band, placed **right after "04 Heard on HYFIN. Live in Milwaukee."** instead of at the very bottom | The concerts list just above is a sample of what the newsletter delivers, so the ask lands in context. Most visitors never reach the last section. (The mockup puts it last; easy to move.) |
| **Every story** | One line plus the email box after the story body: "Get stories like this in your inbox" | Someone who just finished a story is the most likely to sign up. |
| **Footer, every page** | A compact email box plus a "Newsletter" link | Always within reach, without crowding the header. |
| **Events page** | "Get Milwaukee events in your inbox" under the list | It's the newsletter's strongest promise. |
| **Header nav** | **No new top-level item.** The header already holds 5 sections, Support and Stabilize; a sixth item crowds phones. "Support" and the footer cover it. If Tarik wants it in the header: a small "Newsletter" text link before Support, desktop only. | Keeps the header readable. The placement tags will show whether a header link is needed. |

## Review Focus
1. **The same email signs up twice** (homepage, then footer): one Mailchimp member, one confirmation email, and the visitor sees "already in" or "check your inbox", never an error.
2. **Mailchimp is down or the key is wrong:** the visitor sees "Something went wrong, try again," the attempt is kept for retry, and the error is logged without the email address.
3. **Upper and lower case:** the subscriber hash uses the lowercase email ("Tarik@…" and "tarik@…" are one member).
4. **No email address in logs, URLs or analytics.**
5. **CI builds with no Mailchimp keys:** the signup shows; submitting in dev logs "Mailchimp not configured."

---

### Task 1: Mailchimp client
**Files:** `lib/newsletter/mailchimp.ts`: `subscriberHash(email)`, `addPendingMember({ email, firstName, tags }): Promise<"pending" | "already" | "resubscribe-sent" | { error: "forgotten" | "invalid" | "unavailable" }>`.
- [ ] Read Mailchimp's current reference for "Add or update list member" and its error titles. Failing tests with a fake `fetch` cover each outcome, the lowercase hash, and the basic-auth header. Implement. Commit.

### Task 2: The Newsletter form and the hook
**Files:** `scripts/seed-forms.ts` (adds the "Newsletter" form), a hook on `form-submissions`, scoped to the newsletter form, that calls `addPendingMember` and deletes the submission on success; cron cleanup after 7 days.
- [ ] Failing tests: success deletes the submission; failure keeps it marked for retry; the retry cron re-sends kept ones. Commit.

### Task 3: `/newsletter` and the `newsletter-page` global
- [ ] Global: the pitch above (all fields optional, with fallback copy as in plan 10), proof options, trust line. Page in the Signal style (glitch headline, three channel blocks). Redirect `/hyfin-fam-newsletter/` and `/newsletter/` addresses. Browser check desktop and phone. Commit.

### Task 4: Placements
**Files:** `components/newsletter/SignupBox.tsx` (`placement` prop), homepage band after section 04, story page end, footer, events page.
- [ ] Browser: each placement sends its tag (fake Mailchimp in dev). Full suite, build with no keys, old-link check, final review, PR.

### Task 5: Live check (Tarik)
- [ ] Sign up with a real address on production. The Mailchimp confirmation email arrives; after confirming, the contact shows in the HYFIN audience with tags `hyfin-site` and `signup:page`.
