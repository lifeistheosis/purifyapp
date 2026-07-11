# Continuation ledger + successor handoff

Updated: 2026-07-11 (principal-audit session; post-audit owner-decision round applied same day, see Addendum at bottom). Baseline: `main @ dcd77c3`; post-audit work-tree adds C-01/C-02 + audit artifacts (uncommitted at time of writing — see "Repository state" below, then trust `git log`).

## Repository state at handoff

- Branch `main`, audit frozen at `dcd77c3` (= live production, verified by probe).
- Post-freeze changes staged in the working tree / audit commit: `.github/workflows/ci.yml` (Node 24), `lib/shop/orders.ts` + test + `OrdersClient` import swap, `docs/audit/*`, `docs/editorial-standards.md`, `AGENTS.md`, `CLAUDE.md`.
- ~~**Not pushed.**~~ *Amended same day:* `c4a835e` was pushed with explicit owner authorization ("owner - you push and deploy"); see Addendum.

## Verification record (this session, exact)

| Command / probe | Environment | Result |
|---|---|---|
| `git status -sb`, `git log` | repo | clean at dcd77c3, in sync with origin |
| `npx tsc --noEmit` | Node 24.15.0 | exit 0 (baseline AND after C-01/C-02) |
| `npx vitest run` | Node 24.15.0 | baseline 249/249; after C-02 **254/254** |
| `npx eslint` (changed files) | repo | clean |
| curl purifyapp.net: `/`, `/shop`, `/shop/icons/christ-pantocrator-mounted`, `/shop/eikon`, `/shop/cart`, `/account`, `/whats-new` | live prod | all 200; product `<title>` uses pipes → dcd77c3 deployed; prior 500s gone |
| curl prod `GET /api/shop/catalog/reviews?...` | live prod | 200 `{"reviews":[],"reviewCount":0,"avgStars":null}` (graceful, migration-dark) |
| curl prod `POST /api/shop/reviews` unauth | live prod | 401 |
| `git ls-files | grep .env` | repo | only `*.example` tracked |
| Android run #41 (Beta 1.9.1) | GitHub Actions UI | success, 17m58s (observed) |
| Android run #42 (Beta 1.9.2, dcd77c3) | GitHub Actions | dispatched this session; **final status UNKNOWN** (tab renderer hung on re-check) — *amended same day: SUCCESS, 18m50s (Addendum)* |

Not verified this session (do not claim): AAB behavior on a device (cart, in-app Stripe return, bearer-auth writes from the real WebView), any Stripe live-mode flow, RevenueCat entitlement flow end-to-end, Playwright e2e (dead with CI until C-01 lands), iOS anything, Render env values.

## Next actions (priority order)

1. **Owner: push the audit commit** → completes C-01 verification (first green/red Actions CI run on Node 24 is the evidence). Watch e2e/axe/Lighthouse — they have not run in a while and may surface pre-existing failures.
2. **Owner: apply `supabase/migrations/20260711_shop_reviews.sql`** in the Supabase SQL editor (F-07). Acceptance: prod GET reviews still 200; a verified buyer can POST; non-buyer gets the RPC's refusal.
3. **Implement F-01** (webhook flips cancelled-but-paid → paid; loud log). Acceptance: unit test with stubbed admin client + stubbed Stripe event covering (a) normal pending→paid, (b) retry no-op, (c) cancelled+completed → paid. Files: `app/api/shop/stripe-webhook/route.ts` + new test.
4. **Implement F-03** (webhook verifies `amount_total`/currency before marking paid; mismatch → do not mark, log). Same test file as #3.
5. **Owner: confirm run #42 result**; upload the newest green AAB to Play; on-device pass: Shop tab, add-to-cart → Stripe → return, orders show Awaiting Payment/unfinished rows correctly, a psalm's commentary sheet.
6. **Owner: Stripe live keys + `SHOP_CHECKOUT_ENABLED` on Render** when ready to sell (until then prod checkout returns the calm 503 path — by design).
7. **Editorial: F-05 Victorinus note** (clergy wording; queue in `docs/editorial-standards.md`).
8. **Editorial: F-06 psalm-keying review file** (extend the ingest script to emit unmatched sections; then spot-check).
9. **F-04 measurement**: on a real device, time first-paint of `bible/john/1` and `bible/psalms/118` in the AAB before deciding on the fetch-commentary redesign.
10. **Owner decision: gate Render deploys on green CI** (changes deploy behavior; recommended after C-01 proves stable).

## Known model failure patterns (for successors)

- Claiming "fixed" from dev-server evidence: this repo's two prod incidents (500s, dead CI) were invisible in dev. Verify on a production build or the live site.
- Stale `.next` types after mixed android/web builds — clear before trusting `tsc`.
- The android gradle step OOMs if invocations are merged; the workflow comments say so — believe them.
- Batch sed/node edits across files silently half-apply; verify each file after scripted multi-edits.
- GitHub's Actions UI intermittently hangs the extension tab; do not spin — record Unknown and move on.

## How to verify future claims quickly

- Web prod: `curl -s -o /dev/null -w "%{http_code}" https://purifyapp.net/<route>`
- Native gate: `npm run build:android` must exit clean and `out/<route>` must exist.
- Money paths: read `docs/audit/findings.yaml` first; F-01/F-03 status must be current.
- Versions: the four identifiers in AGENTS.md §Release ritual must agree.

---

## Addendum — 2026-07-11 owner-decision round (same session)

Owner directives received and executed:
- **Pushed `c4a835e`** to origin/main (owner-authorized). Render deploy triggered; CI run #312 = the first Node-24 run (C-01 completing evidence; status at last check: see below).
- **F-07 RESOLVED-VERIFIED**: the reviews migration is already applied on prod. Service-role REST probes: `shop_reviews` 200 `[]`, `shop_products.units_sold` 200, RPC `shop_submit_review` exists and enforces its auth gate (403 / 28000 "Sign in to review.").
- **Live checkout CONFIRMED ON**: prod `/api/shop/catalog/config` returns `{"checkoutEnabled":true,"flatShippingCents":499}`. The shop takes real money now — F-01/F-03 (webhook race + amount verification) are correspondingly more urgent.
- **Android run #42 SUCCESS** (18m50s, Actions UI): Beta 1.9.2 AAB published to the android-release release. Owner uploads to Play.
- **F-05 (Victorinus chiliasm note): deferred by owner** ('clergy - skip'). Queue entry retained in docs/editorial-standards.md.
- **F-12 photos: deferred by owner** (unique photos when the physical batch arrives).
- **F-11 store policy: VERIFIED at policy level** — Google Play Payments policy explicitly excludes physical goods from Play Billing (support.google.com/googleplay/android-developer/answer/10281818, fetched 2026-07-11); Stripe for EIKON physical goods is the expected pattern; Plus stays on Play Billing. Residual: actual review acceptance.

### Revised next actions
1. Confirm CI run #312 result (Node 24). If e2e/Lighthouse steps fail, they are NEW signal (first time running in weeks) — triage, do not revert C-01.
2. **F-01 + F-03 webhook hardening with mocked-Stripe tests — now the top code priority (live money is on).** Acceptance criteria unchanged (see Next actions above).
3. Owner: upload run #42 AAB; on-device pass (Shop tab, add-to-cart -> Stripe -> return, Awaiting Payment rows, psalm commentary sheet).
4. F-06 psalm-keying review file; F-04 device measurement; Render-gated-on-CI owner decision — unchanged below top spots.
