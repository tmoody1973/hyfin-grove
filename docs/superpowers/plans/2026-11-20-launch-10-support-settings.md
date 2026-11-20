# Launch plan 10: Support page settings in Payload

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. TDD per task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Staff edit everything on `/support` in Admin → Support page, without a code change: hero text, the three "ways in" cards and their perks, the prices and which Funraise form each opens, the tee section and its photo, who we are, pillars, impact numbers (with an on/off switch), social handles, closing text, the legal line, and the thank-you shipping line.

**Architecture:** A `support-page` Payload global. Today's copy moves into `lib/supportContent.ts` as `DEFAULT_SUPPORT`, used to seed the global and as the fallback for any field left empty, so the page never shows a blank. `getSupportContent(db)` reads the global and merges it over the defaults. Plans (prices → Funraise forms) come from the global and are validated: a form number that's a positive whole number, and a fallback link that must be a `https://funraise.org/give/Radio-Milwaukee/…` page. `WaysIn` and `Funraise` take the plans as props instead of the `PLANS` constant.

**Tech Stack:** Payload 3 globals, a migration, Next.js 16, Vitest.

**Spec:** Plan 8 (`docs/superpowers/plans/2026-11-20-launch-8-support-page.md`, decision 012). Tarik, 2026-11-20: "we probably need a custom page for support in payload."

## Global Constraints
- Read: public. Update: signed-in staff (same as the Front page global).
- An empty field falls back to today's copy; an empty list (perks, pillars, socials) falls back to today's list. The impact section shows only when its switch is on **and** it has at least one number.
- Plans: 1 to 3 per tier (`member`, `hyfin100`). Each has a price label, a donate-button label, a Funraise form number and a fallback link. The admin refuses a bad form number or a non-Radio Milwaukee Funraise link.
- The donor never sees a broken button. A plan that fails validation in stored data (edited outside the admin) is dropped. If a tier ends up with none, the defaults for that tier are used.
- The legal line and the thank-you shipping line are optional and render only when filled.
- `/support` keeps its glitch and scanline classes; staff edit words, not effects.

## Review Focus
1. Staff clear every field: the page still renders today's copy (test).
2. A plan saved with `formId: 0` or a non-Funraise fallback link through the API: dropped at read time (test).
3. Plans edited while a donor sits on the checkout panel: the donor's chosen plan id still resolves on the next render, or the panel returns to the cards (reducer `back`). Plan ids are `<tier>-<index>`.
4. Glitch markup: staff text is rendered as text, never HTML.
5. The tee photo is swapped in the admin: the new image shows, and its alt text comes from Media.

---

### Task 1: Content model, defaults and the reader
**Files:** create `globals/SupportPage.ts`, `lib/supportContent.ts`; modify `payload.config.ts`; migration `support_page`.
**Interfaces:** `type SupportContent` (hero, cards, plans, gear, who, pillars, impact, share, closing, thanks); `DEFAULT_SUPPORT: SupportContent`; `mergeSupport(stored: unknown): SupportContent`; `plansFrom(raw: unknown): Plan[]` (validated, falls back per tier); `getSupportContent(db): Promise<SupportContent>`.
- [ ] Failing tests (`tests/supportContent.test.ts`): empty → defaults; partial override (hero headline only); an empty perks list → default perks; plans with a bad form number or link dropped; a tier left empty → default plans for that tier; impact hidden when off or empty.
- [ ] Implement; `migrate:create support_page`, read the SQL, apply (shared database: ledger it).
- [ ] Commit `feat: support page settings global`.

### Task 2: The page reads the settings
**Files:** `app/(frontend)/support/page.tsx`, `components/support/WaysIn.tsx` (`content` prop), `components/support/Funraise.tsx` (`plans` prop), `lib/support.ts` (`PLANS` stays as defaults), `lib/supportFlow.ts` (plan ids are strings).
- [ ] Failing tests: `WaysIn` Back focus test still passes with a `content` prop; the plan lookup by form number uses the given plans.
- [ ] Implement; the impact section, legal line and shipping line render only when present; the gear image uses Media's URL and alt, else `/support/member-tee.jpg`.
- [ ] Commit `feat: /support renders from Admin → Support page`.

### Task 3: Seed, check, ship
**Files:** `scripts/seed-support-page.ts` (`--dry-run`; fills only empty fields, never overwrites staff text), README.
- [ ] Seed (shared database). In the admin, change the hero headline: `/support` shows it. Change it back.
- [ ] Full suite, build with no database (CI), old-link check, final review, PR.
