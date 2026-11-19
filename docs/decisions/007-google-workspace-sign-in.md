# 007 — Staff sign in to the admin with Google Workspace

**Decision.** Radio Milwaukee staff sign in to the HYFIN admin with their Google Workspace account, through the community plugin `payload-oauth2`. Only verified `@radiomilwaukee.org` accounts get in, new accounts start as editors, and passwords work for admins only.

## Why this came up
The admin had one account (Tarik's) and no roles: anyone who logged in could do everything, including managing users. Staff need their own logins before the beta (2026-12-01). Tarik asked for Google sign-in because Radio Milwaukee runs on Google Workspace, so only staff can get in or create an account. Getting this wrong means either outsiders in the admin, or former staff who can still log in after they leave.

## Options
1. **`payload-oauth2` (chosen).** A small community plugin with no dependencies (about 75 KB), built for Payload 3. It handles the Google redirect, PKCE and the session cookie; our code decides who is staff. Cost: a third-party package last updated May 2026, and it doesn't check OAuth's `state` value itself.
2. **Auth.js or Better Auth plugins.** Bigger frameworks that take over how users and sessions are stored. Cost: more code to trust and a heavier change to Payload's own login, for one provider.
3. **Our own Payload auth strategy.** No new package. Cost: writing and testing the OAuth handshake, PKCE and cookies ourselves, which is exactly the part most likely to be wrong.

## What we chose and why
Option 1 (Claude, plan 2026-11-19-google-sign-in; Tarik approved the plan). The security-critical rule, who counts as staff, is our own code with its own tests. Google must say the email is verified and that the account belongs to the `radiomilwaukee.org` Workspace, and the email must end in `@radiomilwaukee.org`. The plugin only carries out the handshake. PKCE is on because the plugin forwards OAuth's `state` without checking it; PKCE ties each sign-in to the browser that started it.

Rules that came with it:
- **Two roles.** `admin` (Tarik) manages users and roles; `editor` (all other staff) edits content. New Google accounts are editors.
- **Passwords for admins only.** Google-created accounts get a random password. Without this rule, an editor could set a password through "forgot password" and keep logging in after their Google account was turned off. Editors' password logins fail like a wrong password; their reset requests answer normally but send nothing.
- **Sessions last 8 hours.**

## What we gave up
- **Former staff keep an open session for up to 8 hours** after their Google account is turned off. New sign-ins stop immediately.
- **Preview deployments can't use Google sign-in** (each has its own address, and Google needs every callback address registered). Previews use the admin password.
- **We depend on a small community plugin.** If it's abandoned, option 3 is the fallback; the staff check and roles carry over unchanged.

## How we'll know if this was right
- A staff member signs in with Google on the first try and lands in the admin as an editor.
- A personal Gmail account is turned away, and no user record is created.
- When someone leaves and IT turns off their Google account, they can't get back in the next morning.

## What actually happened
<!-- Tarik fills this in. -->
