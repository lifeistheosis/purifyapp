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

---

## Addendum — 2026-07-11 F-15 triage + F-13 general case (same session)

**F-15 triaged from CI #318 raw logs, reproduced locally, all four failure classes fixed (no quarantines):**
1. **24 webkit launch failures** — `devices["iPhone 14 Pro"]` drags in `defaultBrowserType: webkit`; CI installs chromium only, and the file-level `test.use` also double-ran the mobile suite in both projects. Fixed in `playwright.config.ts` (chromium-pinned mobile-shell project, `testIgnore` on chromium) and `mobile-shell.spec.ts`. Suite is now 46 tests, not 58.
2. **/shop/eikon 500 in key-less CI** — supabase-js *throws* on an unreachable host (it does not return an error object); the throw in `generateMetadata` beat the shop layout's `notFound()` gate. `getStore`/`getProduct`/`listProducts` now fail soft (`lib/shop/catalog.ts`), proven by `catalogFailSoft.test.ts`; the EIKON spec also skips on the graceful "Store not found" state.
3. **Flaky home axe color-contrast (1.81)** — axe scanned the welcome overlay's Begin button mid fade-in; the settled state passes AA comfortably. `_axe.ts` now waits for `document.getAnimations()` (3s cap) before scanning. Not a real design violation.
4. **Flaky history 60s timeouts** — the expand click can be swallowed by the hydration race, then the link click sits under a collapsed card's toggle for the whole timeout. Reproduced locally (2/46 failed with retries=0). `expandCard` helper in `history.spec.ts` asserts `aria-expanded=true` and re-clicks until it sticks.

**F-13 general case shipped:** `lib/supabase/resolveUser.ts` races `getUser()` against a 5s deadline and reports three states; timeouts and retryable fetch errors are **unresolved** (retry UI), never signed-out. Applied to the six auth-required shop loaders (throw → `ShopError` retry) and to `AccountAuthGate` + `MerchantApplyGate` (retry state; the sign-in redirect now requires a *resolved* signed-out). `lib/shop/seller.ts` is server-only — no navigator.locks there, deliberately untouched. Display-only checks stay fail-open by design.

**Verification on the combined tree:** tsc 0; eslint 0 errors; vitest 278/278 (9 new); `build:android` clean; local e2e green after the history fix. `vitest.config.ts` gained a `server-only` stub alias (`tests/stubs/server-only.ts`) so server-only lib modules are unit-testable.

**Acceptance residual:** CI green end-to-end needs the owner push (commits are local, per session policy). If the *Lighthouse* step then fails, that is the next new signal — the e2e stage no longer blocks it.

**1.9.3 ship readiness (AAB #43):** run #43 SUCCESS on `23da374` (the Beta 1.9.3 commit); `app-release.aab` (337 MB, sha256 124c288f…) replaced on the `android-release` release at 21:15Z, versionName 1.9.3 confirmed in `build.gradle`. Upload to Play Console is the shipping step.

### CI acceptance follow-up (same session, runs #319-#321)
- Run #319 (post-push): 36 passed / 9 skipped / 1 failed — only the EIKON spec; webkit, axe, and history classes all confirmed fixed in CI.
- Run #320: same lone failure. Root-caused with a CI-identical local build (placeholder keys, no .env.local): flag-off builds 500 (DYNAMIC_SERVER_USAGE) on BOTH dynamic shop segments — on-demand static generation + the shop layout's notFound(). Unreachable in prod (flag on; unknown slugs 200, verified live). Recorded as F-15 residual; spec now skips on >=500 with the mechanism named, and the skip was proven against the replica build (5 shop specs skip exactly as CI will).
- **Run #321 GREEN end-to-end** (the timed-out push of 28eacba had in fact landed): lint, typecheck, unit, build, smoke+axe, and Lighthouse all pass. F-15 acceptance met; marked corrected-verified.
- F-10 note: a stale service worker on the local prod preview silently stranded hydration during the highlight-wash verification (no console errors, no failed requests; fixed by unregister+cache clear). Third sighting of this signature; consider promoting F-10 above "low urgency".
- **F-16 (P1): Purify Plus tap crashed the Android app.** RevenueCat capacitor plugins on mismatched majors (11 vs 13) since 8d07ed8b (06-19); native hybrid-common 17/18 collision at Purchases.configure. Pinned matched 13.2.0 pair; Beta 1.9.4 staged (all 4 identifiers + notes). Residual: device sandbox purchase after AAB #44+.
- **F-13 root fix (2026-07-12)**: owner hit the retry state live on /account ("couldn't confirm your sign-in"). Cause: jammed cross-tab auth lock; supabase-js hands custom locks an `undefined` acquire timeout (= wait forever). resilientLock.ts caps it and falls back to LOCKLESS on timeout. Proven by a jam-the-lock smoke test (sign-in prompt in 6.8s, retry copy absent). Ships web on next push; native in AAB #44+.

---

## Addendum — 2026-08-01 Release B (mobile de-duplication), branch `feat/release-b-repetition` off `feat/community-safety`

Eleven commits, Beta 2.8 cut. Local only, unpushed. Verification: tsc 0,
eslint 0 errors, vitest 571/571 (18 new), `npm run build` clean,
`npm run build:android` clean, browser walk in the native shell at 375px
and the web tree at 1280px.

**The approved audit's headline recommendation was wrong and was reversed.**
`~/.claude/plans/time-to-formulate-a-typed-cake.md` §1.1 called
`/prayers/today` "a second, worse copy of the Today tab" and Release B was
scoped to retire it. It cannot be retired: `app/page.tsx:166` puts
`TodayMobileV3` behind `NativeOnly` and the marketing home behind
`WebOnly`, so **the web has no Today tab and `/prayers/today` is its only
Today surface**. It is also the PWA manifest shortcut, the install CTA
target, the 404 tile, the footer and navbar link, the sitemap's only daily
entry, and `public/sw.js:86`'s offline fallback. Four blocks live only
there (the on-this-day history, the "where you left off" rail, today's
diptych namedays, the greeting's 14-day rhythm dots). The duplication was
native-only and was fixed natively: three in-app doors closed, route kept.

**New finding, fixed: the Old Calendar was ignored on `/prayers/today`.**
It called `commemorationsOn`/`fastingStatus` on the unshifted civil date
while `ChurchTodayRail` shifted them, so an Old Calendar reader saw one
saint and one fasting rule on Today and different ones on the daily prayer
page. Now shared in `lib/calendar/useChurchDay.ts`, which preserves the
load-bearing asymmetry: commemoration and fast shift, readings and Pascha
do not. Verified live at both styles. A third copy of the same bug on the
desktop Prayers day card went with it.

**New finding, fixed: every "Last saved" card on `/account/profile` linked
to `/bible/undefined/undefined`.** `ProfileActivity` carried a local
`Bookmark` type describing the *server* jsonb row (`locator: {...}`);
`lib/sync/bookmarks.ts` flattens that shape before it reaches
localStorage. Four bookmark href resolvers are now one exhaustive
`bookmarkHref` in `lib/bookmarks.ts`.

**Audit items closed:** §2.6 tab bar overflow (`min-w-0` + truncate;
measured 7 equal 43.6px cells, no overflow at 375px with Greek-length
labels). §5 double h1, `/prayers/today` lighting the Today tab, the
duplicated prayer rules, the four `/saints` names, the three dead
`MobileTopBar` mounts.

**Audit counts corrected:** the double h1 was two routes (`/discover`,
`/reading`), not "every section" (`SectionMasthead`'s h1 is conditional on
a `title` prop only those two passed); the duplicated prayer rules were 7
steady-state, not 11.

**Guard widened.** `noFrozenDay.test.ts` watched three component
directories, which is exactly why it missed `/discover` and `/prayers`
computing the day server-side and shipping into the export behind
`hidden md:*` (frozen on an Android tablet at md+). It now walks `app` and
`components` with one documented exemption, `/calendar`, plus a third
assertion that the exemption still names a real file. Proven to fail on a
deliberate probe before being accepted.

**F-19 and F-20 were NOT touched and remain `corrected-unverified`.** This
release edits `MobileTabBar` twice (route matching, then `min-w-0` +
truncate) but changes no z-index, no `overflow-visible`, no positioning and
no `pointer-events`. Both still need the device check.

**Not done, deliberately:** the 13 routes that match no tab (`/history`,
`/fasting`, `/premium`, `/pricing`, `/whats-new`, `/about`, `/support`,
`/privacy`, `/terms`, `/faq`, `/plan`, `/trapeza`, `/florilegium`) still
leave the bar dark, and two of them are reached straight from Today cards.
Which tab owns `/pricing` is a design decision, not a de-duplication one.
Also left: the `blur-xl` blobs in `SoftTiles.tsx:57,108`, and
`/account/export` sitting outside the `(signed)` group.

### Addendum — 2026-08-01, e2e triage (same session)

The smoke suite had been failing 8 of 47 on `feat/community-safety`, before
Release B. Verified pre-existing by checking out the base, rebuilding, and
reproducing the identical 8. Now 47 passed / 2 skipped / 0 failed.

**One real accessibility bug, seven tests' worth.** `components/shop/CartDrawer.tsx`
lives in the shop layout permanently and is only slid off-screen, so
`aria-hidden={!open}` left its close button and its links in the tab order.
A keyboard user tabbing any shop page walked into an invisible drawer. axe:
`aria-hidden-focus`, serious, 64 violations, failing 5 shop specs and both
seller-console specs. Fixed with `inert` when closed, which removes focus
and the a11y tree together.

**One assertion that could only ever fail.** `history.spec.ts` matched
`section[aria-label='Sources']`, which no component has ever emitted. The
sources block was also an unnamed `<section>`, so it was not exposed as a
landmark at all; it is now named from its own heading via
`aria-labelledby` (not a hardcoded English `aria-label`, so the name stays
translated).

**One product conflict, resolved by the owner.** `shop.spec.ts` encoded the
2026-07-05 decision "no review theatre: no stars, no ratings, nowhere" as
"the EIKON storefront never says the word reviews". Reviews v2 (`6c7d3007`)
later shipped store-level reviews behind a delivery gate on purpose. Owner
confirmed 2026-08-01 that the feature stands and the assertion was stale.
The spec now asserts the part actually objected to: no star glyphs, and no
invitation to review for someone who has not bought.

**OPEN, and worth a decision: the verified-buyer badge is not gated at the
store level.** `app/api/shop/catalog/store-reviews/route.ts:41-49` selects
every row in `shop_store_reviews` for the store with no filter on an order,
and `components/shop/StoreReviewsSection.tsx:106` renders
`<VerifiedBuyerBadge bought={storeName} />` on every one of them
unconditionally. `VerifiedBuyerBadge`'s own docstring justifies itself with
"the submit RPCs require a delivered order, so the badge is always
truthful", which holds for reviews written through the app and does not
hold for admin-seeded rows. The 2026-07-27 audit already records that
seeded rows exist in prod with `order_id: null`. So a seeded review is
currently shown to shoppers under a "Verified buyer / Bought EIKON" badge.
Not changed here: it is live commerce behaviour and the owner deferred the
adjacent seeded-review cleanup on 2026-08-01. The narrow fix is to filter
the read path to reviews with a delivered order, or to render the badge
per-review rather than unconditionally.

### Addendum — 2026-08-01, Daniel restoration was defective, FIXED in `dd20204c`

Commit `6973e124` ("Restore Susanna, Bel, and the middle of Daniel 3") and its
notes commit are on `feat/daniel-additions`, PUSHED but NOT merged and NOT
deployed. An adversarial check of the Beta 2.8 notes found three defects,
all reconfirmed by hand.

**1. Three verses numbered 72.** Brenton numbers the Song with `72a` and
`72b`. The parser at `scripts/fetch-daniel-additions.mjs:259` uses
`/^\v\s+(\d+)\s*(.*)$/`, capturing digits only, so the letter falls into
the verse text:
```
72: "O ye light and darkness, bless ye the Lord..."
72: "a O ye frost and heat, bless ye the Lord..."
72: "b O ye frost and snow, bless ye the Lord..."
```
`VerseRow.tsx` sets `id={`v${verse.n}`}`, so three DOM nodes share `v72`
and the `#v72` deep link plus the commentary anchor resolve to the wrong
verse.

**2. Punctuation regression across the whole book.** `flush()` line 241
replaces every USFM marker with a SPACE, so `\add saying\add*,` became
`saying ,`. 135 of the 357 pre-existing verses changed wording, because
ebible.org's Brenton is a different digitisation from the bolls.life LXXE
feed that `scripts/ingest-bible.mjs` used for the other 49 OT books. Same
`brenton-lxx-pd` label, two streams.

**3. The Greek interlinear is broken across Daniel.** en/gr verse counts
were 33/33, 34/34, 31/31, 28/28 at `670d57da`; they are now 95/33, 37/34,
30/31, 29/28. `app/(app)/bible/[book]/[chapter]/page.tsx` joins the panes
by verse number, so English 3:24-97 renders a blank Greek column and all of
Daniel 4 is off by three (English 4:1 pairs with Greek 4:1, which is really
English 4:4).

**The notes are also numerically wrong.** Chapter 3 ends at verse 97, not
95 (95 is the stored-entry count; Brenton has no verses 67-70, and only 93
distinct numbers exist). "Sixty-seven verses restored" is really 65 entries
over 63 distinct numbers. And old 3:31-33 did not merely renumber, they
left the chapter: old 3:31 is now 4:1.

**Owner decision 2026-08-01: keep Brenton's Greek division and align the
Greek to it.** Note this is a SPLICE, not a regeneration, and the approval
was given before that was known. The Greek archive has the material in
separate books: `.tmp/grclxx/49-S3Ygrclxx.usfm` (Song of the Three, 66
markers spanning 1-67), `50-SUSgrclxx.usfm`, `51-BELgrclxx.usfm`, while
`66-DAGgrclxx.usfm` is the short Daniel (12 chapters, ch3 = 33). Susanna
and Bel already align at 64/42. The remaining work:
- fix the verse regex to carry a letter suffix, and merge `72a`/`72b` into
  72 rather than emitting duplicates (apply the SAME rule to both panes so
  they stay aligned);
- strip the space a stripped marker leaves before `,.;:!?`;
- splice Greek S3Y into Greek Daniel 3 at an offset of +23 (Greek S3Y 1 ->
  Greek 3:24), and shift Greek 3:31-33 into 4:1-3 with the cascade through
  chapters 4 to 6, so both panes carry Brenton's division;
- assert contiguity and en/gr equality per chapter, not just a floor. The
  existing guard is `if ((en[3] ?? []).length < 90)`, which passes at 95
  and asserts nothing about duplicates, gaps, or the Greek.

**RESOLVED, same session, commit `dd20204c`.** All three defects fixed and
verified: the verse regex now captures the letter suffix and appends a
lettered line to the verse it subdivides (one entry per number); the
marker-stripping no longer leaves a space before punctuation; and the Greek
is put onto Brenton's division by a mapping read off the two texts at each
seam (3:91, 4:1, 6:1 each pair with the Greek sentence that says the same
thing). Chapter 3 ends at 97 and holds 93 verses; 63 were restored; old
3:31-33 are now 4:1-3.

**The Song deliberately has no Greek line, and that is the finished state,
not a shortfall.** Brenton and the `grclxx` edition order the canticle
differently, not merely number it differently: Brenton's 3:71 is "O ye
nights and days" where the Greek at the same point reads "cold and heat".
Verse 25 and 88-90 line up, the middle does not, and no offset reconciles
them. Splicing on a best guess would put English verses beside Greek verses
that are not theirs with no way for the reader to tell. 63 English verses
(3:24-90) render an empty Greek column until a Greek text on Brenton's own
order is sourced.

**The assertions are no longer a floor.** Duplicate numbers, stray leading
letters and spaced punctuation now stop the write. The old `>= 90` check
passed on the broken chapter, which is how this shipped in the first place.

### Addendum — 2026-08-01, Releases C and D

**Release C, themes, mechanism done.** `components/theme/AppThemeController.tsx`
is mounted in the root layout and applies `data-reading-mode` app-wide. The
mechanism already existed and was proven; what confined it to two reader
routes was `ReadingModeController`'s unmount cleanup, which stripped the
attribute so a palette could never "leak" onto another surface. That strip
is gone. A pre-paint inline script in `app/layout.tsx` (first child of
`<body>`, carrying the CSP nonce) sets the attribute before the body
renders, because the palette lives in localStorage and the server cannot
read it. **The Pro gate moved with the application**, into the controller;
leaving it in ReaderPrefs would have let a non-Pro reader keep a premium
palette app-wide. `lib/premium/plans.ts` is untouched: this promoted the
mechanism, not the entitlement, so no pricing stop condition was crossed.
Verified: `--color-night` goes #101013 -> #171006 under Candlelight on
/settings, carries to /discover through a full page load, and survives a
cold load on Today.

**The `#d4af37` purge was NOT done, and the audit's framing of it is wrong.**
The census is **25** occurrences, not the 55 the audit claimed, and most are
not fossils of the retired gold: they are deliberate premium-gold branding
on `/premium`, `/pricing`, `PremiumNavCta`, `MobilePremiumButton`,
`PlanStatus`, `WhatsNewChip`, and the calendar feast marker, where
`CalendarCell.tsx` carries a comment saying the literal hex is there to
"keep the feast marker truly gold" against the neutral `--color-gold`
(#eaeaec). Deleting them would flatten the premium identity to near-white,
which is a brand decision and not a cleanup. The real defect is that they
do not follow the palette: under Candlelight or Parchment the premium
surfaces stay metallic while everything else re-themes. **The right fix is a
`--color-premium` token themed per palette, not deletion.** Left for the
owner.

**Release D, `/settings`, done.** New route outside the `(signed)` group,
because none of what it holds ever needed an account: reader font and size,
the interlinear default and the calendar reckoning were plain localStorage
sitting behind `AccountAuthGate` on a tab called "Data". The palette picker
now sits at the top of it. Push, export and account security are LINKED,
not reimplemented, so there is still one of each. The You tab's
"Notifications" row (which pointed at "Data") now says Settings and goes
here, and the You tab lights on `/settings`.

Still not done from the approved plan: Release E (community notifications,
identity, reactions, feed) and Release F (chant player, still blocked on the
anthem recording rights in `docs/licensing/audio-provenance.md`). The two
council entries for Jerusalem 1672 and Orange 529 were drafted but never
spliced into the registry; only the `reception` field landed.
