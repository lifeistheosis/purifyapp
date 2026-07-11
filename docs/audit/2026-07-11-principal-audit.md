# Purify principal audit — 2026-07-11

**Audit baseline (frozen):** branch `main`, commit `dcd77c3` ("feat(shop): refinement patch — cart, honest orders, desktop 500 fix (Beta 1.9.2)"), working tree clean, in sync with `origin/main`.
No application code was changed during the baseline audit. Post-freeze corrections are recorded in §6 and never rewrite the findings below.

Auditor: Claude (principal-audit session, same session that shipped Beta 1.9 → 1.9.2 earlier today; every load-bearing claim re-verified by command or probe in this session, not from memory).

---

## 0. Capability record

Available and used this session:
- Repository + git (full history), shell (Git Bash + PowerShell), Node v24.15.0 / npm 11.12.1.
- Test toolchain: vitest (unit), tsc, eslint; Playwright configured (not run this session).
- Web builds: `next build` (web) and `npm run build:android` (static export) both run successfully this session.
- Browser: Claude-in-Chrome (signed into GitHub as `lifeistheosis`); preview server tooling for localhost.
- Live production probing via curl against `https://purifyapp.net`.
- Supabase: anon-key reads work locally via `.env.local` (service-role key present locally; values not displayed). **No DDL access to prod** (owner applies migrations by hand in the SQL editor).

Not available:
- `gh` CLI (not installed). GitHub API with git's stored credential was blocked by policy (correctly).
- Android emulator / physical device; Apple toolchain (no iOS build exists in-repo beyond a workflow file).
- Stripe live-mode testing; RevenueCat sandbox; production database write access.
- Render dashboard/logs.

Secrets hygiene check: `git ls-files | grep -iE "\.env"` returns only `.env.discord.example` and `.env.local.example`; `.gitignore` line 34 ignores `.env*`. **Confirmed: no env secrets tracked.**

---

## 1. Project truth map

Statements are labeled: [Confirmed] = verified this session; [Inference] = strong inference from code; [Unknown] = not verifiable in this environment.

### What Purify is
- [Confirmed] Next.js 16.2.6 web app (SSR on Render at purifyapp.net) + Capacitor 8 Android app shipping a **local-first static export** (`BUILD_TARGET=android`, `output: export`, loaded from `https://localhost`), with app/api and web-only trees stashed out at build (`scripts/android-build.mjs`).
- [Confirmed] Content: Brenton LXX + KJV Bible (`data/bible/*`, `source` fields `brenton-lxx-pd` / `kjv-pd`), 4,481 patristic verse-notes across 23 books from 15 Fathers (`data/bible/commentary/`, counted this session), saints/councils/history/prayers registries, 906-record offline content package (37.43 MB, integrity-hashed) bundled into the AAB.
- [Confirmed] Commerce: EIKON shop (Stripe Checkout for physical goods; single store), verified-buyer reviews (needs prod migration, see F-07), device-local cart with multi-item checkout (Beta 1.9.2). Purify Plus subscription via RevenueCat/Play Billing (web billing dormant).
- [Confirmed] Supabase backend: RLS-first design; privileged writes go through API routes using the service role after zod validation + rate limits; native app authenticates cross-origin via `Authorization: Bearer <supabase access token>` + CORS allow-list (`lib/api/cors.ts`: `https://localhost`, `capacitor://localhost`, `ionic://localhost`).

### Version state
- [Confirmed] All four version identifiers agree at Beta 1.9.2: `lib/whatsNew/version.ts`, `public/sw.js` (`purify-beta-1.9.2`), `android/app/build.gradle` (`versionName = "1.9.2"`), `data/changelog/patches.json[0]`.

### Deployment state
- [Confirmed] Live prod = `dcd77c3`: probed 2026-07-11 ~12:2x local; `/`, `/shop`, `/shop/icons/christ-pantocrator-mounted`, `/shop/eikon`, `/shop/cart`, `/account`, `/whats-new` all 200; product tab title is `Christ Pantocrator | $49 | Purify Shop` (pipe separator = 1.9.2 code). The two routes that returned 500 on prod earlier today now return 200.
- [Confirmed] Android build run #41 (Beta 1.9.1, commit 02bd88c + CI split fix) **succeeded** (17m58s, seen in Actions UI this session). Run #42 (Beta 1.9.2, `dcd77c3`) was dispatched this session and was in progress at last observation; final status **[Unknown]** (GitHub tab renderer unresponsive at re-check).
- [Unknown] Whether the #41/#42 AABs were uploaded to Play; whether Play review passed. Owner action.

### Test/CI state
- [Confirmed] Local baseline at `dcd77c3` on Node 24: `tsc --noEmit` exit 0; `vitest run` 24 files / **249 passed** (12:24:04, 9.45s).
- [Confirmed] GitHub CI is **red** and has been failing before this session's work: `.github/workflows/ci.yml:30` pins Node `"20"`, while `lib/content/{bootstrap,schema,storage/*}` import `node:sqlite` (added in Node 22.5). 16 `lib/content` tests error with `No such built-in module: node:sqlite` (owner-pasted run log earlier this session; root cause re-verified against the workflow file and imports now). Everything after the unit step (build, Playwright e2e, axe, Lighthouse) never runs.
- [Confirmed] CI does not gate deploys: Render deploys `main` on push regardless.

### Known-not-done (planned/absent)
- [Confirmed by owner memory + repo] Stripe **live** keys / `SHOP_CHECKOUT_ENABLED` on Render: checkout probes on prod would 503 ("Checkout opens soon" path) until set — code path verified; live env state [Unknown].
- [Confirmed] Reviews migration `supabase/migrations/20260711_shop_reviews.sql` exists in repo; **prod application is [Unknown]/likely not applied** (owner action). Degrades gracefully: prod `GET /api/shop/catalog/reviews` returns `{"reviews":[],"reviewCount":0,"avgStars":null}` (probed, 200); unauth `POST /api/shop/reviews` returns 401 (probed).
- [Confirmed] iOS: `ios-ipa.yml` workflow exists; no verified iOS shipping state this session. [Unknown].
- [Confirmed] Web Premium (RevenueCat Web Billing) dormant by design (commit 685c4b1).

---

## 2. Findings

Severity honesty note: nothing here meets P0 (no evidence of unauthorized access, cross-user exposure, active financial harm, or data loss). The two P1s are a billing edge-race and a dead CI gate.

### F-01 · P1 · Billing: cancel/payment race can cancel a paid order
- **Area:** commerce · **Confidence:** High (code-level), Unreproduced at runtime · **Status:** Confirmed (open)
- **Evidence:** `app/api/shop/checkout/cancel/route.ts` — the route expires the Stripe session before cancelling, but on a Stripe API failure it deliberately falls through (`catch` → comment "Fall through…") and cancels the order anyway. `app/api/shop/stripe-webhook/route.ts` updates `.eq("payment_status","pending")` only, so if payment completes after a fall-through cancel, the money moves but the order stays `cancelled` and the webhook update matches 0 rows (no email, no fulfillment).
- **Preconditions:** buyer triggers cancel while the session is still payable AND the `sessions.retrieve/expire` call fails AND the buyer then completes payment on the still-open session. Multiplicatively rare, but the outcome is charged-money-no-order: financial harm class.
- **Recommended action:** in the webhook, when the pending-only update matches 0 rows, fetch the order; if `payment_status='cancelled'` and the event is `checkout.session.completed`, flip it to `paid` (payment wins over cancellation) and log loudly. Add a regression test with a mocked admin client.
- **Acceptance criteria:** webhook restores a cancelled-but-paid order to `paid`; unit test covers the race; cancel route unchanged.
- **Safe to automate:** yes. **Review needed:** none.

### F-02 · P1 · Release engineering: CI has been red for multiple releases; nothing downstream runs
- **Area:** release · **Confidence:** Confirmed · **Status:** Corrected but not fully verified (see §6, C-01)
- **Evidence:** `.github/workflows/ci.yml:30` Node 20 vs `node:sqlite` (Node ≥22.5) in `lib/content/*`; owner-pasted failing run log; local suite green on Node 24. Beta 1.9, 1.9.1, 1.9.2 all shipped with the CI gate effectively dead — typecheck/lint ran, but unit failure aborted build + e2e + axe + Lighthouse.
- **Recommended action:** bump CI to Node 24 (matches the only environment the suite is verified on). Longer-term: make Render deploys depend on CI (out of scope; owner decision — it changes deploy behavior).

### F-03 · P2 · Billing: webhook does not verify amount/currency against the order
- **Area:** commerce · **Confidence:** Confirmed (absence) · **Status:** Confirmed (open)
- **Evidence:** `app/api/shop/stripe-webhook/route.ts` — no reference to `amount_total`/currency (grep this session). The session is created server-side from DB prices, and the signature is verified, so a mismatch requires Stripe-side mutation of our session — defense-in-depth, not an exploit path.
- **Recommended action:** on `checkout.session.completed`, compare `session.amount_total` to `order.total_cents` (and currency); on mismatch, do not mark paid; log and flag for admin.

### F-04 · P2 · Perf: baked commentary makes some exported pages very heavy
- **Area:** performance/native · **Confidence:** Confirmed · **Status:** Confirmed (open)
- **Evidence:** measured this session: exported `out/bible/john/1` = 3,289 KB (index.html 890 KB + duplicate flight payloads), `genesis/1` = 1,497 KB, `psalms/118` = 1,317 KB; pre-existing `matthew/5` = 1,669 KB (pattern predates this week). Commentary raw grew 14 MB → 22 MB.
- **Impact:** slower first paint/parse on mid-range phones for the heaviest chapters; larger AAB (compressed text, a few MB).
- **Recommended action (design decision, not a quick fix):** load commentary as a separate fetch/JSON asset per chapter instead of baking into page HTML+flight. Defer until a real device shows pain; measure on the Beta 1.9.1+ AAB first.

### F-05 · P2 · Editorial: Victorinus' Apocalypse commentary contains chiliast readings
- **Area:** theological/editorial · **Confidence:** High · **Status:** Requires editorial/clergy review
- **Evidence:** `data/bible/commentary/revelation/20.json` carries Victorinus on the millennium (ANF07 text; the surviving recension retains chiliast material Jerome later softened). Orthodoxy reads "His kingdom shall have no end" (Symbol of Faith) against literal millenarianism.
- **Impact:** a reader could take a canonized-martyr's early view as the Church's teaching. The app labels author/work/citation but adds no doctrinal framing note.
- **Recommended action:** add a short editorial preface entry on Revelation 20 (or a note field rendered with the commentary) stating that Victorinus writes before the Church's mature consensus and that chiliasm is not Orthodox teaching. **Wording needs clergy/editorial review — queued in `docs/editorial-standards.md`; do not ship AI-drafted doctrine unreviewed.**

### F-06 · P2 · Editorial/data: Psalms verse-keying has quantified drift
- **Area:** editorial/data integrity · **Confidence:** Confirmed (self-measured) · **Status:** Confirmed (open, tolerable)
- **Evidence:** ingest stats printed by `scripts/ingest-augustine-psalms.mjs`: of 2,034 verse markers, 1,560 exact lemma matches, 304 snapped (±2 to the quoted verse), **170 unmatched (kept claimed number, clamped)**. Each note quotes its lemma, so misplacement is visible-not-silent.
- **Recommended action:** emit the unmatched list to a review file on next ingest run; spot-fix the worst psalms (splits/merges 9, 113-115, 146-147 already special-cased and verified). Editorial queue, not a blocker.

### F-07 · P1→conditional · Reviews feature is dark on prod until the migration runs
- **Area:** database/release · **Confidence:** Confirmed (graceful), prod state [Unknown] · **Status:** Requires owner action
- **Evidence:** `supabase/migrations/20260711_shop_reviews.sql` in repo; prod probes show graceful empty state (200 + empty aggregate; POST unauth 401). If the owner *believes* reviews shipped but never applies the migration, the marketed feature silently no-ops — that is why this is rated above P2.
- **Action:** owner applies the migration in the Supabase SQL editor (copy-paste block was provided in-session; file is authoritative).

### F-08 · P2 · Sessionless order-cancel endpoint (accepted-risk record)
- **Area:** security · **Confidence:** Confirmed · **Status:** Accepted risk (documented)
- **Evidence:** `app/api/shop/checkout/cancel/route.ts` cancels a `pending` order given only its UUID (rate-limited 30/10min/IP). Deliberate: guests + the Stripe cancel page's cookie-less browser context. Only reachable transition is pending→cancelled; UUIDs are unguessable; a leaked cancel link can cancel only an unpaid checkout.
- **Residual risk:** link-leak lets a third party cancel someone's in-flight unpaid checkout (nuisance, no money moves — modulo F-01).

### F-09 · P2 · Test coverage: zero coverage on API routes and money paths
- **Area:** testing · **Confidence:** Confirmed · **Status:** Partially addressed (C-02 adds order-partition tests)
- **Evidence:** 24 unit files all target `lib/**` pure logic; no tests import route handlers (`app/api/**`), the webhook, `createCheckout`, or the cancel flow. Playwright smoke exists but has been dead in CI (F-02).
- **Recommended action:** after F-01's fix, add webhook unit tests with a stubbed Stripe/admin client; then re-enable e2e via green CI.

### F-10 · P3 · Stale service-worker shell after deploys degrades hydration-dependent pages
- **Area:** reliability/web · **Confidence:** Strong inference · **Status:** Mitigated for /account (no-JS fallback link shipped in 1.9.2); general case open
- **Evidence:** `public/sw.js` NetworkFirst falls back to cached HTML referencing hash-named chunks that 404 after a redeploy; three deploys shipped today. The observed "/account never loads" report matches this signature; not reproduced under instrumentation.
- **Recommended action:** consider `skipWaiting`+reload prompt on version change, or cache-bust HTML fallback when chunk fetch 404s. Low urgency.

### F-11 · P2 · Store/policy: physical-goods checkout inside the Android app
- **Area:** store readiness · **Confidence:** Policy reading, needs verification · **Status:** Requires store-policy review
- **Evidence:** In-app Stripe checkout for EIKON physical goods (Beta 1.9); Play policy *requires* non-Play billing for physical goods, so the architecture is correct in kind. The specific flow (opening Stripe in the in-app browser tab from a local-first WebView) is conventional but the review outcome is [Unknown] until a build passes Play review.
- **Action:** verify on next Play submission; keep the purchase flow out of any Play Billing surface.

### F-12 · P3 · Licensing posture (record)
- Bible: Brenton LXX + KJV, public domain (KJV Crown rights apply in the UK only; distribution posture unchanged for a US-based store). Commentary: NPNF/ANF (Schaff), public domain, cited per note. Product images: local `/shop/media/*`; supplier-CDN images blocked from the storefront by `SUPPLIER_IMAGE_HOSTS` gate in `lib/shop/catalog.ts`; `next.config.ts` still whitelists `kwcdn.com` remotes for admin use. Open owner items (pre-existing, from `project_purify_legal` decisions): real product photos, LLC/insurance, sales tax, lawyer review. No new licensing risk found this session.

---

## 3. Adversarial review of this session's own claims

- "Desktop 500 fixed" — **upgraded to Confirmed in production** (live probes this session), previously only local-prod-build evidence.
- "Phantom orders fixed" — code + local UI verified; **not verified against real Stripe** (no live keys). The cancel flow's Stripe-expire step is untested end-to-end. Downgraded to *Corrected but not fully verified*; F-01 documents the remaining race.
- "Cart works" — verified in dev browser (add → badge → cart → success clears). **Not verified on AAB**; multi-item `createCheckout` never executed against Stripe (disabled locally). Schema-level tests only.
- "Run #42 building" — dispatch confirmed; completion **Unknown**.
- "Account not loading fixed" — the shipped change is a fallback link, not a root-cause fix; root cause (stale SW shell) is a strong inference, not reproduced. Honest status: mitigated.
- "Reviews live" — feature is dark on prod until the owner runs the migration (F-07). Marketing copy in `patches.json` (Beta 1.9 notes) already claims reviews; if the migration is not applied promptly, the What's New overpromises. Flagged to owner.
- Severity check: earlier session language ("phantom orders fixed at all three layers") stands, but F-01 shows the third layer has a hole; ratings above were set accordingly.

---

## 4. Domain notes not elevated to findings

- **RLS:** shop tables reviewed in migrations 20260704/20260705/20260711: public SELECT only on published/live rows; self-select on orders/items/conversations/messages/requests/applications; admin-only tables have no policies (service-role only); `entitlements` write path is service-role only with SECURITY DEFINER upsert. Sound pattern; no cross-user read path found. (Defensive review only; no penetration testing.)
- **Auth:** cookie session on web (proxy.ts refresh + redirect rules), bearer on native (validated by Supabase via `hasCustomAuthorizationHeader` — verified in supabase-js source this session). No client-trusted entitlement decides money: checkout re-prices server-side; Plus shipping check reads entitlements with the service role.
- **Accessibility:** axe suite exists but has been dead with CI (F-02). Unknown current a11y state beyond component-level conventions.
- **Strategy (evidence-bound):** the free library is the moat; commerce (EIKON) and Plus are the funding. The biggest trust risk observed today was shipping speed vs. verification depth — three releases in one day with a dead CI gate. The single highest-leverage business fix is F-02 + gating deploys on green CI.

---

## 5. Audit freeze record

- Truth map + findings F-01..F-12 frozen at `dcd77c3` before any post-freeze change.
- Baseline commands: `git status/log` (clean, dcd77c3); `tsc --noEmit` exit 0; `vitest run` 249/249; live-prod probes as recorded; no app code modified during Phases 0-2.

---

## 6. Post-freeze corrections (this session)

### C-01 (fixes F-02): CI Node 20 → 24
- Files: `.github/workflows/ci.yml` (node-version only).
- Verification: config diff reviewed; the full suite passes on Node 24 locally (the environment CI will now use). **A green CI run cannot be produced without pushing (push = production deploy via Render), so status is: Corrected but not fully verified.** Owner pushes; first Actions run on the next push is the completing evidence.
- Residual risk: none plausible (CI-only file); e2e/Lighthouse steps will run for the first time in a while and may surface pre-existing failures — that is the gate doing its job.

### C-02 (enforces F-16-class rules / partial F-09): order-list partition logic extracted and tested
- Files: `lib/shop/orders.ts` (new; `isUnfinishedCheckout`, `isHiddenOrder` moved from `components/shop/OrdersClient.tsx`), `components/shop/OrdersClient.tsx` (imports), `lib/shop/__tests__/orders.test.ts` (new; covers pending/cancelled/stale/paid partitions).
- Verification: vitest targeted + full suite green; tsc green (recorded in ledger).
- Residual risk: none; pure refactor + tests.

F-01 and F-03 were **not** implemented this session: both touch the money path of the live webhook, deserve mocked-Stripe regression tests written carefully, and the session was near its context budget. They are the top two items in the continuation ledger with acceptance criteria.
