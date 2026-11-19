# Google Workspace sign-in for the admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Radio Milwaukee staff sign in to the HYFIN admin with their Google Workspace account; only verified `@radiomilwaukee.org` accounts get in, new ones start as editors, and turning off someone's Google account locks them out.

**Architecture:** The community plugin `payload-oauth2` adds "Sign in with Google" to Payload (authorize and callback endpoints plus a Payload auth strategy). Our code decides who gets in: a pure domain check runs inside the plugin's `getUserInfo` step, before any account is created. A `role` field (admin or editor) splits what people can do. Password login stays only for admins, as the way in if Google is down.

**Tech Stack:** Payload 3.94.0, `payload-oauth2` 1.0.x (zero dependencies, PKCE), Google OpenID Connect, Next.js 16, Vitest.

**Spec:** No separate spec. The requirements come from Tarik (2026-11-19): use Google Workspace, limit sign-in and account creation to staff. They are recorded in this plan's Global Constraints and in decision 007 (Task 6). It replaces the "MFA plugin" item on the pre-beta list: Workspace's own two-step verification covers it.

## Global Constraints

- Only accounts whose Google profile is `email_verified: true`, has `hd: "radiomilwaukee.org"`, and whose email ends in `@radiomilwaukee.org` (case-insensitive) may sign in or be created. Checked on the server; Google's `hd` login hint is a convenience, not the check.
- New Google accounts are created with role `editor`. Only an `admin` can change a role, create users with a password, or delete users.
- Password login, and "forgot password", work for `admin` users only. A Google-created editor can never set or use a password, so turning off their Google account locks them out.
- Tarik's existing account becomes `admin` in the migration. He keeps his password login.
- PKCE on (`pkceEnabled: true`), because the plugin forwards but does not mint or check `state`.
- Secrets (`GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`) live only in `.env.local` and Vercel env, never in code. The repo is public.
- Load the `payload` skill before Payload work. Schema changes go through `payload migrate:create` + `printf 'y\n' | pnpm payload migrate` (`push: false`).
- jsdom never reaches the live server bundle; the bundle guard test keeps passing.

## Review Focus

1. A personal Gmail or another Workspace's account (`hd` missing or different), or `email_verified: false`: no account is created, and the visitor lands on the login page with "Use your Radio Milwaukee Google account." (Task 2 tests.)
2. An editor tries to make themselves admin through the REST API (`PATCH /api/users/<self>` with `role: "admin"`): refused. (Task 1 test.)
3. A Google-created editor uses "forgot password" or POSTs to `/api/users/login`: refused, so Google stays the only way in. (Task 4 tests.)
4. Someone who already has a password account at the same email signs in with Google for the first time: their existing account is used (matched by email), not duplicated, and their role is unchanged. (Task 3 check on dev.)
5. Staff member leaves and their Google account is turned off: they can't start a new session. An existing session lasts until the token expires (set to 8 hours). (Task 3 sets `tokenExpiration`; decision 007 records the window.)

---

### Task 1: Roles

**Files:**
- Modify: `collections/Users.ts`
- Create: `lib/access.ts`
- Create: migration via `pnpm payload migrate:create roles` (then edit its `up` to set existing users to `admin`)
- Test: `tests/access.test.ts`

**Interfaces:**
- Produces: `isAdmin(user: unknown): boolean`; `adminOnly: Access` (collection access); `adminOrSelf: Access` (returns `true` for admins, `{ id: { equals: user.id } }` for others, `false` when logged out); `adminOnlyField: FieldAccess`.
- Users field: `{ name: "role", type: "select", options: ["admin", "editor"], defaultValue: "editor", required: true, saveToJWT: true, access: { create: adminOnlyField, update: adminOnlyField } }`.
- Users access: `read: adminOrSelf`, `create: adminOnly`, `update: adminOrSelf`, `delete: adminOnly`. Other collections keep "any logged-in user" (editors edit content).

- [ ] **Step 1: Failing tests** (`tests/access.test.ts`): `isAdmin` true only for `{ role: "admin" }`; `adminOrSelf` gives an editor a where-clause on their own id and an admin `true`; `adminOnlyField` refuses an editor and allows an admin; the Users `role` field has `saveToJWT: true` and default `editor`; Users `create` and `delete` refuse an editor.
- [ ] **Step 2:** `pnpm vitest run tests/access.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3:** Implement. Generate the migration, then make its `up` add the column and run `UPDATE "users" SET "role" = 'admin'` (only Tarik exists today). Apply: `printf 'y\n' | pnpm payload migrate`.
- [ ] **Step 4:** Tests pass. Check: the one existing user reads `role: "admin"` (count by role via a short script; print counts, not emails).
- [ ] **Step 5:** Commit `feat: admin and editor roles`.

### Task 2: The staff-only check

**Files:**
- Create: `lib/auth/googleProfile.ts`
- Test: `tests/auth/googleProfile.test.ts`

**Interfaces:**
- Produces: `STAFF_DOMAIN = "radiomilwaukee.org"`; `class NotStaffError extends Error`; `staffIdentity(profile: { email?: unknown; email_verified?: unknown; hd?: unknown; sub?: unknown }): { email: string; sub: string }` (returns the lowercased email and Google's `sub`, or throws `NotStaffError`).

- [ ] **Step 1: Failing tests:** accepts `{ email: "Tarik@RadioMilwaukee.org", email_verified: true, hd: "radiomilwaukee.org", sub: "1" }` → `{ email: "tarik@radiomilwaukee.org", sub: "1" }`; rejects a `gmail.com` email; rejects `hd` missing; rejects `hd: "evil.org"` even with a radiomilwaukee.org email; rejects `email_verified: false` and `email_verified: "true"` (string); rejects `radiomilwaukee.org.evil.com`; rejects a missing `sub`.
- [ ] **Step 2:** Run, expect FAIL. **Step 3:** Implement (strict `===` checks; `email.toLowerCase().endsWith("@" + STAFF_DOMAIN)`). **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat: staff-only Google identity check`.

### Task 3: Google sign-in through payload-oauth2

**Files:**
- Modify: `package.json` (`pnpm add payload-oauth2`), `payload.config.ts` (plugin), `collections/Users.ts` (`auth: { tokenExpiration: 28800 }`)
- Create: `lib/auth/google.ts` (plugin options)
- Modify: `.env.example` (names only)
- Test: `tests/auth/google.test.ts`

**Interfaces:**
- Consumes: `staffIdentity`, `NotStaffError` (Task 2).
- Produces: `googleOAuth(): PluginOptions` with `enabled` only when both env vars are set, `strategyName: "google"`, `authCollection: "users"`, `useEmailAsIdentity: true`, `onUserNotFoundBehavior: "create"`, `pkceEnabled: true`, `scopes: ["openid", "email", "profile"]`, `providerAuthorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth?hd=radiomilwaukee.org"`, `tokenEndpoint: "https://oauth2.googleapis.com/token"`, `prompt: "select_account"`, `getUserInfo` = fetch `https://openidconnect.googleapis.com/v1/userinfo` with the access token, then `staffIdentity(...)`, `successRedirect: () => "/admin"`, `failureRedirect` → `/admin/login?error=google-not-staff` for `NotStaffError`, `/admin/login?error=google` otherwise (logging the error server-side, never the token).
- Read the installed plugin's README and types (`node_modules/payload-oauth2`) before wiring: confirm the option names above, how a created user gets `role` (default `editor` from the field), and the authorize URL path (expected `/api/users/oauth/authorize`).

- [ ] **Step 1: Failing tests:** `googleOAuth()` is disabled when either env var is missing; has `pkceEnabled: true` and the `hd` hint; `getUserInfo` with a stubbed `fetch` returning a gmail profile throws `NotStaffError`; with a staff profile returns `{ email, sub }`; `failureRedirect` maps `NotStaffError` to `?error=google-not-staff`.
- [ ] **Step 2:** Run, expect FAIL. **Step 3:** Implement and register the plugin. **Step 4:** PASS; typecheck, lint, bundle guard.
- [ ] **Step 5:** Commit `feat: sign in with Google Workspace`.

### Task 4: Passwords for admins only

**Files:**
- Modify: `collections/Users.ts` (hooks)
- Test: `tests/auth/passwordAdminsOnly.test.ts`

**Interfaces:**
- Produces: Users `hooks.beforeLogin: [adminPasswordOnly]` (throws `APIError("Use Sign in with Google.", 403)` when the user is not an admin; password login only runs through `beforeLogin`, Google sessions don't), and `hooks.beforeOperation` refusing `forgotPassword` for a non-admin email (look the user up by `data.email`; answer exactly as Payload does for an unknown email, so it doesn't reveal who has an account).
- Confirm in Payload 3.94 source (`node_modules/payload/dist/auth/operations/login.js`, `forgotPassword.js`) that the Google strategy does not run `beforeLogin`, before relying on it.

- [ ] **Step 1: Failing tests:** `adminPasswordOnly` throws for `{ role: "editor" }` and passes `{ role: "admin" }`; the forgot-password guard does nothing for an editor's email and proceeds for an admin's (stub `req.payload.find`).
- [ ] **Step 2–4:** FAIL, implement, PASS; full suite.
- [ ] **Step 5:** Commit `feat: password login and reset for admins only`.

### Task 5: The login button and messages

**Files:**
- Create: `components/admin/GoogleSignIn.tsx`
- Modify: `payload.config.ts` (`admin.components.beforeLogin: ["@/components/admin/GoogleSignIn"]`), then regenerate the import map (`pnpm payload generate:importmap`)
- Test: `tests/auth/googleSignIn.test.ts`

**Interfaces:**
- Produces: `GoogleSignIn` (server component): a "Sign in with Google" link to the plugin's authorize path, the line "Radio Milwaukee staff: use your @radiomilwaukee.org Google account. Password login is for admins.", and, when `?error=google-not-staff`, "That Google account isn't a Radio Milwaukee account." (or "Google sign-in failed. Try again." for `?error=google`).

- [ ] **Step 1: Failing test:** rendered markup links to the authorize path and shows the right message for each `error` value; renders nothing extra when Google is disabled.
- [ ] **Step 2–4:** FAIL, implement, PASS.
- [ ] **Step 5:** Dev server (port 3007, `/admin/login`): button visible; screenshot. Commit `feat: Sign in with Google on the admin login page`.

### Task 6: Google client, production, decision record

- [ ] **Step 1 (Tarik):** In Google Cloud console, under the radiomilwaukee.org Workspace: create an OAuth consent screen with user type **Internal** (Google itself then refuses non-Workspace accounts, a second wall), and an OAuth client "Web application" with these redirect URIs: `https://hyfin-grove.vercel.app/api/users/oauth/callback` and `http://localhost:3007/api/users/oauth/callback` (adjust to the path confirmed in Task 3). Paste the client ID and secret with `! vercel env add GOOGLE_OAUTH_CLIENT_ID production` / `..._SECRET production`, and into `.env.local`. **Stop until done.**
- [ ] **Step 2:** End to end on dev: sign in with a staff account (a second staff account if available) → lands in `/admin` as editor; a personal Gmail → back on login with the not-staff message, and no user row was created (count before and after).
- [ ] **Step 3:** Decision 007 (`docs/decisions/007-google-workspace-sign-in.md`, Tarik's template, "What actually happened" blank): plugin vs Auth.js/Better Auth vs our own strategy; PKCE because the plugin skips `state`; editors by default; passwords admin-only; 8-hour session as the offboarding window.
- [ ] **Step 4:** Add to `smoke.yml`: the authorize path answers a redirect to `accounts.google.com`. Full suite, typecheck, lint, build; open the PR; after merge, sign in on production.
