# 014: Public forms use Payload's Form Builder, and notifications go out through Resend

**Decision.** Staff build public forms (the first is "Submit music" at `/submit-music`) with Payload's official Form Builder plugin. Submissions are stored in Payload, and staff get an email through **Resend**, an email-sending service. The mail goes out from `mail.hyfin.org` on Radio Milwaukee's existing Resend account.

## Why this came up
The old WordPress site had a music submission page, an event submission page and a newsletter signup. The new site sent all three addresses to the home page "until there's a replacement". Tarik asked to add the official forms plugin, with the newsletter (plan 14) to follow. A form needs two things the site didn't have: a way to email staff when something arrives, and protection against bots. What was at stake: a form that silently loses submissions, or one that fills the music team's inbox with spam.

## Options
For the email side:
1. **Resend on Radio Milwaukee's existing Resend team (chosen).** Cost: three or four DNS records (entries in the domain's address book that prove we're allowed to send as it) on `mail.hyfin.org`. Free if the current plan has a domain slot; otherwise about $20 a month.
2. **Resend bought through the Vercel Marketplace.** Same service, with the key set up automatically. But because the account already exists, Vercel required a paid plan for a second, separate one.
3. **Radio Milwaukee's Google Workspace mail.** No new vendor, but it needs a Workspace admin to set up an app password or relay, and Google's daily sending limits apply.
4. **Mailchimp Transactional.** The same company as the newsletter, but a paid add-on with its own setup. The most cost and work for a handful of emails a day.

For the forms themselves, the alternative was to hand-build each form as code. That's cheaper for one form, but staff couldn't add the next one (event submissions, contests) without a developer.

## What we chose and why
Tarik chose Resend on the existing team, and the Form Builder plugin. Claude recommended both. Resend is the only email option on the Vercel Marketplace and the simplest to run. Sending from a subdomain (`mail.`) keeps form email's reputation separate from people's real `hyfin.org` inboxes.

Spam protection runs before anything is saved, in this order:
1. A hidden "decoy" field that only bots fill in.
2. A limit of 5 posts a minute per visitor.
3. Cloudflare Turnstile, an invisible check that the visitor is a person.

The plugin's own public API for creating submissions is switched off, so bots can't go around those checks.

## What we gave up
- **Email depends on another vendor.** If Resend is down, the submission is still saved and logged, but staff only see it in the admin.
- **Two more keys to manage:** Resend and Turnstile. Until they're set, emails are written to the server log instead of sent, and the human check is skipped.
- **The 5-a-minute limit is kept in each server's memory,** so a determined bot spread across servers gets a few extra tries.
- **Submissions are deleted after 12 months.** Anything worth keeping has to be copied out before then.

## How we'll know if this was right
- After a month live, the music team has received every "Submit music" notification, checked against the submissions list in the admin.
- Spam that reaches the admin stays under a handful a week.
- Staff build a second form (for example, event submissions) without a code change.

## What actually happened
