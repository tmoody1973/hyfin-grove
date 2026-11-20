# Launch plan 8: The support page, with giving that never leaves hyfin.org

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/support` rebuilt from the Signal mockup, where picking a membership opens Radio Milwaukee's own Funraise form on the page, already set to that plan, and a finished gift turns the panel into our "Signal received" thank-you.

**Architecture:** A server page holds the static sections. One client component owns the "three ways in" flow (choose, then checkout, then thanks) as a pure reducer, like `components/player/playerState.ts`. Funraise's loader script ("Aware Code") is added on this page only. Each price button carries `data-formId`, which Funraise's click listener on `document.body` turns into its popup. `window.funraise.push('onSuccess', { form }, cb)` tells us a gift went through. Card, bank and PayPal entry stays inside Funraise's iframe; we never touch payment data.

**Tech Stack:** Next.js 16 App Router, `next/script`, Funraise giving-form widget 2.0, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-18-hyfin-site-launch-design.md` lists "the Funraise support flow" as post-launch (line 24). Tarik moved it into launch on 2026-11-20. Design: `docs/mockups-html/screens/07-support/support-desktop.html`, `support-phone.html`, `funraise-checkout-phone.html` (HTML export of Figma `ivuHFQdgrfMAxldRrsq3nP`, node 1-8). Funraise research: `docs/decisions/012-support-giving-on-page.md` (Task 4) cites the docs.

## Global Constraints
- Funraise org: `0c40b367-f236-406e-963e-8a96f854e390` (Radio Milwaukee). Loader snippet, verbatim from hyfin.org's `<head>` (2026-11-20):
  ```js
  (function(f,u,n,r,a,i,s,e){var data={window:window,document:document,tag:"script",data:"funraise",orgId:f,uri:u,common:n,client:r,script:a};var scripts;var funraiseScript;data.window[data.data]=data.window[data.data]||[];if(data.window[data.data].scriptIsLoading||data.window[data.data].scriptIsLoaded)return;data.window[data.data].loading=true;data.window[data.data].push("init",data);scripts=data.document.getElementsByTagName(data.tag)[0];funraiseScript=data.document.createElement(data.tag);funraiseScript.async=true;funraiseScript.src=data.uri+data.common+data.script+"?orgId="+data.orgId;scripts.parentNode.insertBefore(funraiseScript,scripts)})('0c40b367-f236-406e-963e-8a96f854e390','https://assets.funraise.io','/widget/common/2.0','/widget/client','/inject-form.js');
  ```
  Commands queue on `window.funraise` (an array until the script loads), so `push` calls made right after the snippet are safe.
- The four plans and forms (read from each form's public `config.json`, 2026-11-20). Each form allows exactly one frequency:

  | Button | Form | Amount | Frequency | Tee size question |
  |---|---|---|---|---|
  | `$10/month` | 45703 "FA25 HYFIN Sustainer" | 10 | `m` | yes |
  | `$120/year` | 45701 "FA25 HYFIN Lump" | 120 | `o` (one payment covers the year) | yes |
  | `$84/month` | 45593 "HYFIN100 Sustainer" | 84 | `m` | no |
  | `$1000/year` | 44749 "HYFIN100 Lump" | 1000 | `o` | no |
- No card, bank or donor data passes through our code or our server. No Funraise API key, no webhook in this plan.
- Glitch only on headlines and image frames (`sg-fx`, `sg-lines`, `sg-frame` from PR #17), never body text. Stabilize and reduced motion already cover them.
- Copy is the mockup's, which is mostly today's hyfin.org/support. Unconfirmed items stay out until Tarik supplies them (see the Task 3 copy table). No placeholder brackets ship.
- Channel colors: Share the love = red `#ff0040`, Become a member = green `#00ff9f`, Join HYFIN100 = blue `#0070ff` (mockup "CH R / CH G / CH B").

## Review Focus
1. **A donor closes Funraise's popup without giving.** Our panel must stay on "You're tuning in as…" with a working "Donate" button that reopens the same form, and "Back" returns to the cards. Test: reducer `close` is not an action, so the state stays `checkout` (Task 1).
2. **`onSuccess` payload shape differs from the docs** (no donor, nested donor, missing first name). The thank-you still shows, with "Thank you." and no name, never "Thank you, undefined." Test: `thankYouName` cases (Task 1).
3. **Client-side navigation to /support** (from the header link, no full reload). Funraise's script loads once. Buttons rendered later still open the popup, because the listener sits on `document.body`. `onSuccess` registration must not stack duplicate handlers on revisits. Check in Task 2, step 6.
4. **Funraise's script fails to load** (ad blocker, outage). Price buttons must still get a donor to a gift. Each button is an `<a>` whose `href` is the plan's hosted Funraise page (today's links). If the script is there it intercepts the click; if not, the link works. Test: every plan has an `https://funraise.org/give/Radio-Milwaukee/…` fallback (Task 1).
5. **Phone width.** The mockup's phone screens put the panel above the form; the popup is full-screen on phones. Check at 390px in Task 3.

---

### Task 1: Plans, the flow, and the thank-you name (pure)

**Files:**
- Create: `lib/support.ts`, `lib/supportFlow.ts`
- Test: `tests/support.test.ts`

**Interfaces:**
- Produces:
  - `type PlanId = "member-monthly" | "member-yearly" | "hyfin100-monthly" | "hyfin100-yearly"`
  - `type Plan = { id: PlanId; tier: "member" | "hyfin100"; name: string; price: string; formId: number; amount: number; frequency: "m" | "o"; fallbackUrl: string; donateLabel: string }`
  - `PLANS: readonly Plan[]` and `planByForm(formId: number): Plan | undefined`
  - `FUNRAISE_ORG_ID: string`
  - `thankYouName(data: unknown): string | null`
  - `type SupportState = { step: "choose" } | { step: "checkout"; plan: PlanId } | { step: "thanks"; plan: PlanId; name: string | null }`
  - `type SupportAction = { type: "pick"; plan: PlanId } | { type: "back" } | { type: "succeeded"; plan: PlanId; name: string | null }`
  - `supportReducer(state: SupportState, action: SupportAction): SupportState`

- [ ] **Step 1: Write the failing tests** in `tests/support.test.ts`:
  - `PLANS` has exactly four entries. Their `formId`/`amount`/`frequency` match the Global Constraints table. Names: "HYFIN Member" ×2, "HYFIN100" ×2. `price` is "$10 / month", "$120 / year", "$84 / month", "$1000 / year". `donateLabel` is "Donate $10 monthly", "Donate $120", "Donate $84 monthly", "Donate $1000".
  - Fallbacks: `member-monthly` → `https://funraise.org/give/Radio-Milwaukee/3a1305e9-96b1-4b29-97f9-c86e40d3df2b`, `member-yearly` → `…/eb73b669-e850-495b-b0e5-620eb77bcaee`, `hyfin100-monthly` → `…/2e7a1385-09d6-4d13-82bc-97e840ace247`, `hyfin100-yearly` → `…/f81ff6bd-16dd-4f12-88d0-ce28a2cb588d`.
  - `planByForm(45593)?.id === "hyfin100-monthly"`; `planByForm(1)` is `undefined`.
  - `thankYouName`:
    - `{ donor: { firstName: "Ada" } }` → "Ada"; `{ firstName: " Ada " }` → "Ada"
    - `{ donor: { firstName: "" } }`, `{}`, `null`, `"x"`, `{ donor: "Ada" }` → `null`
    - `{ firstName: "<b>x</b>" }` → "<b>x</b>" (rendered as text by React, never as HTML)
  - `supportReducer`:
    - choose + pick member-monthly → checkout member-monthly
    - checkout + pick hyfin100-yearly → checkout hyfin100-yearly
    - checkout + back → choose
    - checkout + succeeded(name "Ada") → thanks with that plan and name
    - thanks + back → choose
    - choose + succeeded → thanks (a gift from a reopened popup still counts)
- [ ] **Step 2:** `pnpm vitest run tests/support.test.ts`. Expected: FAIL, modules not found.
- [ ] **Step 3:** Implement `lib/support.ts` (data + `planByForm` + `thankYouName`: reads `donor.firstName`, then `firstName`; strings only; trimmed; empty → null) and `lib/supportFlow.ts` (the reducer). No `"use client"` in either: both are imported by tests, and `lib/support.ts` also by the server page.
- [ ] **Step 4:** Same command. Expected: PASS.
- [ ] **Step 5:** Commit `feat: support plans, flow and thank-you name`.

### Task 2: Funraise on the page, and the three ways in

**Files:**
- Create: `components/support/Funraise.tsx` (`"use client"`), `components/support/WaysIn.tsx` (`"use client"`)
- Modify: `app/(frontend)/globals.css` (one `.sg-btn` rule, copied from the mockup: `box-shadow: 3px 3px 0 #ff0040, -3px -3px 0 #0070ff`, hover swapped)

**Interfaces:**
- Consumes: Task 1's `PLANS`, `planByForm`, `thankYouName`, `supportReducer`, `FUNRAISE_ORG_ID`.
- Produces:
  - `<Funraise onSuccess={(formId: number, data: unknown) => void} />`. Renders `next/script` (`id="funraise-aware"`, `strategy="afterInteractive"`) with the loader snippet. On load it pushes `create` for each `PLANS` form (no `selector`: the popup) and registers `onSuccess` once per form. Guard: a module-level `Set` of registered form ids, so a second mount after client-side navigation adds nothing.
  - `<WaysIn initial?: SupportState />`: the whole "Three ways in" section, `id="ways-in"`. The page passes `initial` only outside production, from `?step=checkout|thanks&plan=<PlanId>`, so the checkout and thanks screens can be screenshotted without a real gift.

- [ ] **Step 1:** Write `Funraise.tsx` with the Global Constraints snippet. Call `window.funraise.push('create', { form })` and `window.funraise.push('onSuccess', { form }, cb)`. Type `window.funraise` as `{ push: (...args: unknown[]) => void }` in a `declare global`.
- [ ] **Step 2:** Write `WaysIn.tsx`, matching `support-desktop.html` / `support-phone.html`:
  - **choose:** three bordered cards (`CH R/G/B` label in the channel color, title, sub-line, perk list with rules, buttons). The member card has a white border (it's the featured one).
    - Share the love: "Learn more" scrolls to `#share`.
    - Price buttons: `<a href={plan.fallbackUrl} data-formId={plan.formId} onClick={() => dispatch({ type: "pick", plan: plan.id })}>`. The first button in each card is green-filled, the second outlined.
  - **checkout:** the bordered panel replaces the cards.
    - Left: "You're tuning in as", plan name `h3` with `sg-fx`, price in `#00ff9f` mono, perks, "Back: choose another way in" (dispatch `back`).
    - Right: white panel with "HYFIN" and the plan/price row, then one green `sg-btn` "Donate $10 monthly" (`plan.donateLabel`), same `<a data-formId href=fallback>`.
    - Line under it: "Card, PayPal and bank payments are handled securely by Funraise."
    - **Ruling:** the mockup draws Funraise's fields inside the panel. Funraise's docs say placed forms are not mobile-responsive and recommend the popup. So the fields open in Funraise's popup over our panel, and the price click itself opens it, so it is still one click to the form. Ledger it.
  - **thanks:** "Transmission complete" (mono label), "Signal received." (`h3`, `sg-fx`), "Thank you, {name}." or "Thank you." Then "Welcome in: {plan.name}, {plan.price}. A receipt is on its way to your inbox." Buttons: "Listen live" (uses `usePlayer().play({ kind: "live" })`, same as the player bar) and "Share HYFIN" (scrolls to `#share`).
  - Focus moves to the panel heading when the step changes (`useRef` + `focus()` in an effect, `tabIndex={-1}`), and an `aria-live="polite"` region announces "Signal received" on thanks.
- [ ] **Step 3:** `pnpm tsc --noEmit && pnpm lint`. Expected: 0 errors.
- [ ] **Step 4:** Commit `feat: three ways in, with Funraise's form on the page`. Steps 5–6 need the page, so they run in Task 3, step 4.
- [ ] **Step 5:** In `pnpm next dev -p 3007`, on `/support`, click "$10/month". Expected: Funraise's popup opens showing "FA25 HYFIN Sustainer" at $10 monthly; our panel shows "HYFIN MEMBER". Close the popup, then expect the panel to remain, and "Donate $10 monthly" to reopen it. **Do not submit.**
- [ ] **Step 6:** From `/` click the header's Support link (client-side navigation), click "$84/month". Expected: popup opens with "HYFIN100 Sustainer". Navigate away and back, then run in the console: `window.funraise` registrations unchanged (no duplicate `onSuccess` log lines from Funraise's `registering onSuccess callback` info log).

### Task 3: The support page

**Files:**
- Create: `app/(frontend)/support/page.tsx`, `public/support/member-tee.jpg`
- Modify: `app/(frontend)/layout.tsx` (Support link)

**Interfaces:**
- Consumes: `<WaysIn />`, `<Funraise />` (rendered inside `WaysIn`), `sg-fx`, `sg-lines`, `sg-frame`, `sg-btn`.

- [ ] **Step 1:** Page sections in mockup order. Static, server-rendered; `metadata` title "Support HYFIN", description from the hero dek, canonical `/support`.
  1. Hero: three color squares + "Why support HYFIN"; `h1.sg-fx` "Connect the culture, spread the love!"; dek.
  2. `<WaysIn />`.
  3. Member gear: tee image in an `sg-frame` with the mockup's red/blue offset blocks; "Member gear / Edition 01"; `h2.sg-lines` "Wear the signal."; copy; facts list (Artist / Comes with "Membership, $10/month" / Sizes "Small to XXL", from form 45703's size question); "Become a member" button → `#ways-in`.
  4. Who we are: `h2.sg-lines` "Accountable to you, our community." + two paragraphs.
  5. Our pillars of impact: 01–04, as in the mockup.
  6. Impact by the numbers: **only if Tarik confirms the figures** (copy table). Otherwise the section is omitted.
  7. Share (`id="share"`): "Spread the word on social media." Handles Instagram @hyfin.mke, TikTok @hyfin.mke, Facebook hyfinmke, LinkedIn hyfinmke, each a link to its profile.
  8. Closing: `h2.sg-lines` "Protect what matters." + copy + "Choose your way in" → `#ways-in` + "HYFIN is a media movement from Radio Milwaukee." + legal line (if supplied).
- [ ] **Step 2:** Copy decisions (from the mockup; open items go to Tarik before the page ships):

  | Item | Plan |
  |---|---|
  | Hero, three cards, Who we are, pillars, tee copy, closing | Mockup text verbatim (matches today's page). |
  | `#hyfinfriendsgiving` + "this Friendsgiving" in Share | Dropped (seasonal). The sentence becomes "Help us reach more people by sharing HYFIN with your network." |
  | Impact numbers 10K+ / 1–2 / $74K | Not on today's page. **Tarik confirms**, or the section is left out. |
  | `[EIN / LEGAL LINE]` | **Tarik supplies**, or omitted. |
  | `[T-SHIRT / GEAR FULFILLMENT DETAILS]` in thanks | **Tarik supplies**, or omitted. |
  | Tee photo | The mockup's image has a stray "»" carousel arrow on it. **Tarik supplies a clean photo**; until then, use the mockup image. |
  | "Join our newsletter list" bullet | Kept as text (no newsletter provider yet), not a link. |

- [ ] **Step 3:** Layout header: add a bordered "Support" link (mockup's boxed nav item), after the nav, before Stabilize. Footer: add "Support" to `FOOTER`.
- [ ] **Step 4:** Run Task 2 steps 5–6. Then screenshot `/support` at 1440px and 390px: the cards; `?step=checkout&plan=member-monthly`; `?step=thanks&plan=member-monthly`. Expected: each matches the mockup's screen. Then `pnpm build && pnpm start -p 3007` and request `/support?step=thanks&plan=member-monthly`. Expected: the cards (production ignores the parameters).
- [ ] **Step 5:** `pnpm vitest run && pnpm tsc --noEmit && pnpm lint && pnpm build`. Expected: all pass, 0 lint errors.
- [ ] **Step 6:** Commit `feat: support page from the Signal mockup`.

### Task 4: Old addresses, smoke, decision record

**Files:**
- Modify: `data/legacy-redirects.json` (rows `/donate/`, `/support-hyfin/`, `/hyfinoldsupport/` → `"/support"`; delete the `/support/` row, since the page now answers)
- Create: `scripts/repoint-support-redirects.ts` (`--dry-run`; updates exactly those rows in the Redirects collection; deletes the `/support/` row; prints before/after)
- Create: `docs/decisions/012-support-giving-on-page.md`
- Modify: `.github/workflows/smoke.yml` (`/support` 200 and contains `data-formId="45703"`; `/donate/` 308 → `/support`)

- [ ] **Step 1:** Run `pnpm tsx --env-file=.env.local scripts/repoint-support-redirects.ts --dry-run`. Expected: four rows listed with old → new. Then run it for real. **This writes to the shared database:** say so in the ledger.
- [ ] **Step 2:** Write the decision record in the CLAUDE.md format (Decision / Why / Options / Chosen / Gave up / How we'll know / What actually happened blank):
  - **Options:** hosted pages (today), popup on our page (chosen), placed form (mockup look, not mobile-responsive per docs), own card fields (not possible: Funraise's API cannot charge a new card).
  - **Gave up:** Funraise fields inside our panel; Apple Pay until the domain is verified with Funraise.
- [ ] **Step 3:** Run `pnpm tsx scripts/check-old-links.ts --csv docs/Pages_and_screens_Page_path_and_screen_class.csv --base http://localhost:3007`. Expected: FAIL 0.
- [ ] **Step 4:** Commit `feat: old support addresses land on /support; decision 012; smoke`. Then final whole-branch review and PR.

### After merge (Tarik, not code)
- One real $10 monthly gift on production (cancel or refund it in Funraise afterwards). This is the only way to see `onSuccess` fire and the "Signal received" screen for real, because Funraise documents no test mode.
- Apple Pay on the new domain: after the domain switch, ask Funraise support for the domain association file and verification (Apple Pay only applies to the two one-time forms).
