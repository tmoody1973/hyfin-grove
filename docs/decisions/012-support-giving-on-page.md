# 012 — Giving on hyfin.org: Funraise's own form, opened on our page

**Decision.** The new `/support` page keeps donors on hyfin.org. Each price button ($10/month, $120/year, $84/month, $1000/year) opens Radio Milwaukee's existing Funraise form for that plan as a popup over our page, already set to the amount and frequency. When Funraise reports the gift went through, our "Signal received. Thank you" screen replaces the checkout panel. Card, PayPal and bank details are typed into Funraise's own secure frame, never into our code.

## Why this came up
Tarik asked for a seamless giving experience "using the Funraise API." Today's hyfin.org/support sends donors to four Funraise-hosted pages. Its embedded form is broken: the page asks Funraise to place form 44749 in a container that doesn't exist. What was at stake: payments are the one place where a clever-looking shortcut (our own card fields) would mean handling card numbers, which brings card-security compliance rules (PCI) and real risk.

## Options
1. **Hosted pages (today).** Cost: the donor leaves our site, and we never learn the gift happened, so there's no thank-you of our own.
2. **Funraise's popup on our page (chosen).** Funraise's script opens the form when a button carries the form's number, and it reports success to our page. Cost: the form looks like Funraise (white, Funraise fonts); we choose only button color and logo in Funraise's settings.
3. **Funraise's form placed inside our panel (the mockup's look).** Cost: Funraise's docs say placed forms are not mobile-responsive and recommend the popup.
4. **Our own card fields sending to Funraise's API.** Not possible: Funraise's API records gifts and reads reports but has no way to charge a new card or bank account (help.funraise.io "Funraise API"; API reference funraise.stoplight.io).

## What we chose and why
Option 2. The plan is Claude's; Tarik asked for seamless giving and approved plan 8. No Funraise setup was needed: the four forms already exist, one per plan. Their public settings (2026-11-20) show the monthly forms allow only monthly gifts and the yearly forms are one payment for the year. If Funraise's script is blocked or down, the buttons fall back to the same hosted pages as today.

## What we gave up
- Funraise's fields inside our panel, as drawn in the mockup.
- Apple Pay on the new site until the domain is verified with Funraise support (hyfin.org has no verification file today). Apple Pay only applies to the two one-time forms anyway.
- Funraise documents no test mode, so the success screen can only be seen for real with a real gift (Tarik's $10 test, refunded).

## How we'll know if this was right
Funraise's reports show gifts arriving from the new page after launch. Fewer abandoned checkouts than the hosted pages (Funraise's form analytics). No donor reports landing on a Funraise page they didn't expect.

## What actually happened
