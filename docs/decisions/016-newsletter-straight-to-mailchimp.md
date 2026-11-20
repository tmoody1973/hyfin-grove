# 016: Newsletter signups go straight to Mailchimp, with no copy kept on the site

**Decision.** A signup box on hyfin.org runs the site's spam checks, then adds the person to Mailchimp's HYFIN List as "pending". Mailchimp then sends its own confirmation email. The site stores nothing: no email address in Payload, none in the logs.

## Why this came up
Plan 14 first routed each signup through the Form Builder (plan 13). A Payload record held the email until Mailchimp accepted it, failed attempts waited for a retry job, and a cleanup job deleted the rest. While building it, Claude saw that this meant keeping people's addresses on the site purely to delete them later, plus a hook and two cleanup jobs to maintain. What was at stake: a second copy of the mailing list sitting in another database, or signups lost while Mailchimp was down.

## Options
1. **Straight to Mailchimp (chosen).** The fewest moving parts, and no second copy of anyone's address. Cost: if Mailchimp is down at the moment someone signs up, they see "Something went wrong, try again". If they don't come back, the signup is lost.
2. **Store first, retry later (the original plan).** Survives a Mailchimp outage. Cost: email addresses sit in Payload until they're sent, plus a hook, a retry job and a cleanup job.
3. **Embed Mailchimp's own signup form.** No code on our side. Cost: Mailchimp's look instead of the Signal design, no per-placement tags, and a third-party script on every page.

## What we chose and why
Claude made the call while building (Tarik had approved the plan, not this detail) and flagged it in the PR for Tarik to overrule. Mailchimp outages are rare and short. A visitor who sees "try again" can try again. A copy of the list that nobody needs is a privacy cost that never goes away.

## What we gave up
- **Signups during a Mailchimp outage are lost** unless the visitor retries.
- **There's no list of signup attempts on our side to audit.** Mailchimp's audience and tags are the only record.

## How we'll know if this was right
Vercel's logs show `[newsletter] Mailchimp unavailable` rarely, a handful of times a month at most. Mailchimp's `signup:<placement>` tags show signups arriving from every placement.

## What actually happened
