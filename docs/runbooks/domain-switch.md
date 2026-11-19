# Runbook: switch hyfin.org to the new site

Written for Tarik (plan 7, task 8). Claude does not run these steps. Each step says how to check it worked. Do them in order, on a quiet weekday morning, with time to roll back.

**What changes:** hyfin.org stops pointing at the WordPress server and starts pointing at the Vercel project `hyfin-grove`. The database, stories and staff accounts are already on the new site. Nothing is copied on the day.

**Rollback at any point:** point hyfin.org's DNS back at the WordPress server (step 2's "before" values). WordPress keeps running untouched until you retire it.

---

## Before the day

1. **Beta checklist done.**
   - Test posts wiped from the shared database (there are a few from plan 1).
   - Tarik's review queue worked through (Admin → Posts, filter "needs review").
   - Staff roles checked (Admin → Users): only Tarik is `admin`; everyone else `editor`.
2. **Old links pass.** On the latest production deploy:
   `pnpm tsx scripts/check-old-links.ts --csv docs/Pages_and_screens_Page_path_and_screen_class.csv`
   Expect `FAIL 0` (everything else passes or is on `data/link-check-exclusions.txt`). The CSV stays out of git.
3. **Write down the current DNS records** for `hyfin.org` and `www.hyfin.org` (registrar or DNS host). These are the rollback values.
4. **Lower the DNS TTL** (time to live: how long the internet caches the record) on those records to 300 seconds, a day ahead, so the switch and any rollback take minutes, not hours.

## On the day

1. **Add the domain in Vercel.** Vercel → project `hyfin-grove` → Settings → Domains → add `hyfin.org` and `www.hyfin.org` (redirect `www` to the bare domain, or the reverse; pick one and keep it).
   *Check:* Vercel shows the DNS records it wants.
2. **Point DNS at Vercel.** At the DNS host, replace the `hyfin.org` and `www` records with the values Vercel showed.
   *Check:* `dig +short hyfin.org` returns Vercel's address; Vercel's Domains page turns green and issues the HTTPS certificate (a few minutes).
3. **Tell the site its real address.** Vercel → Settings → Environment Variables → Production: set `NEXT_PUBLIC_SITE_URL=https://hyfin.org`. If `GOOGLE_OAUTH_SERVER_URL` is set for Production, change it to `https://hyfin.org` too (it overrides the site address for staff sign-in; leave it unset otherwise). Redeploy production (Deployments → latest → Redeploy).
   *Check:* `curl -s https://hyfin.org/music | grep canonical` shows `https://hyfin.org/music`; `https://hyfin.org/sitemap.xml` lists `https://hyfin.org/...` addresses; `https://hyfin.org/feed.xml` links to hyfin.org.
4. **Google sign-in for staff.** Google Cloud Console → APIs & Services → Credentials → the HYFIN OAuth client → Authorized redirect URIs: add `https://hyfin.org/api/users/oauth/google/callback` (keep the vercel.app one until the switch is settled).
   *Check:* sign in at `https://hyfin.org/admin` with a radiomilwaukee.org Google account.
5. **Re-run the old-link check against hyfin.org.**
   `pnpm tsx scripts/check-old-links.ts --csv docs/Pages_and_screens_Page_path_and_screen_class.csv --base https://hyfin.org`
   *Check:* `FAIL 0`. Spot-check by hand: `https://hyfin.org/2024/04/07/szas-lyrics-validate-my-experience-as-a-black-woman/` lands on the story; `https://hyfin.org/playlist-2/` lands on the playlist; `https://hyfin.org/thewiz` shows the page.
6. **Search engines.** Google Search Console → the hyfin.org property → Sitemaps → submit `https://hyfin.org/sitemap.xml`. Use URL Inspection on the homepage and one story.
7. **Smoke checks.** In GitHub, run the "Smoke test deployments" workflow against production, and update its base address if it still points at hyfin-grove.vercel.app.

## After the day

- Watch Vercel's logs and Search Console's "Not found (404)" report for a week; add any real misses to the Redirects list in the admin (Admin → Redirects) instead of code.
- Keep WordPress running, unlinked, for 30 days, then archive it.
- Raise the DNS TTL back to its usual value.
- Remove the vercel.app redirect URI from the Google OAuth client.
