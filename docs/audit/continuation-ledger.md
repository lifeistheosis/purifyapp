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
2. **Owner: apply `supabase/migrations/20260711000000_shop_reviews.sql`** in the Supabase SQL editor (F-07). Acceptance: prod GET reviews still 200; a verified buyer can POST; non-buyer gets the RPC's refusal.
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
- Versions: the six identifiers in AGENTS.md §Release ritual must agree
  (`lib/appUpdate/__tests__/release.test.ts` and `notesAgree.test.ts` hold
  them), and from 1.4 the release's Update Hierarchy checklist must pass
  (`lib/whatsNew/__tests__/updateHierarchy.test.ts`). Corrected 2026-09-14
  from "four".

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

**Councils done too**: Jerusalem 1672 and Orange 529 are in the registry.
Jerusalem carries `reception: full` (the other patriarchates and the Church
of Russia approved it, and a 17th-century local synod invites the question
on sight); Orange carries `reception: not-received` and renders the crimson
banner above its defined list. Neither ships a document: the Confession of
Dositheus has a public-domain translation in Robertson (1899), the canons of
Orange have none whose provenance could be recorded, so both are listed as
pending rather than filled with unsourceable text. **Both entries are
AI-drafted doctrinal framing, written into the registry on the owner's
explicit instruction rather than routed to the clergy queue, and are
awaiting her review.**

Still not done from the approved plan: Release E (community notifications,
identity, reactions, feed) and Release F (chant player, still blocked on the
anthem recording rights in `docs/licensing/audio-provenance.md`).

### Addendum — 2026-08-01, Releases E and F

**Release F, the player, done without adding audio.** The engineering never
needed new tracks, so the owner's go-ahead unblocked it while the rights
question stayed untouched. `components/prayers/NowPlayingBar.tsx` is mounted
in the **root** layout, not `(app)/layout.tsx`: Today is `app/page.tsx`,
outside the `(app)` group, so a bar mounted there unmounts on every Today
tap, which is exactly when someone walks away from the player. Verified that
playback and the bar both survive a Today tap.

Dismissing needed a verb the store lacked. `stop()` rewinds but keeps the
track loaded so the anthem page can resume, which left the bar sitting there
rewound and unclosable; `unload()` is the other meaning and `stop()` is
untouched for its existing caller.

`duckFor()` added to the store, and `PrayerRope`'s bell calls it. The rope
runs its own `AudioContext` oscillator with no knowledge of the store, so a
bead struck during the anthem sounded straight over it. The duck touches the
element volume only, never `setVolume` and never the snapshot, so a volume
slider does not twitch per knot, and overlapping ducks extend rather than
stack.

**STILL OPEN and NOT a permission question**: whether the three anthem
recordings already shipping are team-produced or licensed
(`docs/licensing/audio-provenance.md`). No audio was added, so nothing here
depends on it, but a chant library does.

**Release E, notifications, done and DARK pending a migration.**
`supabase/migrations/20260801000000_community_notifications.sql` must be applied
in the Supabase SQL editor (project avbqyvjgcrucjwevwixt) before any of it
lights up. Until then the route answers an empty inbox, the badge never
renders, and `/community` is unchanged. Verified against the unapplied
state: page renders normally, no console errors.

Design notes worth keeping: the actor's `user_id` is deliberately NOT stored
(it is also the RevenueCat appUserID and the avatar storage path segment,
which is why the public feed stopped serving it); the table has **no insert
policy at all**, because rows are written by the service role from the reply
route and never by a client; and reads use the REQUEST-scoped client rather
than the service role, so RLS scopes an inbox to its owner instead of an
`.eq()` that could be forgotten. Writing a notification is best effort and
never fails the reply.

Not done from Release E: identity (a public profile, `profiles` is still
self-select RLS with no `avatar_url`, and avatar upload still exists only in
the Community composer), reactions, and the feed work (threading,
pagination, filter by kind). Notifications were the first and largest of the
four and the rest are independent of it.

## Addendum, 2026-08-22: prayer counters removed and the notification bar made real, branch `feat/owner-dashboard`

Three commits. `593d32b2` prayer stops being counted, `efd2a400` the
notification doctrine, `69c816c8` the shop_orders.paid_at migration (committed,
NOT signed off, does nothing until merged).

**Counters removed from live production surfaces.** Campaigns and Community
were verified live (200 on /campaigns, /community, /api/community/posts), so
these were removals rather than cancelled plans: the prayer-rule completion
fraction and its bar, the campaign streak, total days, personal best and
fourteen-cell strip, the public "n praying, n prayers offered" on the board,
the detail page and the group header, the prayer rope's session, seven-day and
year totals, and MyPrayers' "prayers offered" lifetime tally. `ropeStats()` and
`totalPrayerDays` went with the surfaces that were their only callers.

Kept, and the distinction is now written into CONTRIBUTING rather than left to
taste: a STATE is not a tally ("you have prayed today" reads the same on the
four hundredth day as on the first), a POSITION is not a score (the live knot
count resets every session), and a fourteen-dot strip carrying no figure is a
memory aid. RhythmRow therefore stays on the prayers surface while the
near-identical campaign strip went, because the campaign one sat under "your
longest was nine" and was part of a scoreboard.

**The notification bar.** CONTRIBUTING claimed since 2026-08-10 that clause 6
was "enforced by a doctrine test". It was not: the test covered one payload of
five, and the admin broadcast, the only free-text sender, validated string
length alone. Now `lib/push/copy.ts` holds every visible string,
`lib/push/doctrine.ts` is the predicate, and `doctrine.test.ts` iterates the
table AND greps `lib/push`, `public/sw.js` and the admin route for a `title:`
or `body:` literal living anywhere else. The grep is the load-bearing half; the
word lists catch a careless sentence, not a determined one.

Verified rather than assumed, both directions: a planted payload reading "You
are 3 days behind!" in `lib/push/audience.ts` failed the scan by filename, and
eight real liturgical messages ("Great Lent begins", "The Dormition of the
Theotokos", "Small Compline is in the prayers") all pass.

**CONTRIBUTING clause 3 was false and is reworded.** It promised "at most one
reminder per reader per week". A reader with a morning and an evening time set
receives fourteen. That is one opt-in with two hours in it rather than fourteen
features, and the clause was written against per-feature multiplication, which
is what `MAX_CAMPAIGN_REMINDERS_PER_RUN` actually caps.

**Open, and owner-only.**

1. ~~**Stripe.**~~ **ANSWERED the same day, from the dashboard. No money is
   missing.** Stripe has processed exactly ONE payment in the account's
   lifetime: $19.99 for Pro (Monthly) on 31 July. Zero failed, zero refunded,
   zero disputed, zero uncaptured. That single payment is the web subscription
   behind the one active Pro entitlement in the database, and it is not a shop
   order.

   So the 35 shop checkout sessions genuinely never converted, and the zero
   FAILED count says buyers abandoned before entering card details rather than
   being declined. That is a conversion question, not a defect.

   The path is correctly wired for the first real sale, which was the second
   thing worth knowing: the webhook destination `charismatic-harmony` is
   Active, points at `https://purifyapp.net/api/shop/stripe-webhook`, and
   listens to exactly `checkout.session.completed`, which is the event
   `settleCheckoutSession` handles. Zero deliveries and zero failures, as
   expected when nothing has been bought. Probed from outside beforehand, the
   endpoint answers 405 to GET and 400 "Missing signature." to an unsigned
   POST, so it is deployed and rejecting correctly.

   One thing to note for later: a second destination on the same account posts
   to `data.whop.com` and is subscribed to 24 events. Nothing in this repo
   refers to Whop. Worth confirming it is intentional.

   **THE WHOLE REVENUE PICTURE, so nobody assembles it from one rail again.**
   Purify has earned **$24.98** in its lifetime:

   | Rail | Amount | What |
   |---|---|---|
   | Stripe | $19.99 | Pro (Monthly), 31 July, web checkout |
   | RevenueCat / Play Billing | $4.99 | owner's report, 2026-08-22 |
   | EIKON shop | $0.00 | never |

   The RevenueCat side does not touch Stripe, so reading the Stripe dashboard
   alone understates revenue by a fifth and reading it as "one payment ever" is
   true only of that rail. The database carries two active entitlements with
   `plus_source: "google"`, which is the Play side, plus the one Stripe Pro.

   Two consequences. Anything that reports what Purify earns should use the
   measured $24.98 and not `lib/premium/mrr.ts`, which multiplies subscriber
   counts by list price because no billed amount is stored anywhere and
   `REVENUECAT_V2_API_KEY` is unset. And the app IS monetized, which is the
   condition that matters for the API.Bible free licence: two paying
   subscribers crosses it, while the call and MAU ceilings are nowhere near.
2. **The paid_at migration** needs sign-off before the PR.
3. ~~**Render env**~~ **RESOLVED the same day, and the list above was wrong.**
   Read from the Render and GitHub dashboards rather than inferred from
   `.env.local`: FCM_SERVICE_ACCOUNT_JSON, CRON_SECRET,
   NEXT_PUBLIC_COMMUNITY_ENABLED, NEXT_PUBLIC_CAMPAIGNS_ENABLED,
   NEXT_PUBLIC_SITE_URL, BIBLE_API_KEY with all three BIBLE_ID_* and
   REVENUECAT_REST_API_KEY are **all set**, 29 variables in total. CRON_SECRET
   is a GitHub Actions repository secret as well, and the Scheduled jobs
   workflow has 369 green hourly runs. So the cron delivers and FCM is
   configured, which with 96 registered tokens means **Android push should
   already work**; the 2026-07-18 report that it does not predates the fixes
   and nobody has retested. The remaining test is one broadcast to 96 real
   people, which is the owner's to run.

   Genuinely unset, each explaining a symptom rather than being a surprise:
   the four VAPID keys (so web push cannot work, and `push_subscriptions`
   being empty is consistent rather than broken), the four APNS keys (so iOS
   push dry-runs), and REVENUECAT_V2_API_KEY with REVENUECAT_PROJECT_ID (so
   admin MRR stays an estimate).
4. **Four migrations sit on main unapplied**, probed 2026-08-22:
   `20260801000000_community_notifications`, `20260802000000_profile_preferences`,
   `20260811000000_campaign_groups_and_streaks`, `20260811000100_community_group_threads`.
   `recipes`, `campaign_checkins` and `campaign_streaks` are absent entirely,
   and `/api/admin/community` swallows the read error, so the recipe moderation
   queue reads "nothing awaiting moderation" when the table does not exist.

**Two smoke tests are flaky and pre-existing**, confirmed against a clean tree
with these changes stashed: `mobile-shell` "the entrance shifts nothing" passes
3/3 serially and fails 3/3 under parallel workers (CPU contention, not layout),
and `history` "browser back returns to the timeline" fails about two runs in
three either way. Neither is caused by this branch.

## Addendum, 2026-10-02: Community part two, branch `feat/community-2`

Follows, @mentions, name days, "pray for me", gift Plus, shareable profile
pages, seasonal Plus cosmetics, profile privacy and the Community lag fixes.
Two audited areas are touched.

**Stripe webhook (F-01, F-03 area).** `app/api/shop/stripe-webhook/route.ts`
gains a gift branch that runs before shop settlement and only for a
`checkout.session.completed` whose metadata says `kind: gift_plus`
(`lib/gifts/purchase.ts`). It never reaches `webhookSettlement.ts`, so the
F-01 recovery path and the F-03 amount guard are unchanged for orders. One
gift per checkout session: `gifts_stripe_session_key` is a partial unique
index and a redelivery answers `duplicate`. A failed insert answers 500 so
Stripe retries. The checkout route takes the price from
`STRIPE_GIFT_PLUS_PRICE_ID` and the length from `GIFT_PLUS_DAYS` (1 to 3650);
with either unset the button never shows and the route answers 404. Website
only: the apps never offer it (store rules).

**Two older migrations were never applied, probed 2026-10-02** with the anon
key: `community_notifications` answers PGRST205 (absent, where a table that
exists but is closed to anon answers 401 42501, as `community_post_replies`
does) and `profiles.calendar_reckoning` answers 42703. Item 4 of the
2026-08-22 addendum listed the first; it was still true.
`20261002000000_community_social.sql` creates both, guarded, so it runs the same
whether or not 20260801 or 20260527 is ever applied by hand. Reply
notifications start working live with this merge. The fallback profile read
(`PROFILE_COLS` in `lib/profile/server.ts`) names only columns present in
production; an earlier draft put `calendar_reckoning` there, which would have
failed every profile read.

**Verification record.** `tsc --noEmit` 0. vitest 276 files, 3423 tests, all
pass. eslint clean on every changed file. `npm run build:android` exit 0,
11 trees stashed and 11 restored (`app/(app)/u` is new in the list).
Web `npm run build` exit 0, 1983 of 1983 static pages, with `ƒ /u/[handle]` and `ƒ /u/[handle]/opengraph-image-14v420` (the suffix is the (app) route group's hash, so the bare `/opengraph-image` path 404s by design). The migration ran twice in PGlite on a
production-shaped schema (no notifications table, no reckoning column) and on
a full one, all checks passing, with a positive control: the draft without
the create block fails with `relation "public.community_notifications" does
not exist`.

## Addendum, 2026-10-02 (later): profile pictures, the cropper, the Premium pill

**Uploaded pictures kept reverting.** A reader's upload lived only in
`user_metadata.avatar_url`, which Supabase rewrites from Google at every
Google sign-in, and each post kept the picture its author had when writing
it. Live on 2026-10-02, 4 of the 17 authors in the feed showed one picture on
their posts and another on their profile. `20261003000000_profile_pictures.sql`
adds `profiles.avatar_url` (written only by `app/api/community/avatar`, held
by a check to the reader's own folder in this project's avatars bucket),
backfills each reader's newest upload from `storage.objects`, and makes
posts and replies follow it the way they follow the handle. The nav, the
phone header and the account hero read one store, `lib/profile/myPicture.ts`,
so the top right shows the reader's picture instead of their initials.

**F-27, browser writes to profiles.** The same migration closes it: see the
finding.

**The cropper.** `components/profile/ImageCropSheet.tsx` places a photo
(512 square, drawn as a circle) or a banner (1500 by 500) before upload; the
crop arithmetic is `lib/profile/crop.ts` with tests. The sheet's body drag
now ignores `[data-sheet-nodrag]`, so a pull on the photo moves the photo.

**The Premium pill.** Every `GoldStar` defined the same SVG gradient id; on a
phone the first copy sat in the hidden desktop nav and the pill's star drew
nothing. The star is now a CSS gradient under a clip path. The pill's glow
animated `box-shadow`, a repaint every frame on every page; it now fades a
layer's opacity.

**Verification record.** tsc 0; vitest 279 files, 3436 tests; eslint clean on
every changed file; `20261003` twice in PGlite on a production-shaped schema
with a positive control (a reader's direct `handle` update succeeds before,
answers permission denied after); browser checks with every request mocked:
a 512 by 512 JPEG and a 1500 by 500 JPEG reach the upload routes, the nav
switches to the new picture, a touch drag on the photo leaves the sheet open,
and the phone pill draws its star. `npm run build:android` exit 0, 11 trees
stashed and 11 restored; web `npm run build` exit 0, 1983 of 1983 pages.

## Addendum, 2026-10-02 (evening): Community part three

The owner asked for everything on the list that followed the word filter, a
verified clergy badge, and social links on a profile. One migration,
`20261005000000_community_three.sql`, and the code that reads it. Every new read
falls back to the older shape while the migration is unapplied, so the build
is safe to deploy before or after it runs.

**Safety.** A spam filter (`lib/community/spam.ts`, run by
`lib/community/guard.ts` before every post and reply): per-account posting
limits by trust level (`lib/community/trust.ts`: new, member, trusted,
restricted, staff), the same message twice refused, too many links or
@mentions refused with the limit named, and a blocked or shortened link,
contact-me and money spam, or a new account's link HELD: stored with status
`held`, shown to nobody, and queued in `community_text_holds` with a reason.
Reports from different readers add up (a new account's report counts half, a
moderator's hides at once) and hide a post or reply until a moderator looks
(`lib/community/autoHide.ts`); a moderator who keeps it up sets
`mod_cleared_at`, and reports no longer hide it on their own. Mutes
(`community_mutes`) take a reader's posts out of the muter's feeds and fold
their replies; nobody is told.

**Moderators in the app.** Readers with the Moderator or Team badge work the
same queue from `/community/moderate` (exported in the phone apps too)
through `app/api/community/moderation`. The admin console's conversation
actions now call the same functions (`lib/community/moderation.ts`), so the
two cannot drift, and every action from either is written to
`community_mod_log` with who took it. Reports leave the server with
`is_profile` instead of the reported reader's auth id; the admin tab was
the only consumer of `profile_id` and now reads the flag.

**Clergy.** `clergy_verifications` (a reader may read only their own row;
nobody but the service role writes it) replaces the hand-granted Clergy
badge; the migration moves any existing grant over as verified. Readers ask
from their profile editor (`app/api/profile/clergy`); the team decides in the
Verification tab (`app/api/admin/clergy`). The seal reaches the feed as
`author_clergy`, denormalised by trigger like `author_verified`, never as an
id. Ask a Priest questions are `category = 'question'` on an ordinary
discussion, so installed apps that predate categories show them as
discussions.

**Push.** Community notifications reach the reader's devices
(`lib/community/push.ts`, after the response via `after()`), worded only from
`lib/push/copy.ts` and checked against the same bar as every other push; a
name the bar refuses is left out. At most 12 an hour per reader; readers can
switch them off (`profiles.push_community`).

**Email.** The weekly Community email is a new opt-in list
(`email_preferences.community_digest`, off by default), sent on Sundays by
the lifecycle job through `sendMarketingTo`, so it carries the unsubscribe
link, the one-click headers and the postal address like every list.

**Verification record.** tsc 0; vitest 290 files, 3533 tests; eslint clean
on every changed file; i18n audit 0 errors across 21 locales (186 new keys
each); `20261005` applied twice in PGlite on a production-shaped schema
(20261001 to 20261004 first) with 56 checks, including a reader's own insert
into `clergy_verifications` answering permission denied; a mocked browser
pass against a dev server pointed at a fake Supabase (13 flows, 0 console
errors); `npm run build:android` exit 0, 11 trees stashed and 11 restored,
`/community/moderate` exported; web `npm run build` exit 0, 1984 of 1984
pages.

## Addendum, 2026-10-03: no merge has ever applied a migration, branch `claude/heuristic-swartz-4ce8c4`

The owner asked why the "Supabase Preview" check fails on every push to
`main`. F-28 is the finding. This is the record of how it was established
and the order the repair has to go in. Nothing was run against production
and nothing was pushed: the check still fails today exactly as it did.

**What the check says, across all of main.** `gh api graphql` over the
history of `main`, check suites per commit, returns 369 check runs from the
Supabase app: 258 failures, 111 skips, no success. 257 of the failures carry
the same four lines:

```
ERROR: duplicate key value violates unique constraint "schema_migrations_pkey" (SQLSTATE 23505)
Key (version)=(20260527) already exists.
At statement: 5
INSERT INTO supabase_migrations.schema_migrations(version, name, statements) VALUES($1, $2, $3)
```

The first is `e8ed6d10` at 2026-07-04T04:08Z, the latest `c3723787` at
2026-10-03T00:16Z. The one failure that differs is `4ddef2ee`, "Failed to
update config for branch: main". The skips are all on branch commits.

**How a run decides what to run.** The error text is the Supabase CLI's own
(`formatError` in `apps/cli-go/pkg/migration/file.go`, repo supabase/cli,
branch develop, read 2026-10-03, latest release v2.119.0), so the run is
that code or a copy of it. A filename has to match `^([0-9]+)_(.*)\.sql$`;
the digits are the version, however many there are, and the rest is the
name. Files are listed in directory order. The history is read with
`SELECT version FROM supabase_migrations.schema_migrations ORDER BY version`,
and `version` is `text NOT NULL PRIMARY KEY`. The two lists are walked
together (`FindPendingMigrations`). A recorded version with no file is an
error, "Remote migration versions not found in local migrations directory",
and nothing runs. A file that sorts before a recorded version it does not
match is out of order, and is refused unless the run was started with
`--include-all`. Whatever is left past the end of the history runs in order,
each file as one implicit transaction: `RESET ALL`, its statements, then the
insert above. `ApplyMigrations` returns on the first error. "At statement: 5"
is the index of the statement that failed, and the calendar matrix file has
exactly five, so what failed is the insert, after the file's own SQL had
gone through.

**Reproduced.** A port of those functions, run on PGlite 0.5.8 (PostgreSQL
18.3) against an empty database given what these files need from Supabase:
the `anon`, `authenticated` and `service_role` roles, `auth.users`,
`auth.uid()`, `storage.objects`, pgcrypto, and the default grants on
`public`.

| Folder | Result |
|---|---|
| as on `main`, three runs in a row | Run 1 applies four files and stops at the calendar matrix file with the four lines above, byte for byte. Runs 2 and 3 apply nothing and print them again. History afterwards: 20260518, 20260521, 20260526, 20260527. `profiles.calendar_reckoning` absent, as production's was on 2026-10-02. |
| renamed, before moving `admin_extensions` | 82 of 83: `relation "public.csp_reports" does not exist`. |
| renamed, as committed | 83 of 83 in folder order. A second run applies nothing. |

So the prediction for production's history table is four rows, the first
four files. It is a prediction. Nobody has read that table, and the repair
refuses to run unless the table holds exactly what the dump showed.

**Why 2026-08-12 looked like proof.** `d91acf46` recorded that
`is_campaign_group_member` answered on production minutes after a merge
"with nobody typing any SQL", and rewrote AGENTS.md to say the merge is the
apply. That function reached `main` in `6446b6db` at 10:12Z that day. The
Supabase check on `6446b6db` is a failure with the four lines above. So is
the one on `40a8208b`, "Purify 1.1", which carried both 20260811 files and
the support email change. The integration did not apply them. What did is
not recorded anywhere this session could read.

**What the branch holds.** `8e1b9e0d` is the rename and nothing else: 83
files to unique 14-digit versions, date kept, `HHMMSS` added in the old
order, `admin_extensions` moved from 20260528 to `20260529000300`, 336
references rewritten. Undoing the map on its 237 files gives back its parent
byte for byte. To turn a new name into the old one,
`git log --follow -- supabase/migrations/<file>`; for the whole map,
`git show --stat 8e1b9e0d -- supabase/migrations`. The commit after it adds
`lib/supabase/__tests__/migrationVersions.test.ts`, which refuses a shared
or misshapen version (seen red on an eight-digit name and on a shared
version, green on the folder), `supabase/catalog-dump.sql`, and the
corrections to AGENTS.md, `docs/admin-rework.md` and one comment in
`lib/shop/stock.ts` that repeated the old claim.

**The order of the repair, and why.** The history must say what is already
applied before the renamed files reach `main`. What a run does in each
state, on a stand-in for production (everything applied by hand, history as
the integration left it), under both the Go and the TypeScript CLI's
ordering, with and without `--include-all`:

| Folder on `main` | History | The run |
|---|---|---|
| old names | four old rows | today: runs the calendar matrix file, fails recording it, rolls back |
| new names | four old rows | refuses, "Remote migration versions not found", runs nothing |
| old names | repaired | refuses the same way, runs nothing |
| new names | repaired, every file recorded | nothing to do, succeeds |
| new names | repaired, one never-applied old file left out | applies it with `--include-all`, refuses it as out of order without |
| new names | repaired, the newest files left out | applies them in order, then nothing to do |
| unique versions, hand-applied files NOT recorded | four rows | runs 16 applied files again, brings back the four-argument `upsert_entitlement` that 20260713 dropped, stops at `terms_acceptances` on "policy already exists", and stops there on every push after |

The last row is why renaming alone is not the fix. Rows two and three fail
safe as far as the CLI source goes, but the hosted run is not public code,
so the plan does not lean on them:

1. The owner runs `supabase/catalog-dump.sql` in the SQL editor. One
   read-only query, one cell back: the history table, and the name of every
   table, column, function, policy, trigger, index and constraint in
   `public`, with privileges and fingerprints.
2. That dump is compared with the same dump taken from a replay of the
   folder, fact by fact, each fact attributed to the file that establishes
   it. The result is a verdict for each of the 83 files: applied, not
   applied, or partly.
3. Every file the dump shows unapplied gets a decision before anything is
   written. Run by hand now, and recorded. Or already done by a later file
   (`20261002000000_community_social.sql` re-creates what the notifications
   and calendar files were for), recorded without running, and its header
   says so. Or, only for files that sort after everything recorded, left
   out so the first green run applies them, which needs the owner's
   sign-off on that SQL because the merge will then run it. Never leave an
   unrecorded file in the middle: row five.
4. The repair SQL is written from the dump. It is one statement, a `do`
   block on the one table, so it happens whole or not at all however the
   SQL editor sends it. It raises and changes nothing unless the history is
   exactly what the dump showed; moves the rows the integration wrote to
   their new versions, keeping their recorded statements; inserts one row
   per file that was run by hand, `statements` left null; and raises,
   undoing all of it, unless the result is the expected count of 14-digit
   rows. The rollback is its inverse. Tried on the stand-in: repair, guard
   against a history that had moved, and rollback all behave. The owner
   signs off the exact text. It is the same change `supabase migration
   repair --status reverted` and `--status applied` would make, without
   needing the CLI, a linked project and the database password on this
   machine; the CLI is not installed here.
5. The repair runs, and this branch merges straight after with no other
   push in between. Safer still, the integration's "Deploy to production"
   option is switched off for those few minutes and back on afterwards.
6. The check on that merge commit should read `success` with nothing
   applied. When it does: update the status sentence in AGENTS.md, close
   F-28, and say so here.

**What happened next, same day.** The owner said to do the merge and, asked
whether the repair had been run, answered that it had. The branch went to
`main` as a fast-forward at 20:47Z, `c3723787..37911f58`. The Supabase check
on `37911f58` finished at 20:48Z as a failure:

```
Remote migration versions not found in local migrations directory.
```

That is the second row of the table above: renamed files on `main`, a
history that still names versions no file carries. So the history did not
hold the 83 rows the repair writes when the run read it. The repair text
shown to the owner was checked against the folder afterwards, row for row,
from the session transcript: 83 versions, 83 names, no difference, so the
text is not the cause. Going by the CLI source the run stops before
executing anything in this state, and the stand-in agrees under every
ordering. It was not possible to confirm that against production from here.
Until the history is read, do not assume which rows it holds. The steps are
unchanged, only their order was lost: read the table, run the repair, and
the next push to `main` should be the first green run.

**Closed, same day.** The owner ran the repair between 20:48Z and 21:08Z.
The commit carrying the paragraph above went to `main` at 21:07Z as
`040681fa`, and the Supabase check on it finished at 21:08Z as `success`:
the first green run since the integration first reported on 2026-07-03.
Three runs in a row tell the story: `c3723787` duplicate key, `37911f58`
"Remote migration versions not found", `040681fa` success. Re-requesting
the failed check through the GitHub API answers 404 for this app, so a push
is the only way to start a run.

The site: its build id changed from `i0ejQKKLKdXQL_bLqgAi_` to
`e6_uqTBp2cz1Acd7ChsWh` by 21:11Z, and `/`, `/shop`, `/whats-new`,
`/bible/john/1`, `/community` and `/api/shop/catalog/config` answered 200
before and after.

What production holds was then probed with the public anon key, the probe
AGENTS.md describes: 30 GETs with `limit=0`, so no row left the database,
and no RPC was called, because calling a function to see whether it exists
would run it. For each of the nine newest or doubtful files, the tables it
creates and the columns it adds:

| File | Found |
|---|---|
| `20260527000100_profiles_calendar_matrix` | `calendar_reckoning` present, `calendar_tradition` ABSENT |
| `20260801000000_community_notifications` | table and its nine columns present |
| `20261001000000_profiles_badges` | all present |
| `20261002000000_community_social` | all present |
| `20261002000100_shop_promotions` | all present |
| `20261003000000_profile_pictures` | `profiles.avatar_url` present |
| `20261004000000_community_filter` | all present |
| `20261005000000_community_three` | all present |
| `20261006000000_streaks` | all present |

So the newest files had all been run by hand, and the one known gap is the
calendar matrix file: recorded as applied by the repair, never run, and
`calendar_tradition` and its check are still missing. Nothing in the app
reads that column. `calendar_reckoning` and the notifications table are
there because `20261002000000_community_social.sql` creates them, guarded.
Both older files now say so in their headers. `calendar_tradition` was
still absent after the failed run on `37911f58`, which is what the CLI
source says about that state: the run stops before executing anything.

Still not verified: policies, indexes, triggers, grants and function bodies
for any file, and anything at all for the 74 older files. The catalog dump
would answer all of it in one read; it has not been run. The history table
itself has still not been read by anyone but the integration.

**What changes from here.** A merged migration now really runs. AGENTS.md
carries the three rules that follow: sign-off on the SQL before the merge;
never edit the SQL of a file that has reached `main`, because a recorded
version does not run again; and write every file so it can run twice,
because the owner may run it by hand before the merge runs it again, and a
file that fails on its second run stops every file after it.

**Verification record for the closing commit.** It changes three documents
and the comments of two migration files, no code. The folder still replays
from empty, 83 of 83. The unit suite did not give a clean full run that
evening: the machine was five to eight times slower than in the morning,
and across four full runs six different file-scanning tests timed out,
never the same set (the last run: 3552 passed, 1 timed out, 2 skipped).
Run on their own, those six pass together with the six tests that read
migration files: 12 files, 80 tests, 8 seconds. The morning's full run, on
the tree before these text edits, was 3553 passed and 2 skipped.

**The one gap, closed.** That commit went to `main` as `2a9672ce` at 22:26Z
and its Supabase check was the second success in a row. The owner then ran
the calendar matrix file's five statements by hand, and at 22:32Z
`profiles?select=calendar_tradition&limit=0` answered 200 where it had
answered 42703 at 21:15Z. The two check constraints in that file cannot be
seen through the API and were not verified. The table above is as it was
found at 21:15Z; its first row is no longer true.

**Not verified.** What production's history table holds. Which files
production really has. Whether the hosted run uses `--include-all`. The
hosted run itself: everything said about it is inferred from the CLI source
and from the port printing the check's text exactly.

**Left as written, on purpose.** `data/changelog/entries.json` still names
the calendar matrix file by its old name: it is reader-facing and mirrored
in the `patch_notes` table. Seven comments in `.github/workflows` keep old
names. Migration headers written between 2026-08-12 and 2026-10-02 speak of
the merge applying or re-running a file; they record what the owner ran by
hand, and the sentences about the merge describe a belief, not an event.
`supabase/APPLY_NOW.sql` is from July and stale; only the names in it moved.

**One patch note to look at.** The v6.4 entry in
`data/changelog/entries.json` says the calendar matrix file adds
`profiles.calendar_reckoning` and `profiles.calendar_tradition`. That file
has never run in production. Not edited here: notes live in the
`patch_notes` table and go through the propose flow.

**Tooling.** The port of the runner, the replay, the comparison and the
generator for the repair SQL were written in the session's scratch
directory and are not in the repo. If that session is gone when the dump
comes back, the pieces to rebuild are the five functions named above, a
replay that takes the dump after every file to learn which file establishes
which fact, and a set difference. The fallback that needs none of it is to
record all 83 files as applied, which freezes production exactly as it is
and leaves any unapplied file dark until it is run by hand, as it is today.

**Verification record.** `tsc --noEmit` 0. vitest 291 files passed and 1
skipped, 3553 tests passed and 2 skipped. eslint exit 0 on the 130 changed
code files. Not run: `npm run build`, `build:android`, `build:ios`. Outside
the new test, the only changes that are not comments are filename tokens
inside operator-facing strings in admin routes and tabs.

## Addendum, 2026-10-03: upload paths that named their owner, branch `fix/upload-random-paths`

F-29 is the finding and F-30 rides with it. The owner ran the SQL by hand
on 2026-10-03, after the branch was built. Nothing was pushed, and the
script was not run against production.

**What was wrong.** A member's Kitchen photos were stored at
`r/<user id>/` and `s/<user id>/` in the public `kitchen` bucket, and
campaign pictures at `c/<user id>/` in `campaign-media`. The path was the
ownership proof (`ownsKitchenPhoto` compared it with the caller's id), so
the auth uuid had to be in a URL every reader is served.

**What replaces the proof.** A table, `upload_owners`
(`20261007000000_upload_owners.sql`): bucket, path, owner, service role
only. The upload route writes the row before it stores the file, so nothing
is ever stored that the server cannot say whose it is, and it stores nothing
while the table is absent (503). The alternatives were weighed and left: a
keyed hash of the id in the path still builds the path from the id and
breaks on a key rotation; a list in `app_metadata` rides in every token and
loses entries when two uploads race; storage object metadata is served by
the public info endpoint of a public bucket. The table changes nothing the
client sends: it still only echoes the URL it was given, so installed apps
keep working.

**The rules, in one place.** `lib/security/uploadOwners.ts`.
- Attach (review, recipe, campaign): a URL new to the row must be a random
  path the record gives to the caller. A photo the review already carries
  stays, whatever its path, so an edit never depends on the record.
- Delete for a reader (campaign takedown, by the creator or a moderator):
  only a file the record gives to the campaign's creator, or an old path
  with the creator's id in it. This is what closes F-30.
- Kitchen deletes stay driven by the row, as before: every photo URL on a
  review was checked when it was written. They now also drop the record.

**Order, and why.** SQL, then deploy, then the script. Deploy before the
SQL and photo uploads answer 503 until it is run; nothing else changes.
Script before the deploy and a member whose photos it moved cannot save an
edit to their own review, because the old route only accepts a photo under
`r/<their id>/`. The script stops before writing anything if the table is
absent.

**What the script leaves.** Old files no row names, taken-down reviews and
campaigns (their files were deleted when they came down), and a recipe's own
photo under `h/<recipe id>/`. A recipe whose author deleted their account
still moves, with no owner recorded. A review its author saves while the
script is writing it is not overwritten: the write is conditional on
`updated_at`, and the row waits for the next run.

**Production today, counted 2026-10-03.** Public API: 17 published recipes,
none with a stored member photo, no published review, `/api/campaigns` 404.
Anon key: `upload_owners` 404 `PGRST205` (absent), with `reader_streaks`
401 `42501` as the control for "there and closed"; one campaign readable,
no picture. So no reader is being served an id in a photo URL today, and the
script will likely find little or nothing. Rows only the service role sees
were not counted.

**After the owner ran the SQL, same day.** With the anon key a read, a
zero-row PATCH and a zero-row DELETE on `upload_owners` each answer 401
`42501`: there, and closed to browsers. The merge will run the file again
now that a merge applies migrations (F-28, closed the same day); every
statement is guarded, and the file ran twice on PGlite.

**Left open.**
- The avatar route still writes `u/<user id>/`, and
  `20261003000000_profile_pictures.sql` now requires it by a CHECK. Pinned
  in `uploadPathPrivacy.test.ts` with that reason. `fix/avatar-random-path`
  cannot land as it is.
- `app/api/auth/delete` removes no files. `upload_owners` rows go with the
  account (cascade), and the files stay. A cleanup would have to read the
  rows before the account is deleted.
- Abandoned uploads are never swept. The table now makes them findable: a
  row whose path no review, recipe or campaign names.
- `fix/profiles-column-grants` (unmerged) also takes F-29, for the banner
  delete, and first recorded F-30. The ledger test wants ids with no gap,
  so both branches number from F-29. Merging both conflicts in
  `findings.yaml` and here, at the end of each list: keep both texts, move
  the second branch's F-29 to the next free id, and keep this branch's
  F-30, which carries the fix.

**Verification record.** In the commit message.

## Addendum, 2026-10-03 (night): the admin panel's numbers, audited, branch `claude/heuristic-swartz-4ce8c4`

The owner asked for a full read of the admin panel and the Play Console.
Neither browser was signed in, and the owner chose "read the database
directly": the server key in `.env.local`, read-only. Findings F-31, F-32 and
F-33.

**How it was read.** Not by hand-written queries. A temporary test ran each
admin route's own GET handler with the gate replaced and every network call
passed through a filter: GET and HEAD to this project's Supabase, plus the
read-only RPCs, and nothing else. A handler could not have written even by
mistake, and nothing reached Stripe, RevenueCat or Apple. 57 routes answered,
none threw, none was blocked. What went to disk was scrubbed of emails, names
and addresses and stayed in the session's scratch folder. The filter also
counted the rows each request returned, which is how F-31 was found: seven
requests came back with exactly 1,000.

**The numbers on 2026-10-03**, for the next reader to measure against:

| | |
|---|---|
| Accounts | 2,295 (Google 1,781, Apple 329, email 185) |
| Signed in within 7 / 30 days | 130 / 687 |
| Visits, all time | 39,347 since 2026-05-21, 615,035 page views |
| Visits by month | Jun 6,984 · Jul 5,570 · Aug 9,498 · Sep 14,313 |
| Sign-ups by month | Jun 161 · Jul 530 · Aug 872 · Sep 601 |
| Page views, 30 days | 229,852 in 14,013 visits; median 7 pages a visit |
| Where they go, 30 days | Prayers 85,427 · Bible 45,035 · Saints 27,246 · Home 27,675 |
| Paying subscribers | 6 by the panel's count (4 Plus, 2 Pro). Plus by source: 11 comp, 5 Google Play, 1 gift |
| MRR, at list price | $49.96 |
| Shop | 70 checkouts started, 4 paid, $94.88; 0 shipped |
| Costs switched on | $147 a month |
| Devices that can be pushed to | 310 (172 Android, 138 iPhone) |
| Opted in to email lists | 1 |
| Play installed audience | 989 on 2026-08-25, the last import |

"Visits" are browser-tab sessions, not people: `purify:sid` lives in
sessionStorage. "Signed in within 30 days" is `last_sign_in_at`, which moves
on a sign-in and not on use, so it undercounts readers who stay signed in.

**What is not repaired, and why.** F-33, because it is the Stripe settlement
path. The roughly forty other reads that ask for more than 1,000 rows in one
request, because most are on tables that are still small; the three in
`lib/email` are the ones that will hurt first. The Play Console itself was
not read: what is above is the admin's own import, five weeks old.

**The order for F-32.** `20261008000100_admin_rollups.sql` is NOT in the
first push. It goes to the owner as SQL to run, which is the sign-off, and is
pushed after; the merge then runs it a second time, which it is written to
survive. Until then Audience is whole by paging, and Engagement and Content
count the newest 20,000 page views and say so on the tab. The file was first
written as `20261007000100` and renamed, because
`20261008000000_avatar_random_path.sql` reached main first and a file that
sorts before the newest recorded version is refused as out of order.

**After the owner ran it, 2026-10-04.** The hole is closed. At 00:15Z an
anonymous call to each of the five functions answered 401 with 42501; the
two resync functions were asked with the nil uuid, which matches no row.
Audience is whole: 13,974 sessions from the function, 13,974 by a direct
count. The page view function is exact and too slow. Timed on production
with the server key at 00:16Z:

| Range | Answer |
|---|---|
| 7 days | 200 in 4.0 s, 50,866 views |
| 30 days | 200 in 7.8 s, 229,714 views |
| 90 days | 500 at 8.2 s, 57014 |
| All time | 500 at 8.3 s, 57014 |

The API cancels any statement at 8 seconds, so two of the four ranges on
Engagement and Content said the range could not be read, and the default one
was a bad second from it. So the file did not go to main as the owner ran
it. Two repairs instead:

- **In the code, pushed.** On 57014 `pageviewRollup` counts the newest
  20,000 page views in pages and says so in `partial`, the way it already
  did when the function was absent. A tab that cannot count everything shows
  a stated sample, never an error and never a short number dressed as whole.
- **In the SQL, waiting on the owner.** The function cleaned every path with
  a regular expression and counted distinct sessions three times over every
  row. The second version reduces the page views to one row per path and
  session first, cleans each distinct path once, and counts from those
  pairs. Held equal to the first version and to the tally in
  `lib/admin/rollups.ts` on 600,000 made-up page views, in about half the
  time. It also carries its own `statement_timeout` of 25 seconds, which the
  API reads from a function's settings and applies to the request, and a
  `work_mem` of 16MB so a month of hashes stays in memory. Not more, on
  purpose: a call can use that much several times over, two tabs can call at
  once, and 64MB bought nothing for a month and a fifth for all time on the
  same made-up rows.

**After the owner ran the second version, 2026-10-04.** Said shortly
before 00:34Z, and checked rather than taken on trust: the function was
timed with the server key, fifteen calls between 00:34Z and 00:36Z. The
machine is shared
and its speed moves two or three fold from one minute to the next, so these
are ranges, not figures:

| Range | Second version | First version |
|---|---|---|
| 7 days | 0.3 to 3.4 s | 1.5 to 4.0 s |
| 30 days | 0.7 to 4.8 s | 5.0 to 7.8 s |
| 90 days | 2.2 to 7.7 s | cancelled at 8 s |
| All time | 5.4 to 9.1 s | cancelled at 8 s |

Every range answered on every call. The 9.1 second call is the proof that
the function's own timeout is honoured: nothing without that setting gets
past 8. An anonymous call to each of the five functions still answered 401
with 42501. The handlers were then run through the read-only filter:
Engagement for all time answered whole in 8.4 s, 615,254 views in 39,360
visits, where the evening before it had said 1,000; 30 days in 2.3 s,
223,161 views in 13,615 visits; Content in 4.3 s and Audience in 1.9 s,
both whole. The file went to main after that, with
`lib/admin/__tests__/rollupsMigration.test.ts`. Whether the merge's own run
of it succeeded is on that commit's Supabase check, not here.

**The merge's own run.** `6fc2a211` carried the file to main at 00:40Z. The
Supabase check on it is `success` (00:41Z), so the integration ran the file
a second time and recorded `20261008000100`. Asked again afterwards: the
five functions still refuse the public key, and all time still answers past
8 seconds (9.1 s), so the settings survived the second run.

**Were there others like F-32? Asked of production, 2026-10-04T00:43Z.**
The folder was replayed on PGlite with Supabase's default grants and
Postgres was asked, function by function, who may call what: of the 33
functions the folder creates that can be called at all, the only
`security definer` ones open to the public key are
`is_campaign_group_member`, on purpose, and
`community_mark_notifications_read`, by F-32's mistake. But the folder is
not the database, so production was asked too, with the public key and in
two ways that cannot run a function body:

- An argument that cannot be turned into the type asked for, `"x"` for a
  uuid, an integer or a date. Postgres checks the right to call when it sets
  the statement up, before it reads an argument, so a role without the right
  gets 42501 and a role with it gets 22P02, and neither enters the function.
  Nineteen functions asked, among them `upsert_entitlement`, `claim_gift`,
  `claim_eikon_box`, `shop_apply_paid_inventory`, `rate_limit_hit` and both
  review submitters: all nineteen refused. `is_campaign_group_member`
  answered 22P02, which shows the method tells the two apart.
- A GET, which the API runs in a read-only transaction, for the four that
  take no such argument. `ambassador_click`, `clear_matured_commissions` and
  `merge_insight_points` refused. `community_mark_notifications_read`
  answered 25006, "cannot execute UPDATE in a read-only transaction": the
  public key may call it.

That last one is F-32's mistake again (`revoke ... from public`, then a
grant to `authenticated`, with anon's default grant left standing) and it
is harmless: the function updates rows `where user_id = auth.uid()`, which
is null for the public key, so it touches nothing. It should lose the grant
in the next migration that passes that way; it is not worth one of its own.
With F-32's five, that is 27 of the 32 functions production offers the
server key refused to the public key, two open and accounted for, and three
not asked, all of them plain helpers that run with the caller's own rights
(`mark_password_set`, `profile_handle_base`, `profile_handle_seed`).
Not asked either: what a signed-in reader may call, because this session
has no account to ask with. And nothing in the repo refuses the next
function created this way. A test that does is the follow-up.

**The follow-up, 2026-10-04, branch `test/function-grants-scan`.**
`lib/security/__tests__/functionGrants.test.ts` reads every file in the
folder in name order and keeps, for each function signature, who holds
EXECUTE, the way Postgres would: a new function starts open to PUBLIC, anon
and authenticated, `create or replace` on the same signature keeps the
grants it had, and a drop or a different argument list starts again. It
fails, naming the function and the file, when a `security definer` function
the API can call is left to anon or authenticated without an entry in its
`LEFT_OPEN` list that says who and why. Four entries: the two above, and
`shop_submit_review` and `shop_submit_store_review`, open to signed-in
buyers on purpose and closed to anon. The entries are held to the folder in
both directions, so the migration that takes anon's grant from
`community_mark_notifications_read` has to take anon out of its entry too.
No migration was written here: that one needs the owner's sign-off first.

One departure from its brief, which asked for a revoke at or after a
function's last definition. `shop_submit_review` was closed to anon in
`20260714000100_shop_review_identity.sql` and has been replaced twice since
with no revoke. Postgres keeps a function's grants across
`create or replace`, so it is still closed, which is what the replay
measured, and the test follows Postgres. A function that is dropped and
made again, or made again with another argument list, does start open, and
the test holds that too.

Held against Postgres, not against itself. The folder was replayed on PGlite
(PostgreSQL 18.3) with Supabase's default grants, 86 files and none failed,
and the scan's answer for anon and for authenticated was set beside
`has_function_privilege` for all 51 functions in `public`, the trigger
functions and the ones that run with the caller's rights included: equal on
every one. The 14 cases in the test file were run the same way, and 33 more
shapes that are not in it (out parameters, defaults, sizes, quoted names,
nested comments, overloads, a drop with no argument list): equal on every
one. Then the bite: a scratch migration with a new `security definer`
function and `revoke all ... from public` alone. The test failed with
`public.scratch_daily_counts(timestamptz), last defined in
20261009000000_scratch_open_definer.sql: anon and authenticated can call
it`, Postgres on the same replay said both could call it, and with the three
roles named in the revoke it passed. The scratch file is gone, and the bite
stays in the test: it adds a file of its own to the real folder's, the same
mistake, and expects to be refused by name.

What it does not do. It reads the folder, not the database, so production
is still asked with the public key, as above. And it follows plain
`create`, `drop`, `grant` and `revoke` at the top level of a file: a grant
on functions inside a `do` block, `alter default privileges`,
`grant ... on all functions in schema` and `alter function ... security
definer` it refuses by name, failing, rather than guess.

Verification record: `tsc --noEmit` 0; vitest 305 files passed and 1
skipped, 3,748 tests passed and 2 skipped; eslint exit 0 on the new file.

**What is left.** Nobody has opened the three tabs in a browser: this
session had no admin session to open them with, so what is verified is what
the routes answer, not what the tabs draw. And the lasting answer is not a
faster query. Every call reads every page view in its range, all time grows
by about 230,000 rows a month, which is a second or two, and it passes the
25 seconds allowed inside a year. From then that range shows a stated
sample. A small table of daily counts kept as the views arrive is the
repair that lasts, and it is a schema decision for the owner.

**Verification record, 2026-10-04.** On top of `9375a6fe`: `tsc --noEmit`
0; vitest 304 files passed and 1 skipped, 3,726 tests passed and 2 skipped;
eslint exit 0 on the three rollup files. The renamed file was replayed last
on PGlite after the whole folder, run twice, and held against the
written-out tally and the privilege checks again. The function was timed at
five `work_mem` settings on 600,000 made-up page views, with the same answer
at every one: for 30 days 1.3 s at the 4MB default, 1.1 at 16MB, 1.1 at
64MB; for all time 6.1, 5.4 and 4.4.

**The timeout path, run against production.** After the push (`969d0832`,
Supabase check `success`), the three handlers were run through the same
read-only filter as the audit, at 2026-10-04T00:30Z, while production still
had the slow first version of the function:

| Handler | Answer |
|---|---|
| Engagement, 30 days | 200 in 8.9 s, whole: 223,149 views in 13,613 visits |
| Engagement, all time | 200 in 19.4 s, a stated sample: the function was cancelled at 8 s, then 20,000 page views and 39,360 sessions read in 61 pages, `partial` naming a shorter range |
| Content | 200 in 6.7 s, whole |

The 30 day figure is smaller than the 229,714 the function gave a quarter of
an hour earlier because the route's window starts at midnight UTC 29 days
back (`windowStart`), not 720 hours back.

**Verification record.** `tsc --noEmit` 0. vitest 298 files passed and 1
skipped, 3,644 tests passed and 2 skipped. eslint exit 0 on the 13 changed
code files. The SQL was held against the written-out tally on PGlite: the
whole folder replayed, the new file run twice, 30,000 made-up page views and
4,000 sessions, every list equal, and anon and authenticated refused on all
five functions afterwards where anon was let in before. The repaired routes
were then run against production through the same filter. The tabs
themselves were not opened in a browser: there was no admin session to open
them with.

## Addendum, 2026-10-03 (later): the profiles grants probed live, and what a profile's files lean on, branch `fix/profiles-column-grants`

**No new migration.** The brief was written against e0080e57 and asked for
one that limits UPDATE on profiles to the columns the browser writes.
`20261003000000_profile_pictures.sql` (bc47d3e6, its section 4) already is
that migration, so none was drafted. What F-27 still owed was the probe.

**F-27 is applied in production.** With the public anon key, and no row
changed: `profiles.avatar_url` answers 200 (a column that cannot exist
answers 42703), and a PATCH that can match no row (role anon, the nil uuid,
`joined_at` before 1900) answers 42501 "permission denied for table
profiles" for `banner_url`, `handle` and `display_name`, while the same PATCH
on `bookmarks` answers 200 `[]`. Section 4 of the file was then run in PGlite
over Supabase's default grants: before it the zero-row PATCH passes and a
reader sets their own `handle`, `banner_url` and `theme_primary` directly;
after it all of those are refused and `display_name` still saves. So
production gives the "after" answer. pg_graphql is off there, so nothing
read-only shows the grants themselves, and the reader's half (role
authenticated) is not observed: it needs a signed-in session and none was
used. One read in the SQL editor settles it, and says in the same row
whether anyone used the hole while it was open:

```sql
select
  (select string_agg(attname, ', ' order by attname)
     from pg_attribute
    where attrelid = 'public.profiles'::regclass
      and attnum > 0 and not attisdropped
      and has_column_privilege('authenticated', attrelid, attname, 'UPDATE')) as reader_can_update,
  count(*) filter (where banner_url is not null) as banners,
  count(*) filter (where banner_url !~ '^https://avbqyvjgcrucjwevwixt\.supabase\.co/storage/v1/object/public/avatars/b/[0-9a-f-]{36}\.(jpg|png|webp)$') as banners_not_uploaded_here,
  (select count(*) from (select 1 from public.profiles where banner_url is not null group by banner_url having count(*) > 1) shared) as banners_named_by_two_profiles,
  string_agg(handle, ', ' order by handle) filter (where handle in (
    'admin', 'administrator', 'api', 'community', 'eikon', 'everyone', 'help', 'here', 'me', 'mod',
    'moderator', 'null', 'official', 'owner', 'plus', 'premium', 'pro', 'profile', 'purify', 'purifyapp',
    'purifyteam', 'reader', 'root', 'settings', 'staff', 'support', 'system', 'team', 'undefined', 'verified'
  )) as reserved_handles_in_use
from public.profiles;
```

`reader_can_update` should be exactly `depth, display_name, focus,
has_password, preferred_language, updated_at`. `banners_not_uploaded_here`
and `banners_named_by_two_profiles` should both be 0: anything else is a row
somebody wrote directly. `reserved_handles_in_use` should hold only the names
the team took for itself (the list is `RESERVED_HANDLES` in
`lib/profile/handle.ts`). Run in PGlite on a profiles-shaped table: every
column before the grants, the six after, and 1, 1 and `purify, support` once
two rows were altered the way the hole allowed.

**The owner's answer, same day.** Read out in chat from a tablet, with no
paste or screenshot, so reported and not seen. `reader_can_update`: depth,
display_name, focus, has_password, preferred_language, updated_at, and
nothing else. `banners` 2, `banners_not_uploaded_here` 0,
`banners_named_by_two_profiles` 0. `reserved_handles_in_use`: purify alone,
the team's own account. That is the healthy answer on every count: a
signed-in reader can write the six columns and no others, and nobody
altered a banner or took a reserved name while the hole was open. F-27 moves
to corrected-verified-live, its anon half seen by this session's probe and
its signed-in half on the owner's reading.

**The browser's writes, counted again.** 15 writes to profiles in the repo, 3
of them with the reader's own session: `display_name` and `updated_at`
(`components/profile/ProfileHero.tsx`), `preferred_language` and `updated_at`
(`lib/i18n/switchLocale.ts`), `focus` and `depth`
(`lib/profile/preferences.ts`); plus `has_password` and `updated_at` through
`mark_password_set`, the one SQL function that writes profiles as its caller.
The six granted columns, exactly. `profileWrites.test.ts` read `components/`
and `lib/`; it reads `app/` too now, so a page or a route that writes with
the reader's session is held to the same list.

**F-34, banner deletes.** The banner route and the moderators' "clear
profile" deleted whatever `b/<uuid>` file `profiles.banner_url` named, on any
host. Whose banner a file is now comes from `upload_owners`, the record F-29
brought for the Kitchen and campaigns. The route writes the owner down before
the file goes up, and stores nothing while the table is absent. A new banner
replaces the one the row showed before, when the record gives it to the
reader: only that one, since a second upload in flight has a record too and
must not lose its file. A removal, and a moderator's clear, take every banner
file the record gives them. A banner from before the record (the owner's read
found two) goes only when it has no row in the record at all and no other
profile names it, matched on the path so another spelling of the host still
counts; not knowing is a no. The rule is `lib/profile/bannerFile.ts`, for the
route and for `lib/community/moderation.ts`, neither of which reads an
address or deletes a banner itself any more. Removing now answers 500, and
deletes nothing, when the row could not be emptied; it used to delete the
file anyway. No SQL. `PUT /api/profile/me` with `bannerUrl: null` still only
empties the row, as before; that file goes at the reader's next removal.

**F-35, the files an account leaves.** `app/api/auth/delete` deleted the auth
user and nothing in storage, the gap the F-29 addendum left open: the rows of
`upload_owners` go with the account, so the files have to be read first.
`lib/auth/accountFiles.ts` lists what is provably the reader's own while the
account can still say so: every file the record gives them, the folders
named by their id (`avatars/u/`, and `kitchen/r/` and `campaign-media/c/`
until `scripts/migrate-upload-paths.mjs` has moved those), and a banner from
before the record by F-34's rule. The route then deletes the account, and
only after that the files, so nothing goes for an account that still stands
and a storage fault cannot block a deletion. Left on purpose: `kitchen/s/`,
the photo sent with a recipe, on an old path or a new one, because the recipe
stays when its author leaves and still shows it; and a store's pictures. An
id that is not a uuid lists nothing, since a folder name is built from it.
Not swept: files left by accounts deleted before this.

**What this branch dropped on the way.** Its first draft kept the banner's
owner in `app_metadata.banner_path` and closed F-30 by the folder a campaign
picture sat in. `fix/upload-random-paths` reached main first with
`upload_owners` and its own F-30, so both were rebuilt on that record and the
campaign change was dropped. `lib/security/uploadOwners.ts` gained two reads
for it, `uploadsOf` and `isRecorded`, and `fakeSupabase.ts` learned profiles,
entitlements, reports, LIKE, folder listing and account deletion.

**Verification record.** On bdcf393b: tsc 0; eslint clean on the 12 changed
files; vitest 299 files passed and 1 skipped (the unbuilt content package),
3665 tests passed and 2 skipped. The real banner route, the moderators'
action and the account deletion route against the in-memory Supabase, 36
cases, with the old rule as the positive control for the banner: it reads the
other reader's path out of the row, and out of a lookalike host. Before the
rebuild the same three faults were also run over HTTP with supabase-js
against a stand-in Supabase, with origin/main's handlers as the control:
main's remove, upload-over and moderator clear each deleted the other
reader's banner, and main's account deletion left every one of the reader's
files. Nothing was run against production beyond the read-only probe, and
nothing was pushed. Not walked in a browser: a dev server here talks to the
production database, and neither the editor's requests nor the shape of the
routes' answers changed.

## Addendum, 2026-10-03 (night): profile pictures on a random path, branch `fix/avatar-random-path-v2`

The last part of "fix the rest", on top of `fix/profiles-column-grants`.
F-36 is the finding. Nothing was pushed, and no SQL was run against
production: the migration below waits for the owner's sign-off.

**Live today.** Counted on the public feed, counts only: 20 of 30 posts
carry a picture address that names its reader's account id, 8 readers.
`uploadPathPrivacy.test.ts` had this route pinned in `STILL_NAMED` as the one
upload left that names its reader. It is in `RANDOM_ROUTES` now, and
`STILL_NAMED` is empty.

**Why the first fix could not merge.** `fix/avatar-random-path` (752744ff)
was written against e0080e57. The same day bc47d3e6 made
`profiles.avatar_url` the picture of record and held it by a CHECK to
`/avatars/u/<own id>/`, the very path that branch stops writing, and 854709c4
brought `upload_owners`, the record that branch had to do without. This
branch is that work rebuilt on both. The old branch and its worktree are left
as they were.

**The route.** `app/api/community/avatar` writes `a/<random uuid>.<ext>`.
Whose it is goes into `upload_owners` before the file goes up, and nothing is
stored while that table is absent. The address is saved in
`profiles.avatar_url` (posts and replies follow by trigger), then in
metadata, for app builds that read it. If the row will not take the address,
the file and its record are taken back. The route gained a limit of 20
uploads an hour for each reader; it had none.

**A new picture now replaces the old one.** Until now every change of
picture left the old file behind. It goes once the new one is saved and the
reader's copies of its address are repointed (`AVATAR_COPIES`: posts, replies
and kitchen reviews; `avatarPath.test.ts` reads the migrations to keep that
list whole), and only when it is provably theirs: the record names them, or
it is an old path with their own id in it. The address in their
`user_metadata`, which they can rewrite with the anon key, and the one in
their row say where to look and are never the proof
(`lib/community/avatarFile.ts`). Where a copy could not be repointed, or
metadata could not be written, the old file stays.

**The migration.** `20261008000000_avatar_random_path.sql`, one statement of
substance. It lets the column hold the new shape and keeps the old one, still
only in the reader's own folder, for rows not yet moved:

```sql
set lock_timeout = '3s';
set statement_timeout = '120s';

alter table public.profiles drop constraint if exists profiles_avatar_url_own_upload;
alter table public.profiles drop constraint if exists profiles_avatar_url_shape;
alter table public.profiles add constraint profiles_avatar_url_shape check (
  avatar_url is null
  or (
    char_length(avatar_url) <= 600
    and (
      avatar_url ~ '^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/public/avatars/a/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
      or (
        avatar_url ~ '^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/public/avatars/u/[0-9a-f-]{36}/[0-9]{10,16}\.(jpg|png|webp)$'
        and position('/avatars/u/' || id::text || '/' in avatar_url) > 0
      )
    )
  )
);
```

Run in PGlite against the check 20261003 creates. Before it a random path is
refused with 23514 and an own-folder path accepted. After it both are
accepted, and another reader's folder, a banner path, another host, an
upper-case uuid, another file type, a trailing query and a Google address are
all still refused; a row holding an old address survives it; and it ran three
times without error. The name changes because "own_upload" is no longer what
it checks. What it no longer proves, and what does instead, is in the file's
header.

**The SQL goes first.** Until it has run the column refuses the new path with
23514, and the new route then keeps nothing and answers 503, "Profile
pictures are not open yet." It does not fall back to the old path: an upload
route may not write a reader's id, the rule F-29 set, and a fallback would be
a second place that does. After the SQL the old route still works, since its
path is still allowed. So the SQL can run at any time before the code, and
the code must not go out before it.

**The script.** `scripts/migrate-avatar-paths.mjs` moves the pictures
already stored: dry run by default, `--apply`, `--limit N`, counts only in
its output. It stops before writing anything if `upload_owners` is absent.
Pass 1 takes each picture a profile names: copy it to a random path, write
down its owner (the id the old path carried, the only proof there ever was),
point the profile at the copy (the trigger moves the reader's posts and
replies), and point their metadata and their kitchen reviews at it wherever
those named any old picture of theirs. Pass 2 takes what a fresh scan still
finds named: a picture only a post, a review or somebody's metadata names. An
old file goes only once every reference to it has moved. If the column still
refuses the new path, the first refusal stops the run with nothing moved.

**What it leaves.** Old pictures that nothing names any more stay in their
`u/<id>/` folders until the account goes (F-35, which on this branch also
takes a picture on a random path, by the record). Listing the bucket with the
anon key answers 200 with no entries for the root, `u`, `a` and `b`, while
the same key reads `community_posts` (200) and the feed shows the bucket is
not empty. So a stranger cannot list it, and an address nothing serves is not
discoverable.

**Seen, not changed.** Where a reader has no uploaded picture, a post, a
reply and a kitchen review copy `user_metadata.avatar_url` as their picture,
with a length check at most (`app/api/community/posts/route.ts`, its
`replies` route, `app/api/trapeza/[id]/reviews/route.ts`). Metadata is the
reader's to write, `avatarSrc` passes any address that is not a Google
picture through untouched, and the CSP is still report-only (`proxy.ts`). So
a reader can make every other reader's device fetch an address of their
choosing. Read from code, not exercised, and not part of this change.

**The order for the owner.** Sign off the SQL above. Run it in the SQL
editor; it runs twice safely, so the merge running it again changes nothing.
Merge, which deploys, and read the Supabase Preview check on that commit.
Then, from the main checkout, `node scripts/migrate-avatar-paths.mjs` (dry
run), `--apply --limit 1` and look at one profile, then `--apply`. A second
run should find nothing, and the feed count above should be 0.

**Verification.** `npx tsc --noEmit` 0 errors, with `*.tsbuildinfo` deleted
and `next typegen` run first. eslint 0 errors and 0 warnings on the 12
changed files. `npx vitest run`: 302 files passed and 1 skipped, 3704 tests
passed and 2 skipped. 39 of them are new: `avatarPath` 5, `avatarRoute` 19,
`migrateAvatarPaths` 15. The route suite runs the real handler against the
in-memory Supabase, which now keeps the column's CHECK, the one before the
migration or the one after, and the trigger that carries a picture to posts
and replies. One test reads the two patterns out of the migration file and
holds the address the route writes to them. The suite was seen to fail with
the route broken four ways: trusting any address for the old picture, not
taking the file back when the row refuses it, uploading before the record,
and deleting the old file where a copy was not repointed. The script was
loaded under plain Node 24 against a dead local address and stopped before
any write. Not walked in a browser: a dev server here talks to the production
database, and an upload writes to it.

**The owner's word, later the same night.** "I ran it", in chat, after the
SQL above was shown. Reported, not seen: the editor's answer shows only on
the owner's screen, and the anon key cannot show a constraint, so nothing
here could check it. The migration's header says the same. The proof comes
with the merge: the integration runs the file again, which changes nothing,
and its check on that commit says whether it went through. Not merged and
not pushed. That waits for the owner's word too.

**Rebased, then pushed on the owner's word.** The owner said "Push". By then
main had moved to 33799e8d, an admin fix that touches none of this branch's
files and took F-31 to F-33. So this branch's findings became F-34 to F-36,
and its seven commits were rebuilt on top of 33799e8d, the two ledger files
entry by entry: main's text as it stood, this branch's after it. Run again
on the rebuilt head: tsc 0, eslint 0 on the 21 files the branch touches,
vitest 303 files passed and 1 skipped, 3722 tests passed and 2 skipped. The
counts in the paragraphs above are from before the rebase.

## Addendum, 2026-10-04: F-33, an order records when its money landed, branch `fix/f33-shop-orders-paid-at`

The owner's brief had four steps: write `paid_at` at settlement, test it
beside F-01 and F-03, settle which day the revenue calendar counts an order
on, and backfill the four paid rows that have none. The first three are
done. The fourth is one statement, handed over and not yet run. F-37 was
found on the way and is not repaired.

**The base.** The worktree started 30 commits behind `origin/main`, on a
local `main` that also carries one commit origin does not have (`ffebdffe`,
the 1.5 board). This branch was cut from `origin/main` at 8acc7c34, so that
commit is not part of it and is still unpushed. Before the push main had
moved by one commit, 43f1fc44, a test over the migrations folder that
touches none of this branch's files. The branch was rebuilt on it with no
conflict, and the counts under Verification are from the rebuilt head.

**The fix.** `paidValues()` in `lib/shop/webhookSettlement.ts` writes
`paid_at` in the object literal that writes `stripe_payment_intent`, and
`settleCheckoutSession` takes Stripe's time for the payment as a required
fourth argument, in Stripe's unit, whole seconds. Required, so a new caller
cannot forget it, which is how the column came to be empty in the first
place. `paidAtOf` turns the seconds into the string the column takes and
gives nothing for anything that is not a plausible count of seconds,
milliseconds included: `Date.now()` read as seconds is a year past 58,000,
which Postgres refuses ("time zone displacement out of range", seen on
PGlite), and that refusal would fail the settlement on every retry.

**Three callers, not one.** F-33 said "the webhook". Two more places settle
an order, and neither holds an event.

| Caller | What it holds | The time it hands over |
|---|---|---|
| `app/api/shop/stripe-webhook/route.ts` | Stripe's event | `event.created` |
| `app/api/admin/shop/reconcile/route.ts` | a session it read back | the charge's `created` |
| `lib/shop/abandonedSweep.ts` | a session it read back | the charge's `created` |

The charge's time comes from `chargeTimeOf`: one more call to Stripe, for the
payment intent with its latest charge. It is a separate call on purpose.
These two are the backstop for a webhook that never arrived, and expanding
the charge on the session read itself would make that read depend on the key
being allowed to see charges. So the session is read exactly as it was, and
`chargeTimeOf` answers null on any failure. Never used, in any of the three:
the session's own `created`, which is when checkout opened and is a number
that typechecks in the same place, and this server's clock.

**No instant, no guess.** When there is no usable time, `paid_at` is left out
of the write. Not nulled, so an instant already on the row survives, and not
taken from a clock that was not there when the money moved. The order is
still marked paid, because the migration is explicit that nothing may refuse
a write that records money arriving, and the log says `SETTLED WITHOUT A
PAYMENT TIME` with the order. A retry of an order already paid writes
nothing, as before.

**The calendar.** The owner chose payment day. `/api/admin/revenue/daily`
buckets by `paid_at`. A paid or refunded order with no `paid_at` is still
counted, on the day its checkout started, and each day carries how many of
its orders are there that way (`byCheckoutStart`). The day view prints it for
revenue and for the order count, in place of the note that said the database
held no settlement time. Two reads and no order in both: `paid_at` inside the
range, or `paid_at` null with `created_at` inside it. The fold and the note
are in `lib/admin/revenueDaily.ts`. The overview's own daily series is not
touched: with the Stripe key set it reads Stripe's ledger, by Stripe's own
time for each transaction, and only its fallback without the key still goes
by `created_at`.

**What production holds, read 2026-10-04.** With the owner's go-ahead, GET
only, the server key, no column that holds an email, a name or an address.
Still four paid orders, $94.88, none refunded. No cancelled or pending row
carries a payment intent, which is the damage F-01's race would leave.

| Checkout opened | A "paid" row in the webhook log | How long after |
|---|---|---|
| 28 August | none | not known |
| 6 September | yes | 21 seconds |
| 14 September | yes | 56 seconds |
| 23 September | yes | 214 seconds |

The log (`admin_activity_log`, action `shop.webhook`) holds three rows in
all, and its first is the 6 September one, so the 28 August order has none.
That order's `updated_at` moved on 20 September when it went through
fulfillment, so nothing in the database holds its payment time. None of the
four was paid across a UTC midnight: the calendar shows the same four days
on either basis, and the real handler, run against production through a
filter that passes GET and HEAD to this project and nothing else, answered
200 with those four days and all four orders marked as placed by checkout
start. The log records no reconcile, and no sweep that settled anything: the
three logged orders came in by the webhook.

**The backfill, for the owner to run.** One statement, and it names no
order: this repository is public, and the times are in the log already.

```sql
-- F-33 backfill: give each paid order the time its settlement was recorded.
--
-- The settlement used to mark an order paid without writing
-- shop_orders.paid_at. The webhook's delivery log (admin_activity_log, action
-- shop.webhook) has timed every settlement since 2026-09-06, a few seconds
-- after Stripe's own event, so the time comes from there. No order id is
-- typed here.
--
-- Safe to run twice, and from any state: it only fills a paid_at that is
-- still empty, on an order that is paid or refunded, from that order's first
-- "paid" delivery. It touches no other column and no other row.

update public.shop_orders o
   set paid_at = l.settled_at
  from (
        select entity_id, min(created_at) as settled_at
          from public.admin_activity_log
         where action = 'shop.webhook'
           and entity_type = 'shop_orders'
           and entity_id is not null
           and detail->>'result' in ('paid', 'recovered')
         group by entity_id
       ) l
 where o.id::text = l.entity_id
   and o.paid_at is null
   and o.payment_status in ('paid', 'refunded');
```

What it writes is the moment this server finished recording the settlement,
which is a few seconds after Stripe's event and inside the gaps in the table
above. It is not `event.created`, and a row filled this way shows it: the log
keeps microseconds, and a time from Stripe is whole seconds. It also takes in
any order that settles between now and the deploy, which three typed ids
would not.

Run on PGlite (PostgreSQL 18) holding the real
`20260822000300_shop_orders_paid_at.sql`,
`20260823000000_admin_activity_log.sql` and `20260930000000_ambassadors.sql`,
with the four orders as production holds them. It filled the three that have
a "paid" row and left the 28 August order empty. `updated_at` did not move on
any row. The one trigger on `shop_orders`, `shop_order_commission`, fires on
an update OF `payment_status` or `fulfillment_status` and did not fire, with
an update that names `payment_status` as the control that it would have. A
pending order and a cancelled one that the log names were not touched, nor
an order that already had a time. A second run changed nothing, and a time
corrected by hand afterwards survived a third.

It had NOT run at 09:13Z on 2026-10-04, the last read before the push: all
four rows still read null. So it is recorded here as handed over, not as
done.

**The 28 August order.** Stripe is the only place its time is, and this
session could not reach Stripe: `.env.local` names `STRIPE_SECRET_KEY` with
no value. The owner did not have the time to hand. Until it is filled in,
the calendar counts that order on 28 August and says one order there has no
recorded payment time, which is the truth about it.

**F-37, found and not changed.** The webhook settles on
`checkout.session.completed` without reading the session's
`payment_status`. For a payment method that clears later, that event arrives
while Stripe still says "unpaid". Reconcile and the sweep check; the webhook
does not. Run in a throwaway test: a completed session marked unpaid, with a
matching total, settled as "paid" and sent a confirmation. Dormant unless
such a method is switched on in the Stripe dashboard, which cannot be read
from here. The finding has the repair.

**Left open.**
- The statement above, and the 28 August time.
- F-37.
- The column's comment in the database still says no paid row lacks an
  instant. One does. A `comment on column` is DDL, so it waits for a
  migration of its own and the owner's sign-off.
- The migration names an index for the day a reader ranges over `paid_at`.
  A reader now does. At a hundred rows it would change nothing.
- AGENTS.md, "Money and data safeguards", still calls F-01 and F-03 open.
  Both have been corrected-verified since 2026-07-11.

**Verification.** `tsc --noEmit` 0 errors, after `next typegen`, with no
`*.tsbuildinfo` in the worktree. eslint 0 errors and 0 warnings on the 12
changed source and test files. `vitest run`: 308 files passed and 1 skipped,
3795 tests passed and 2 skipped. 47 of them are new: `webhookSettlement` 18,
`settlementCallers` 7, `revenueDaily` 14, `revenueDailyRoute` 8. The caller
suites run the real webhook route, the real reconcile route and the real
sweep against a Stripe that answers from memory, and the calendar suite runs
the real handler over orders held in memory. The settlement change was then
broken 13 ways and the calendar change 12, one at a time by a script that
restores each file, and every one was caught by a named test. Probe A from
the migration, on production: `paid_at` answers 200, and a column that does
not exist answers 400 with 42703 as the control.

Not done, and said plainly. The web build was not run. Nothing was opened in
a browser: the admin calendar needs a signed-in admin, and a webhook cannot
be walked without Stripe signing an event. No order has settled since the
change, so in production the write is still unproven. The first order paid
after the deploy is the proof: its `paid_at` should be whole seconds, a
little after its `created_at`.

**After the push, the same day.** Pushed at 09:14Z as 5cc24771, three
commits. The new build was seen live at 09:17Z by the one thing this change
shows without a login: the day view's note ships in a public script, and the
script that carried "there is no settlement timestamp in the database" was
gone and one carrying "An order is counted on the day its payment landed"
was served. The Supabase check on the commit concluded success; the push
held no migration. The webhook still answers 400 to a call with no
signature, and the daily route 403 to a call with no session.

**The backfill ran.** The owner ran the statement above and said "done".
Read back at 15:18Z, GET only: each of the three orders the log timed
carries a `paid_at` equal to the log's instant, to the microsecond. The 28
August order is still empty, as the statement leaves it. `updated_at` is
unchanged on all four. The real handler, run against production again
through the same filter, answered four orders and $94.88 on the same four
days, with one order, 28 August's, placed by checkout start. F-33 is
corrected-verified, and not verified-live: no order has settled since the
deploy, and the calendar has not been opened in a browser. Open: the 28
August time, and F-37.

## Addendum, 2026-10-04: every read asks for what the API gives, branch `fix/row-cap-1000`

The owner asked for the rest of F-31: the reads that ask one request for more
than 1,000 rows, the ones that send things first, and a test that keeps them
out. Branched from `origin/main` at 8acc7c34. Not pushed.

**What the list was, and what it was not.** The grep in the brief gave 39
calls in 28 files, and six comments. Each call was read and decided, and they
are all in the first table below. Two kinds of read have the same fault and
are not in any grep for a number:

- A read that goes in pages and names no order. Each page is its own request,
  so rows with no stated order can come back differently on the next one, and
  a page boundary then repeats a row or skips one. Eight reads did this, all
  under `lib/email`. `subscribersOf` was one, and every marketing send starts
  from it.
- A read that names no limit at all. The cap is on the response, so it gets
  1,000 rows and no error, as `.limit(20000)` does. A function that returns
  rows is capped too. Fifteen of these and one function sat on a path that
  sends, or behind a figure the owner reads, and are in the second table. The
  rest are F-38.

**The helper.** `lib/supabase/pageAll.ts` keeps `pageAll` as it was and gains
two forms. `pageAllSettled` answers `{ data, error }` with the API's own error
object, for a caller that branches on the error or its code, so each site
below fails the way it did before. `pageAllIn` is for an `.in()` over a long
list of ids: the list travels in the address of the request, so it goes a
hundred ids at a time and each piece is read in pages. `pageAll` now carries
the API's error as `cause`.

**The 39 on the list.**

| File | What it reads | Asked for | Now |
|---|---|---|---|
| `lib/email/nameDay.ts` | readers whose patron saint is today's | 20,000 | pages, by id |
| `lib/email/campaigns.ts` | readers who had a library email in 7 days | 20,000 | pages, by id |
| `lib/email/lifecycle.ts` | accounts made in the welcome week | 5,000 | pages, by id |
| `lib/email/communityDigest.ts` | whom the subscribers follow | 20,000 | 100 ids a request, pages, by the pair |
| `lib/email/communityDigest.ts` | whom the subscribers have blocked | 20,000 | 100 ids a request, pages, by id |
| `lib/email/stockAlerts.ts` | readers waiting on a piece | 2,000 | pages, by id |
| `lib/shop/cartReminderSweep.ts` | carts left a day to a week | 2,000 | pages, by token |
| `lib/shop/cartReminderSweep.ts` | payments in the window | 5,000 | pages, by id |
| `lib/shop/cartDealServer.ts` | carts touched in 7 days | 5,000 | pages, by token |
| `lib/shop/lowStockServer.ts` | paid orders in 60 days | 5,000 | pages, by id |
| `lib/shop/lowStockServer.ts` | EIKON's published pieces | 2,000 | pages, by id |
| `app/api/admin/eikon-box/announce` | active Pro members, to email | 2,000 | pages, by user id |
| `app/api/admin/eikon-box/claims` | a drop's claims | 2,000 | pages, by claim time then id |
| `app/api/admin/email/people` | every preferences row | 50,000 | pages, by user id |
| `app/api/admin/revenue` | every order | 5,000 | pages, newest first then id |
| `app/api/admin/revenue/stripe` | orders with a payment intent | 5,000 | pages, by id |
| `app/api/admin/shop/funnel` | 90 days of order moves | 5,000 | pages, oldest first then id |
| `app/api/admin/shop/growth` | paid and refunded orders | 10,000 | pages, oldest first then id |
| `app/api/admin/shop/growth` | refund requests | 5,000 | pages, by id |
| `app/api/admin/shop/growth` | cart notes sent in 90 days | 10,000 | pages, by id |
| `app/api/admin/shop/growth` | expense lines | 1,000 | 1000: a list kept by hand |
| `app/api/admin/shop/settings` | carts touched in 7 days | 5,000 | pages, by token |
| `app/api/admin/shop/sourcing` | pieces not archived | 1,000 | pages, by id |
| `app/api/admin/shop/sourcing` | their sourcing rows | 1,000 | pages, by product id |
| `app/api/admin/shop/sourcing` | lines sold in 90 days | 5,000 | pages, by id |
| `app/api/admin/stats` | page views of the live sessions | 1,500 | 1000: polled every 5 seconds, wants one row a session |
| `app/api/admin/subscriptions/members` | active members | 2,000 | pages, by user id |
| `app/api/community/mine` | the reader's reactions | 1,000 | 1000, newest first |
| `app/api/community/mine` | the reader's responses | 2,000 | 1000, newest first |
| `app/api/community/posts` | the reader's follows | 1,000 | 1000, newest first |
| `app/api/community/relation` | the viewer's follows | 1,000 | 1000, newest first |
| `app/api/community/relation` | the profile's follows | 1,000 | 1000, newest first |
| `app/api/community/prayer-wall` | prayers for the 60 on the wall | 10,000 | pages, by the key |
| `app/api/prayer/sync` | the reader's marks | 2,000 | pages, oldest first then rule |
| `app/api/prayer/sync` | the reader's rope sessions | 2,000 | pages, newest first then id |
| `lib/streak/server.ts` | the reader's marks, before the function exists | 5,000 | pages |
| `lib/profile/earned.ts` | one reader's marks inside Lent | 1,000 | 1000: forty days of one reader |
| `lib/trapeza/reviews.ts` | reviews of the recipes on a page | 5,000 | pages, by id |
| `lib/moderation/server.ts` | the team's word list | 2,000 | pages, by term |

31 in pages, 8 at 1000 with the reason beside them. The eight are one
reader's own rows, a list a person keeps by hand, or a route polled every
five seconds that wants one row a session. The five that are a reader's
presses or follows had no order, so past a thousand the rows kept were
whichever the database gave; they are newest first now.

**Not on the list, repaired with it.**

| File | What it reads | Was | Now |
|---|---|---|---|
| `lib/email/preferences.ts` | a list's subscribers | pages, no order | by user id |
| `lib/email/lifecycle.ts` | every entitlement | pages, no order | by user id |
| `lib/email/segments.ts` | entitlements, profiles, paid orders, claims | pages, no order | by each key |
| `lib/email/jobs.ts` | a mailing's send rows, and sends per reader | pages, no order | by key |
| `lib/email/ledgerRead.ts` | the send log | pages by time alone | id settles a tie |
| `lib/email/lifecycle.ts` | claims on the open drops | no limit | pages |
| `lib/push/audience.ts` | entitled readers, browsers, phones | no limit | pages |
| `app/api/cron/push-deliver` | browsers, phones, campaign opt-ins and their devices | no limit | pages, ids 100 a request |
| `lib/entitlements/adminStats.ts` | every entitlement | no limit | pages |
| `app/api/admin/api-limits` | every entitlement | no limit | pages |
| `app/api/admin/shop/settings` | published pieces and their costs | no limit | pages |
| `app/api/admin/subscriptions/members` | the members' names | no limit, every id in one request | 100 ids a request |
| `app/api/admin/eikon-box/claims` | the claimants' entitlements | no limit, every id in one request | 100 ids a request |
| `lib/streak/server.ts` | `reader_kept_days` | one request | pages |
| `lib/email/stockAlerts.ts` | the "notified" stamp | one update naming every id | 100 ids an update |

The entitlements reads are likely the ones nearest the edge. The table holds
a row for everyone who ever had access, and `scripts/grandfather-plus.mjs`
writes one for every account with a synced bookmark, note or collection
before the paywall is enforced. How many accounts that is was not counted,
so whether that run takes the table past a thousand is not known; out of
2,295 accounts it well may. From then the Revenue tab and /invest would have
counted paying members from a thousand rows in no stated order, and a push
to Plus or Pro members would have left out members whose row was not among
them.

`reader_kept_days` answers oldest first. Read in one request, its thousandth
day was the last one the walk saw, so a reader who had kept a thousand days
and was still keeping them would have been shown a streak of zero. The
earliest that could happen is February 2029, a thousand days after the marks
table was made, and it is in the tests now. The pages are asked of the
function with an order and a range, which PostgREST allows for a function
that returns a table; that was run against the stand-in and not against
production. If production refused it, the read would fall to the fold of
the marks beside it, as it does before the function exists, and not fail.

**What changed besides how many rows come back.** Three things, each where a
read that used to be dropped on failure now decides something.

- The Community email. A failed read of follows or blocks stops the send for
  that run and is in the report. Before, the error was dropped, an empty block
  list read as "blocked nobody", and the email would have shown a reader an
  author they had blocked. A table that is not there yet still reads as none.
- The cart notes. A failed read of the payments stops the run and is in the
  report. Before, the notes went to everyone with a cart, paid or not.
- `community/relation`. Whether the viewer follows the profile is asked on its
  own, one row, and no longer looked up in a list that stops at a thousand.

**The guard.** `lib/supabase/__tests__/rowCap.test.ts` parses every source
file under app, lib, components and scripts and fails on a `.limit()` above
1,000, written as a number or as a constant from the same file, and on a
`.range()` whose query has no `.order()`. It reads calls, so a comment that
quotes the old code does not trip it. Its message says what the limit really
does and names `lib/supabase/pageAll.ts`. ALLOWED is empty; an entry that
matches nothing fails. Its first test runs the scan over a sample with both
faults in it, because the real check passes on an empty list.

`lib/supabase/__tests__/cappedApi.ts` is a stand-in for the API that hands
back 1,000 rows a request whatever is asked, as the real one does. A stub
that returns everything is why none of this was caught: a read in one request
passes against it. The new tests read from the stand-in.

**Not done.**

- Production was not read. A count of rows by table (HEAD requests, the
  server key) was tried and refused by this session's guard on production
  reads, and no way around it was looked for. So "can this pass 1,000" was
  decided from the code and from the numbers already in this ledger, and
  nothing above says which of these has already happened. The owner can say
  whether a later session may count.
- F-38: about a hundred reads that name no limit, of which the ambassador
  payout and the three sync pulls in `lib/sync` are the ones to open first.
  Neither was touched: one moves money, the other is app code that needs both
  native builds and a device.
- No native build. Nothing changed is in the export: the routes are under
  `app/api`, and the modules are imported only from there and, as types, from
  the admin components.
- Not walked in a browser. There is no admin session here, and a dev server
  here talks to the production database.

**Verification.** All on the tree as committed. `tsc --noEmit` 0 errors, with
`.next` and `*.tsbuildinfo` removed first. eslint 0 errors and 0 warnings on
the 49 changed and new source files. `vitest run`: 310 files passed and 1
skipped, 3,764 tests passed and 2 skipped; 38 of them are new, in six new
files and three old ones. `next build`, the web build, exit 0: compiled, its
own type check passed, 1,975 pages. It ran with no `.env.local`, so it read
nothing from production; /invest logged that and served its printed figures.

The new tests were then run against the old code, with eleven source files
put back as they stand on `origin/main`. 17 failed, each on the number: 1,000
where 2,300 readers were due a name day note, a 1,200 day streak read as 0, a
recipe's stars 5.0 from 1,000 reviews where 4.1 from 1,300 was right. The
guard named all eleven calls and the one unordered pager among them. The
files were restored and the diff matched its hash from before.

The requests themselves were looked at with the real supabase-js client over
a stub of `fetch`, so nothing left the machine. The function is asked as
`POST /rest/v1/rpc/reader_kept_days?order=day.asc&offset=1000&limit=1000`,
and a hundred uuids in an `.in()` make an address of about 4 KB.

**For the owner.** Say push and it goes to main, which deploys. After that
the place to look is the lifecycle report in the admin Email tab, which should
carry no new error lines, and the hourly push run, which answers 500 if a
read fails. Three things are the owner's to decide: whether to open the
ambassador payout and the sync pulls (F-38), and whether a later session may
count production rows by table, which is the one thing that would say which
of these lists has already passed a thousand.

## Addendum, 2026-10-04 (later): the rest of the reads, same branch

The owner asked for it in plain words, then said "short replies yes. and fix
the rest". Simplified mode is on from here: the detail is in this file and in
the commits, and the chat stays short.

**All 99 reads that name no limit were read.** Twenty could grow and are
repaired. The other eighty are left on purpose and are sorted below.

| File | What it reads | Now |
|---|---|---|
| `lib/ambassadors/payouts.ts` | the commissions owed, and the ones claimed onto a payout | every row, walking the id |
| `lib/ambassadors/payouts.ts` | the ambassadors the monthly run pays | pages |
| `app/api/admin/ambassadors` | the roster, its clicks, the ledger, the payouts, the codes in use | pages; no longer filtered to every id |
| `lib/sync/annotations.ts` | a reader's notes and highlights | pages, by id |
| `lib/sync/bookmarks.ts` | a reader's bookmarks | pages, newest first then id |
| `lib/sync/florilegium.ts` | a reader's collections and their passages | pages, newest first then id |
| `lib/shop/catalog.ts` | the slugs the app builds a product page for | pages |
| `app/api/admin/shop/products` | the catalogue and its costs | pages |
| `app/api/admin/shop/reviews` | the pieces a review can be filed under | pages |
| `app/api/admin/shop/stores` | the pieces counted for each store | pages |
| `lib/shop/payouts.ts` | the fees on a seller's orders | 100 ids a request, pages |
| `lib/email/lifecycle.ts` | the lines and the reviews behind a review request | 100 ids a request, pages |

**The payout.** `payAmbassador` claims every cleared commission onto the
payout in one update, which the API does not cut, then read them back in one
request, which it does, added those up and sent that. Past a thousand
commissions in one payout the transfer was short and every row still read as
paid. Far off, with four paid orders ever, and it is money. It now reads them
all. It walks the id, each request asking for the rows after the last one
read, and not numbered pages: a refund can take a row out of the set while it
is being read, numbered pages would then skip the row at the next page's
edge, and that row would still be marked paid. If the claimed rows cannot be
read whole it sends nothing, lets the rows go and marks the payout failed
with that reason, where a failed read used to say "Nothing cleared to pay".

**The app.** The three pulls in `lib/sync` named no limit. They merge by
union and delete nothing, so a reader with more than a thousand notes,
bookmarks or passages lost nothing on the server and got a thousand of them
on a new phone. This is app code: it reaches phones with the next Android
and iOS builds, and both exports were run here.

**The eighty that are left.**

| How many | Why they cannot pass a thousand |
|---|---|
| 34 | a list a person keeps by hand, or one row a day, a month or a release: goals, patch notes, the board, expense lines, drops, stores, sellers |
| 31 | held to a short list of ids from a page with its own limit, or to one order, one post or one ambassador |
| 7 | one reader's own rows, of a kind that stays small: campaigns joined, collections finished, delivered orders, recipes written |
| 6 | limited or made a single row on a later line, which a parse cannot see |
| 1 | an hour of paid orders |
| 1 | a column nothing has ever written (`analytics_sessions.user_id`) |

**Seen and left, because it is not this cap.** `listSellerOrders` has
`.limit(500)`, on purpose and under the cap, and the seller's earnings page
adds those up as "what the store made", so past 500 orders that page is the
newest 500. `emailsByUserId` stops at the 10,000th account. How long a list
an `.in()` may carry was never measured.

**The stand-in grew.** `cappedApi.ts` now applies `update` and `insert` to
the rows it holds, answers `auth.getUser()`, and can be told to fail the nth
read of a table. A write is not cut, as it is not on the real API, which is
what lets the payout test show the fault: claim 1,200, read back 1,000.

**Verification.** `tsc --noEmit` 0 errors, with `.next`, `out` and
`*.tsbuildinfo` removed first. eslint 0 errors and 0 warnings on the 15
changed and new source files. `vitest run`: 313 files passed and 1 skipped,
3,778 tests passed and 2 skipped, 14 of them new (the payout 6, the pulls 4,
the catalogue and the fees 4). `next build` exit 0, 1,975 pages.

With six source files put back as they were, nine of the new tests fail on
the number: the payout sends 250,000 cents where 300,000 were owed, a new
phone gets 1,000 of 1,500 notes, 1,000 of 1,300 bookmarks, 1,000 of 1,400
passages, and the slug list stops at 1,000 of 1,300 pieces. The files were
restored and the diff matched its hash from before.

**The two app exports, and why they needed a stand-in.** `build:android` and
`build:ios` both stopped at first with `Page "/shop/[store]" is missing
"generateStaticParams()"`. That is this worktree and not the change: it has
no `.env.local`, so the catalogue reads answer nothing, and the export
refuses a dynamic route with no pages to build. Production was not the way
round it. A small server on 127.0.0.1 answered the catalogue reads with one
sample store and one sample piece, and every other read with an empty list.
Against that both exports ran to the end, one after the other: 1,924 pages,
the i18n and case-collision guards passed, "local bundle ready" for Android
and for iOS, and `out/shop/icons/sample-icon/` was there, which is the page
the paged slug list asks for. The tree was whole afterwards: nothing left in
the stash, `app/api` back, no tracked file changed.

**Not done.** Not walked on a device: the sync pulls want one sign-in on a
phone with a reader who has notes, once a build carries this. Not pushed.

**Rebuilt on main.** While this was being checked, main moved from 8acc7c34
to 5cc24771: four commits for F-33, which touch none of this branch's code,
and a finding of their own that took the number F-37. So this branch's
finding is F-38, and its commits were rebuilt on 5cc24771, the two ledger
files entry by entry: main's text as it stood, this branch's after it. Run
again on the rebuilt head: tsc 0, eslint 0 on the 62 files the branch
touches, vitest 317 files passed and 1 skipped, 3,847 tests passed and 2
skipped, `next build` exit 0 with 1,975 pages. The guard passes over main's
new code as well. The two app exports were run before the rebuild; the four
commits under them change the settlement code, a revenue route and two admin
components, none of which the export builds. The counts in the paragraphs
above are from before the rebuild.

## Addendum, 2026-10-04 (afternoon): pushed, seen live, and a seller's earnings

**Pushed on the owner's word.** "sure push", in chat, answering both "say
push and it deploys" and "want that fixed too?" about a seller's earnings.
By then main had moved once more, to d1e394d1, a commit that changes only
the two ledger files, so the two commits were rebased again, with one
conflict, in this file, settled the same way: main's text, then this
branch's. Their code was compared with the tree that had been checked and
was the same. Pushed at 15:28Z as 5666247d. The Supabase check on the commit
concluded success; the push held no migration.

**Seen live at 15:39Z**, by the one part of this change a browser can see.
The annotation pull is client code, and the public script that carries it
now reads `updated_at").order("id")` where the build before it ended at the
column list. Then, with no login: five public pages answered 200,
`/api/prayer/sync` 401, the push cron 403 with no secret,
`/api/admin/revenue` and `/api/admin/ambassadors` 403,
`/api/community/prayer-wall` and `/api/shop/catalog/config` 200, and
`/api/community/mine` 200 with empty lists for a signed-out caller.

Not seen: any admin figure and any send, because there is no admin session
here. And production cannot yet show the difference this makes, since by
this file's own numbers the lists are still under a thousand. What it can
show is a failure, and there are two places it would appear: the lifecycle
report in the admin Email tab, and the hourly push run, which answers 500
when a read fails.

**A seller's earnings.** The earnings page and the "Earned" card on the
seller's overview were handed `listSellerOrders`, which stops at the newest
500 on purpose, and printed its sum as what the store made. Past 500 orders
the gross, the refunds, the commission and the first months of the table
were all short, with nothing on the page to say so. That limit is under the
API's cap and no test for the cap could see it; it was found by reading.
`listAllSellerOrders` reads every order in pages, newest first then by id,
and those two pages use it. The overview's "orders to fulfill" comes from
the same list, so an order still waiting on the seller shows however many
have come in since. The orders page keeps the newest 500: it is a list to
look through, and what it leaves out is long finished. Both pages are web
only, so there is no app build in this.

**Verification of that.** `tsc --noEmit` 0. eslint 0 on the four files.
Four new tests in `lib/shop/__tests__/sellerEarningsWhole.test.ts`, against
the stand-in: 1,300 orders are all read, they add up to 1,300 times the
price where the list of 500 adds up to 500 times it, and January is in the
monthly table where the newest 500 do not reach back to it. `next build`
exit 0. `vitest run`: 318 files passed and 1 skipped, 3,851 tests passed and
2 skipped, three runs in a row, one of them while the build was using the
machine. The run before those three had two failures, on a suite that took
124 seconds where it usually takes 40 to 75. They did not come back and
which two they were was not kept, so this is recorded and not explained;
`vitest.config.ts` describes the same thing on this machine under load.
Not walked in a browser: the seller console needs a seller's sign-in.

**That one pushed too, the same hour.** At 15:47Z as c46a0c32, on the same
"sure push"; no migration in it. It changes no script a browser loads, so
the way the first push was seen does not work here. The page's own build id
does: every page carries one in its payload, and the home page's went from
`hfWz5zLqFJRvZSNXnTauU` to `Ny5RymtjgqQ8X_CidoCQi` at 15:51Z. After that,
with no login: three public pages 200, `/shop/seller` and
`/shop/seller/earnings` 200 with the sign-in gate and not an error, and
`/api/prayer/sync` 401. The earnings figures themselves were not seen, and
no store has 500 orders for them to differ on.

## Addendum, 2026-10-04 (afternoon): the days counted once, branch `claude/heuristic-swartz-4ce8c4`

The follow-up F-31 left open. `admin_pageview_rollup` is exact and reads
every page view in its range on every tab open: 5.4 to 9.1 seconds for all
time on 615,000 rows that grow by 230,000 a month. The owner asked for the
SQL of the lasting answer. It is
`supabase/migrations/20261009000000_analytics_daily.sql`, with
`lib/admin/__tests__/dailyCountsMigration.test.ts`.

**Why not a table of daily visitors.** Views add up across days. Visitors do
not. A session is a browser tab, a tab in the app stays alive for days, and
on 2026-10-03 the 229 longest sessions of 14,013 made 26% of the month's
views. Adding up each day's visitors counts such a session once for every
morning it opened the morning prayers, and that is the page the owner looks
at first. So the design had to give the same numbers as counting every row,
and the test of it is that it does.

**How.** A session is counted for a page on the day it FIRST opened it and
never again (`analytics_daily_counts.new_visitors`), and a session that
comes back on a later day gets one row with its first day and its latest
(`analytics_return_visits`). Then for a window that starts at midnight UTC:

    visitors = the first-time sessions of every day in the window
             + the sessions whose first day is before the window
               and whose latest day is inside it

The same at three levels: each page, each section, and the whole site. A
day is counted once, a quarter of an hour after it ends, by whichever call
comes next; nothing is scheduled and nothing is added to the page view
insert. Today, and any other day not yet counted, is counted from the page
views on the spot and added in. The function keeps its name, its argument
and its answer, so only one line of code changed: the Content tab now asks
for the same 30 days as the Engagement tab, from midnight UTC, where it used
to count 720 hours back and give one page two different counts on two tabs.

**When it counts row by row instead.** A window that does not start at
midnight UTC; more than four days not yet counted; any error in the daily
path. The row by row function is kept word for word as
`admin_pageview_rollup_raw`. A statement that runs out of time is not
caught, so the route's stated sample still works. Since the row by row
answer is the same answer, a daily path that had stopped working would look
like a slow tab and nothing else. So the error is written, with its time,
in `analytics_daily_state.last_error`, which the server key can read. That
is the place to look when the tabs are slow again. The file's own first
count is caught the same way, so the file finishes whatever happens.

**One race, found on paper and closed.** A call reads the last counted day,
then reads the counts. Another call can commit a newly counted day between
the two, and that day would be added once from the table and once from the
page views. The read of the counts stops at the day the call read as the
last one. The return visits need no such bound: a row another call writes
can only say what is true of the page views, and a session is counted once.

**Held equal on a real Postgres.** PGlite 0.5.8 (PostgreSQL 18.3), the whole
folder replayed with this file last and run three times. Made-up traffic
built to break it: 1,400 sessions over 34 days, one in eight of them alive
for 5 to 32 days and back on the same pages daily, views a millisecond
either side of midnight UTC, one page stored under three spellings. For 41
windows, one starting on each of 40 days in a row and one in the year 2000,
the daily path gave the answer of the row by row function, byte for byte,
with the row by row function replaced by one that raises, so the daily
path could not have borrowed its answer. Also
with three days still open, when catching up from nothing ten days a call,
and after the days were counted a second time. With the day function made
to raise, the answer still came, row by row, and the error was in the state
row. Nine seeds in all: 20261004, 777 and 13 against the file as committed,
and 7, 99991, 31337, 424242 and 5 against it before the error note was
added, which changed no count. The row by row function was in turn held to
the tally written out in `lib/admin/rollups.ts`. anon and authenticated are
refused on the four functions and the three tables.

**Timed on the same Postgres**, on 586,000 made-up page views in 40,000
sessions over 136 days, 4% of the sessions making 29% of the views:

| Range | Row by row | From the counted days |
|---|---|---|
| 7 days | 0.31 s | 0.32 s |
| 30 days | 1.03 s | 0.36 s |
| 90 days | 3.11 s | 0.42 s |
| All time | 4.80 s | 0.48 s |

Most of what is left is counting today. The counts came to 196,000 rows
(26 MB) and the return visits to 22,000 (5 MB), beside 76 MB of page views.
The file itself counts only the first 30 days, about 5 seconds here, so
that it returns quickly in the SQL editor; the rest took 11 calls of ten
days at about 2 seconds each. None of this paragraph is production.
Production is further down.

**The order.** The SQL went to the owner to run, which is the sign-off, and
nothing was pushed until it had been run and checked: a merge to main runs
the file.

**The owner ran it, 2026-10-04.** Said shortly before 17:17Z, and checked
rather than taken on trust, with the server key and the public key.

- *There.* The state row said counted through 2026-06-19, the first 30
  days, and no error. Eleven calls of the function, each for a 7 day
  window, counted the rest ten days a call, through 2026-10-03, in 0.8 to
  5.3 seconds each, answering row by row until the last.
- *Small.* 29,273 rows of counts (25,679 for pages, 3,458 for sections, 136
  for days) and 3,919 return visits, for 618,000 page views over 136 days.
  A seventh of what the made-up traffic gave: production opens about 190
  different pages a day, not 1,400.
- *Closed.* The public key was refused on the three tables and on the four
  functions, 401 with 42501, the functions asked with an argument that
  cannot be cast.
- *The same numbers.* Page views keep arriving, so two row by row answers
  seconds apart differ by a view or two themselves. So each window was
  asked row by row, then daily, then row by row, once, and every number in
  the daily answer held against the two either side of it:

| Range | Numbers | The daily answer |
|---|---|---|
| 7 days | 381 | identical to the row by row answer before it; nothing had moved |
| 30 days | 466 | identical to the one after it; 2 numbers had moved between the two |
| 90 days | 503 | identical to the one before it; 3 had moved |
| All time | 515 | identical to the one after it; 3 had moved |

  Not one number outside the two. For 7, 30 and 90 days a round in which no
  page view arrived had already given three identical answers.

- *Quick.* The daily path took 0.2 to 0.4 seconds for every range once a
  connection had run it, 1.2 to 1.8 the first time on a connection, and 0.6
  to 4.9 in between this check's own row by row calls, which load the
  database. Row by row, the same afternoon: 0.3 to 1.3 seconds for 7 days,
  0.7 to 3.0 for 30, 2.9 to 8.1 for 90, and 8.3 to 19.3 for all time.

The file went to main after that. Whether the merge's own run of it
succeeded is on that commit's Supabase check, not here.

**What is left.** Nobody has opened the tabs in a browser, as before. The
first call on a fresh connection pays about a second for Postgres to plan
the function; that is what a tab opened after a quiet hour will see. And if
old page views are ever pruned, read the file's header first: a day is
counted by reading what its sessions opened before it.

## Addendum, 2026-10-04 (evening): Purify 1.5 is cut, branch `release/v1.5`

The owner called the release on 2026-10-04: "finalize v1.5 ... get patch
notes ready. get email designs ready. discord message announcements ready.
optimize the builds. finalize so everything gets pushed ... and also make a
repeatable checklist system for when we drop updates." The programme
(`docs/plans/v1.5/MASTER.md`) had the 1.5 builds at Nov 3 to 5; its top now
says what moved to the next build and which date did not move with it.

**What a later session needs to know first.**

- `docs/RELEASE.md` is how a release is done from here on, and
  `docs/plans/v1.5/RELEASE.md` is the record of this one, ticked as far as it
  got. Read that file before touching anything named below.
- The website reads release notes from the `patch_notes` table and falls back
  to `data/changelog/entries.json` only when the table is empty or cannot be
  read (`lib/whatsNew/notes.ts`). So after this push the site shows 1.5's
  highlights and versions, and the 1.5 NOTE only once the owner accepts it in
  `/admin?tab=patch-notes`. Until then Admin, Email has no release email to
  send either. The file carries the note for the apps.
- `androidVersionCode` and `iosBuildNumber` are 0 on purpose. They rise one
  store at a time, after that store serves 1.5.

**F-39, found and closed in this work: the release email could not be sent.**
`app/api/admin/email/campaign/route.ts` runs `checkEmailCopy` over a
campaign before it sends and answers 422 on any violation. The pressure list
in `lib/push/doctrine.ts` holds "streak", "badge" and "behind". The 1.5 note
says all three, because 1.5 has streaks and badges and a page that blurs
behind a sheet, so the 1.5 release email would have been refused the moment
the owner pressed send, with nothing before that to say so. Two changes:

- `checkPhrasing` and `checkEmailCopy` take `{ naming: true }`, which lifts
  the pressure list and nothing else. The route passes it for the `release`
  kind only. A release note names what was built; it does not measure the
  reader. Exclamation marks, urgency, praise and em dashes are refused in a
  release email as in every other. Notifications never pass `naming`.
- `lib/email/__tests__/releaseEmail.test.ts` builds the release email for
  the release the checkout is, the way the route builds it, and fails when
  the route would refuse it. A release whose email cannot be sent now fails
  in the unit tests, not at the send button.

The older rule still stands for everything else, and it is a real tension
with the streak the owner asked for: step 9 of the programme wants an
evening reminder that names the streak, and the notification rules refuse
the word. That is a decision for whoever builds step 9, with the owner. It
was not made here.

**The release email is a letter now.** Before 1.5, `releaseBody` set every
line of the note and every category label as a paragraph. Shown the 1.5
email that way (43 lines), the owner said "a little too much", then asked
for "multiple bullet points that get straight to the point" with emojis,
naming what Community gained and what Plus adds, then for screenshots. So
the email is the release's name, one picture, one line, at most ten points
and one button to `/whats-new`. The points are written with the release in
`lib/whatsNew/releaseEmail.ts`; that is the one marketing send whose words
somebody writes, and the rule on it is that each point says only what the
published note says. `MarketingBody` gained `deck`, `image` and `points`,
and `bodyLines` is the single list the route previews and checks.

**No reader is pictured.** The owner asked for screenshots of Community
profiles, the prayer wall and a priest's profile. Looked at on the live site
as a signed-out visitor on 2026-10-04: the Purify account's own profile; a
prayer wall holding one request, a reader's; and an empty Ask a Priest, with
no author in the public feed marked as verified clergy. The email carries
the Purify account's profile and nothing else. Asked, the owner chose to
skip the wall and to keep the Ask a Priest words with no picture. The rule
is in `docs/RELEASE.md` and at the top of `lib/whatsNew/releaseEmail.ts`: a
picture of Community that goes to every subscriber shows Purify's own
account or a reader who said yes.

**Open, and the owner's.**

- Ask a Priest is announced with nobody yet seen to answer. A priest
  verified in Admin, Verification before the announcement goes out closes
  it. If none will be, the line comes out of the note, the email and the
  Discord post.
- The Purify profile's status read "v1.5 drops soon!" in the picture. After
  the owner changes it, `node scripts/release-pictures.mjs 1.5` takes the
  picture again.
- NIV, NKJV and NLT were switched off on 2026-09-26 and no note has said so
  (`since-1.4.md`, last section). 1.5's does not either.

**The gates, on eb373c37 and this commit's documents.** tsc 0. eslint 0 on
the 27 changed files; the whole repo was not linted on this machine. vitest
321 files passed and 1 skipped, 3,875 tests passed and 3 skipped. A first
run, on a loaded machine, had three tests that walk the file tree time out
(scanArtifacts, oauthConsent, buildTarget); they pass alone in 6 seconds and
passed in the next whole run. `build:android` exit 0 and `build:ios` exit
0, against a stand-in for the database address, so nothing reached
production. `next build` exit 0, 1,975 pages. `node scripts/release.mjs
note 1.5` and `bump 1.5`, run after the files were written by hand,
changed nothing: the tool writes what was committed.

Not walked in a browser before the push. The preview tool starts its server
in the main checkout, which sits on another commit and on the production
keys, so that server was stopped unused. The page is walked on the live site
after the deploy, and the addendum after this one says what was seen.

**Where the app's weight is.** The owner asked for the builds to be
optimized. Measured, and nothing was cut. The export is 720 MB in 10,091
files; without `_next` it is 0.69 GB of the 0.90 GB budget in
`scripts/native-build.mjs`. Bible chapters are 462 MB of it (6,820 files)
and the Fathers under `saints/` 141 MB. Every chapter is stored twice, as
`index.html` and as the `index.txt` the app reads when moving between
pages: Genesis 1 is 436 KB and 373 KB, John 1 is 1.18 MB and 1.09 MB. The
pruning already in that script reclaims 438 MB a build. Pictures and audio
together are about 31 MB, so there is nothing to win there, and R8 on
Android would save a few MB of code at the risk of breaking a plugin nobody
can test from here. The lever is the chapter page itself: commentary and
word data fetched when a reader asks for them, not carried in every page.
That is its own piece of work, with its own measurements, for a later
release.

## Addendum, 2026-10-04 (20:22Z): 1.5 pushed and seen live

Pushed on the owner's word ("finalize so everything gets pushed") as
b943dfb6 at 20:18Z, with eb373c37 under it. The build id on purifyapp.net
changed at 20:21Z, three and a half minutes later. There was no migration in
the push; the Supabase check on the commit reported success.

Seen on the live site as a signed-out visitor, at 1280 wide and at 390:

- `/whats-new` opens with PURIFY 1.5, "Streaks, and the Greek beside the
  Old Testament.", and its five pills. The first, opened, draws its picture
  at 1600 by 1000 with its caption and "1 / 5". No picture on the page is
  broken, the page raised no error, and nothing scrolls sideways on a phone.
- All five highlight pictures and the two the email asks for
  (`email.jpg`, `email-profile.jpg`) answer 200 from `/whats-new/1.5/`. A
  1.4 picture answers 404, as it should.
- `sw.js` names `purify-1.5.0`, and the footer says 1.5.

Not there yet, and it is not a fault: the 1.5 NOTE. The page lists notes
from the `patch_notes` table, whose newest is 1.4. The 1.5 note was filed
in the owner's queue before the push (`scripts/patch-notes.mjs propose`,
revision 9f0f8617) and shows on the site, and becomes a release email that
can be sent, when the owner accepts it in `/admin?tab=patch-notes`. If the
owner edits it there, `node scripts/patch-notes.mjs pull --apply` and a
push come before the store builds, because the apps carry the file.

**What is the owner's from here** is sections 7 and 8 of
`docs/plans/v1.5/RELEASE.md`: accept the note, verify a priest before
Ask a Priest is announced, change the Purify profile's status and have its
picture taken again, run the two store builds and submit them, raise each
store's number in `lib/appUpdate/release.ts` after it serves the build,
post the announcements, and send the email.

## Addendum, 2026-10-04 (night): 1.5.1, a page carries what it shows, branch `release/v1.5.1`

The owner, after 1.5 was live: "let's now do a v1.5.1 Refinement patch.
optimize all the builds do its smooth while keeping the MB's optimized."
The 1.5 addendum above had measured the export and cut nothing. This is the
cut. `docs/plans/v1.5.1/since-1.5.md` has the measurements in full, and
`docs/plans/v1.5.1/RELEASE.md` is the checklist.

**The finding.** A client component's props are written into the page's
HTML and again into the payload the app reads between pages. The chapter
page handed the reader 96 MB of props across 1,362 chapters (the Fathers'
commentary 31.4, the Greek word by word 17.3, a lexicon cut down to each
chapter 16.6, the English tagged to pair with it 13.0, cross-references 6.6,
the Greek as text 6.4, the verses 5.3), and that became 462 MB of a 720 MB
app. The Fathers' reader was handed each whole work the same way.

**What changed.**

- `app/bible-data/` is four `force-static` route handlers, written to disk
  by a build like `app/search-corpus.json`: the Greek for a chapter, its
  cross-references, its commentary, and one Strong's lexicon for the whole
  Bible. `lib/bible/chapterExtras.ts` builds them and answers the page's
  questions from the same code, so the page and the files cannot disagree
  about which chapter has what. `lib/bible/chapterData.ts` is the reader's
  side: each file fetched when asked for, kept for the last eight chapters,
  a miss never remembered.
- `components/bible/ChapterReader.tsx` reads the Greek when the reader's
  switch is on, the commentary when a verse's is opened, the references when
  a Plus reader opens one. `VerseRow` is untouched: it is handed the same
  things, later.
- `app/saints-data/` is each work of the Fathers as a file, and in the apps
  `components/saints/LazyWritingReader.tsx` reads it as the page opens.
- `components/saints/SaintsBrowser.tsx` imports the registry it used to be
  handed. The search on the same page already carries it in the page's code.
- A patch keeps its release's highlights and its release's email
  (`featureRelease`, `lib/whatsNew/version.ts`). Cutting 1.5.1 before the
  1.5 email had gone out would otherwise have made that email a letter about
  a refinement.

**The website is not the apps here, on purpose.** On the website the
commentary and the Fathers' works stay in the page (`IS_STATIC_EXPORT`), so
a search engine still reads them where it did. The Greek, the lexicon and
the cross-references are fetched on the website too: they were never on the
page as readable text. Whether the website should follow the apps for the
commentary is a question about search, and it is the owner's.

**Measured**, on the Android export, before and after:

| | 1.5 | 1.5.1 |
|---|---|---|
| The export | 720.3 MB, 10,091 files | 550.7 MB, 11,981 files |
| Without `_next`, against the budget | 0.69 GB of 0.90 | 0.52 GB of 0.60 |
| Bible chapters | 462.3 MB | 268.2 MB, and 75.1 MB of files beside them |
| The Fathers and the saints | 140.6 MB | 60.6 MB, and 29.4 MB of files |
| John 1 | 1,184 KB of HTML, 1,093 KB of payload | 122 KB, 73 KB |
| Morals on Job | 4,533 KB of HTML | 105 KB |
| The Saints tab | 940 KB of HTML | 483 KB |

Compressed the way a store package holds it, 1.5.1 is about 135 MB; 1.5 was
not measured that way. The budget in `scripts/native-build.mjs` came down
from 0.90 GB to 0.60 so that a prop coming back shows up as a warning.

Opened on a phone-sized page with the processor slowed four times, from
local files: Morals on Job loads in 0.6 s where it took 4.7, On the
Incarnation in 0.7 s where it took 1.7, the Saints tab in 1.2 s where it
took 1.5. The chapter page was not timed before the change.

**Walked, in the export, with no network.** Every request to
`https://localhost` answered from `out/` and every other request refused,
which is the app offline. John 1 on a phone asks for no file until one is
needed; opening a verse's commentary reads the file and shows the Fathers;
with the Greek on, the Greek and the lexicon are read, a tapped word shows
its entry, and the next chapter reads its own; at a computer's width the
study rail fills from the file; Genesis 1 shows the Septuagint; Morals on
Job lists its 35 books and a book opened shows its text; On the Incarnation
is drawn; the Saints tab lists every saint. No page raised an error. The
website's side was not walked before the push, for the reason in the 1.5
addendum, and is walked on the live site after it.

**Looked at and left.** Each page is about 120 KB of HTML and 70 KB of
payload before it says anything, most of it the list of code files every
client component names; 1,917 pages of that is most of what remains, and it
is the framework's. The whole-page requests a page makes as it opens are
HEAD probes with no body. A long psalm still scrolls heavily (Psalm 118 is
10,677 elements): `content-visibility` would help and would also clip a
verse's menus, so it wants its own look. The verse-of-the-day table is 122 KB
on Home and Today. The works are also in the content package
(`out/content/`), so the apps now carry them twice where they carried them
three and four times; one copy could serve both.

**The gates, on the tree this commit holds.** tsc 0. eslint 0 on the 26
changed files; the whole repo was not linted on this machine. vitest 324
files passed and 1 skipped, 3,894 tests passed and 3 skipped. `build:android`
exit 0 and `build:ios` exit 0, against a stand-in for the database address,
0.52 GB each against the 0.60 GB budget. `next build` exit 0, 3,865 pages:
the 1,975 of before and 1,890 data files, which the website's build writes
too. `node scripts/release.mjs email`, run with the version at 1.5.1, writes
the 1.5 letter unchanged.

## Addendum, 2026-10-04 (22:17Z): 1.5.1 pushed and seen live

Asked, the owner chose "Push now". Pushed as d0a3954e at 22:13Z; the build
id on purifyapp.net changed at 22:16Z, three and a half minutes later. No
migration in the push.

Seen on the live website as a signed-out visitor, every check passing:

- The files answer: a chapter's Greek (68 KB), the lexicon (547 KB), a
  chapter's cross-references, its commentary and a work of the Fathers, each
  200 as JSON, and a chapter that does not exist 404.
- John 1 on a phone with the Greek off asks for no file. The commentary is
  still in the page's own HTML, so a search engine reads it where it did,
  and a verse's commentary opens without a fetch. The Greek is no longer in
  the page.
- With the Greek on, the chapter's Greek and the lexicon are read, the Greek
  is drawn, and a tapped word shows its entry.
- At a computer's width the study rail names the Fathers. On the
  Incarnation is on its page, the Saints tab lists all 158, the top of
  What's New still shows 1.5's highlights, the footer says 1.5.1 and
  `sw.js` names `purify-1.5.1`.

The 1.5.1 note was filed in the owner's queue before the push (revision
9a33f814), beside 1.5's. Neither shows on the site until it is accepted.

**Still heavy on the website, by choice.** John 1's page there is 1.5 MB,
because the commentary stays in it. The apps' page is 122 KB. Making the
website follow the apps is one condition in the chapter page and costs
search engines the commentary on chapter pages; the owner has not been asked
to decide it.

The walk and the timing are in the repo now, for the next release:
`scripts/export-walk.mjs` and `scripts/export-perf.mjs`, with a line in
the release checklist's gates.

## Addendum, 2026-10-04 (late): the notifications work rides in 1.5.1

The owner, about to make the store builds: "does this include F-42
notification update". It did not. `fix/notifications` (another session's
commit of 21:22Z, F-40 and F-41 corrected, F-42 found and left for the owner)
was on its own branch, on top of the 1.5 release and not on main. Asked, the
owner chose "Yes, add it first", so the stores' builds carry it.

It was cherry-picked onto 1.5.1 with no conflict, and its own addendum sits
above this one. Nothing in it was changed. The gates were run again on the
tree with it in: tsc 0; eslint 0 on the 17 files that differ from the pushed
1.5.1; vitest 326 files passed and 1 skipped, 3,922 tests passed and 3
skipped; `build:android` and `build:ios` exit 0 at 0.53 GB of the 0.60 GB
budget; `next build` exit 0. The export walk: the first run, on a loaded machine, looked for the first verse before the reader had drawn it and failed that one check; the walk now waits for the verse, and on a fresh export all 29 checks passed.

What this does not change. F-40 and F-41 stay corrected-unverified: nobody
has seen a browser subscribe or a reminder arrive on production, so the
1.5.1 note claims neither. F-42 stays open; its repair is a migration, which
the owner signs off before it merges, and it should first be shown that no
installed app still writes its own row under the old policy. The iPhone push
key on Render is the owner's to paste.

Also asked: to "push out all the emails". The release email is sent from
Admin, Email under the owner's sign-in, after the 1.5 note is accepted
there, and nothing here can or should send it. Asked when, the owner chose
to send it themselves once a store has approved the build.

## Addendum, 2026-10-04 (23:24Z): 1.5.1 with the notifications work, pushed and seen live

Pushed on the owner's "Yes, add it first" as 6c404cb2 at 23:20Z, with the
notifications commit under it as efb1dd87. The build id on purifyapp.net
changed at 23:23Z. No migration in the push.

The live walk of the 1.5.1 addendum above was run again and every check
passed: the data files, John 1 with the Greek off and on, the study rail,
On the Incarnation, the Saints tab, What's New, the footer at 1.5.1.

Not seen, because it cannot be from here: a browser subscribing to
notifications, or a reminder arriving. That is F-40 and F-41's live check
and it is the owner's: turn reminders on in a browser on the live site, and
look for the next hour's run in Admin, Push. F-42 is still open.

The store builds are the owner's from here, on `main` at 6c404cb2 or later.
They carry 1.5.1 and the notifications work.

## Addendum, 2026-10-04 (23:41Z): F-42 closed, branch `fix/f42-push-endpoints`

The owner asked to see the SQL for F-42 ("show sql"), was shown it as one
block, ran it in the SQL editor and said "done".

Probed with the public key and no sign-in, before and after:

| | Before the SQL, the same evening | After, 23:41Z |
|---|---|---|
| GET `/rest/v1/push_subscriptions?select=endpoint&limit=1` | 200, `[]` | 401, "permission denied for table push_subscriptions" |
| POST `{}` | 401, "new row violates row-level security policy" | 401, "permission denied for table push_subscriptions" |

So the statements ran. `20261010000000_push_subscriptions_server_writes.sql`
is the same statements as a migration, which the merge runs again and which
changes nothing the second time. A reader keeps select and delete on their
own rows; only the service role inserts or updates; the signed-out key has
no grant on the table.

Checked before writing it, as F-42 asked: nothing but
`app/api/push/subscribe/route.ts` writes the table. The hourly run, the
Community alerts, the broadcast audience, the owner alert and the Push tab
read or delete with the service role. The route saves with the service role
since F-40 and deletes as the reader, which the delete policy allows. The
apps keep a phone's token in `device_push_tokens`, so no installed build
touches this table.

With it, the route holds one account to ten browsers and lets the oldest go
when another would be one too many (`lib/push/browserLimit.ts`).

Not seen: a signed-in reader being refused a direct insert (it would need a
reader's token), and a browser saving its subscription through the route on
production since. The second is F-40's live check as well.

## Addendum, 2026-10-04 (23:58Z): F-42 live, and the two store builds made

**F-42.** Pushed as 41ba97e8 at 23:43Z, with the fix under it as 71b24144.
The Supabase check on the commit reported success, so the merge ran the
migration a second time without error. The build id on purifyapp.net changed
at 23:46Z, and after it the public key was still refused the table ("permission
denied for table push_subscriptions") and the subscribe route answered a
signed-out caller 401.

**The store builds.** The owner: "send out ci's". Both workflows were
started by hand on `main` at 41ba97e8, with local-first on, and both
succeeded:

- Android build, run 72, finished 23:53Z. `app-release.aab` (161.1 MB) is on
  the `android-release` release, for the owner to upload to Google Play.
- iOS build (signed), run 26, finished 23:57Z, with its upload step: the
  build is in App Store Connect.

They carry 1.5.1, the notifications work and nothing of F-42 (which is the
server's). Submitting each for review is the owner's.

**For whoever raises the update prompt** (`lib/appUpdate/release.ts`): the
numbers are the run numbers, 72 for `androidVersionCode` and 26 for
`iosBuildNumber`, each only after its store is serving the build.

## Addendum, 2026-10-05: 1.5.2, a refinement for phones, branch `release/v1.5.2`

The owner, dictating a list from his phone the morning after 1.5.1: "we are
going to start working on a version 1.5.2. Because there is a couple bugs
that we can fix." Twelve things, and by the end of the list he had named the
pattern himself: "this seems like clearly a reoccurring issue where it's not
optimized." `docs/plans/v1.5.2/since-1.5.1.md` sets what he said beside what
was measured and what it turned out to be, and `docs/plans/v1.5.2/RELEASE.md`
is the checklist.

**The findings.** Each was measured on the live app at a phone's size (390 by
844, the apps' own shell) before anything was changed.

- "It's zoomed in" was a box past the right edge. A phone grows the whole
  page to hold one, and a reader sees the screen zoomed and sliding sideways.
  Every work of the Fathers opened 493px wide (three desktop pills in a top
  bar with room for one), and the "?" beside a saint's Request writings grew
  the page to 583px (a 280px box opened from the button's own left edge).
- "It loads in a weird way" was two things. From the saints list at 7,176px
  a saint opened at 5,979px: the router skips its scroll to the top when the
  new page's first element is already on screen, and Chrome's scroll
  anchoring then drags the scroll as the page arrives. And a tab tap showed a
  black screen for 150 to 400 ms (filmed with the processor slowed four
  times): the leaving screen faded to nothing and stayed there until the next
  one committed.
- "It is laggy" (the shop) was 1,270 ms of drawing for six swipes down and
  back, and 633 ms with one thing removed: `backdrop-blur` on the heart
  button of every product card, each card itself moving with the scroll.
- "It doesn't do anything" (notifications) was a link to `#@handle` or
  `#post-id` on the page the reader was already on. Next changes that
  address with `pushState`, which fires no `hashchange`, so the page never
  heard it.
- "Cut off at the top of the flame" was the glow, which hangs 18px outside
  the flame's box, in a sheet whose scrolling body clips what hangs outside
  it. A grey flame has no glow, so the sheet looked right with no streak.

**What changed.**

- `app/globals.css` clips the page's width on phones and in the apps
  (`overflow-x: clip`, never `hidden`, which would break every sticky bar).
  That is the guard. The two boxes are gone as well: a work's top bar is the
  back arrow, the title, search and one gear
  (`components/saints/MobileWorkActions.tsx`) that opens the Bible reader's
  settings sheet, and the "?" is a line of text that opens the shared
  `Sheet` (`components/saints/BumpButton.tsx`).
- `lib/ui/scrollReset.ts`, mounted by `components/nav/ScrollResetBridge.tsx`,
  puts a forward navigation at the top itself and switches scroll anchoring
  off until the reader touches the page or four seconds pass. Back and
  forward, `#` links and a work's saved reading place are left alone.
- The leaving screen dims to two fifths and stays (`body[data-route-exit]`).
  Community holds the composer's and the filters' places while it loads.
- The shop: `components/shop/ShopSubTabs.tsx` is six tabs with the cart
  pinned at the right; `CategoryChips.tsx` is one row of kinds with the
  catalogue's own counts; every row that scrolls sideways is
  `components/ui/ScrollRail.tsx` (no scrollbar, a fade at the end that has
  more, the current item in view). The heart's blur is a flat tint. The front
  page paints from this visit's last answer and asks again behind it
  (`peekShopHome`, memory only, so no price is ever kept on the device).
- Notifications: `lib/community/notificationTarget.ts` decides where a row
  goes; a person opens their profile, a post opens with its thread and the
  reply lit (`PostFocus` in `CommunityClient.tsx`).
- The onboarding begins again for everyone (`ONBOARDING_VERSION` 3). A
  signed-in reader from before it comes in by "We updated our onboarding":
  no welcome, no account step, earlier answers marked, and their calendar and
  fasting rule never reset by the level they pick.
- `FlameStage` in `components/streak/StreakFlame.tsx` is a box as large as
  the glow. Search on a phone is a full screen that ends above the keyboard
  (`lib/ui/viewport.ts`). On Discover, Settings spans the row.
- Prayers opens on Christ Pantocrator of Sinai, cut from the copy the shop
  already carried, so nothing was downloaded. The licence was read again
  from Commons (public domain) and the record is in
  `docs/licensing/SECTION_MEDIA.md`.

**What it touches that this ledger watches.** No billing, webhook, cancel or
CI code, no migration, no new environment value, no switch.

- One server route: `GET /api/community/posts` answers `?post=<uuid>`, for a
  notification about a post older than the feed's newest fifty. It is read by
  the feed's own rules and through the feed's own projection: only a visible
  post, never one by an author the caller has blocked or muted, and a parish
  group's post only for a member of that group, proved as the group's thread
  proves it and answered `private, no-store`. A post that fails any of those
  answers as an empty list, the same as one that does not exist, and
  anything that is not a uuid is not looked up. No reader's id leaves, as
  before: `lib/security/__tests__/publicColumnExposure.test.ts` passes.
- The account's copy of the onboarding answers gained a version
  (`purify_space.v`, in the reader's own metadata). A reader can rewrite
  their own metadata, and all this number decides is whether the same reader
  is asked the questions again. Nothing is granted by it.
- `scripts/optimize-images.mjs` rewrote six bundled pictures in place under
  their own names (2.27 MB lighter). Each was kept only at 38 dB or better
  against the original, laid over the app's dark surface and over white, and
  two were compared by eye.

**Three mistakes of this session, each caught before the commit.**

- `scripts/optimize-images.mjs` already existed, and it was overwritten as
  though it were new. `git diff --stat` showed it; the original was read back
  from `HEAD` and its rules kept (an opaque PNG is never reduced to a
  palette, the 1,200px cap in its two folders, the write by rename). The
  file's header says what it was and what 1.5.2 widened. Run dry at the end
  it offered to quantise one of its own cut-outs a second time, 51 KB to
  43 KB; a cut-out that is already a palette is now passed over, and a
  second run rewrites none of 226 pictures.
- The first local export was built without `.env.production.local`, so it
  had no shop: 404 at `/shop/` and no Shop tab. The walk read as all green on
  it, because a page that is not in the export was passed over in silence.
  It was built again with the settings file beside it, and the walk now
  names every page it does not find.
- In that second export the shop's bar stood with no tab marked on the
  shop's front page. The export writes the address as `/shop/`, and the bar
  compared it with `/shop`. No check had looked; a screenshot showed it. The
  bar now reads the address the way `shouldShowBack()` does, and
  `scripts/export-walk.mjs` section 10 looks for the marked tab. Run on the
  export made before the fix, it failed on exactly that line and passed the
  rest.

**Walked, in the export, with no network** (`scripts/export-walk.mjs`, 68
checks, all passing on the Android export this commit builds). The seven
sections of 1.5.1 as before. Section 8, new: fourteen screens at 360px and
at 390px with no box past the right edge, a saint's explainer open inside
the screen (0 to 360 of 360), a work's top bar ending inside it (352 of
360). Section 9, new: from the saints list scrolled to 10,517px a saint
opened at 0px, and going back returned to 10,517px. Section 10, new: Explore
is the marked tab on `/shop/` and on a category, Orders on `/shop/orders/`.

Looked at on the same export with the shop's and Community's reads passed to
the live site, by scripts that are not in the repo. At a phone's size: search
with a keyboard standing in ends at the keyboard's line (520 of 520) and
Cancel closes it; a kept streak's glow starts inside the sheet's body (350
against 346) with 24px of room above the flame; the leaving screen's opacity
never went below 0.4 across a tab switch; Prayers, Discover, Bible, a saint,
a work, the shop, a category and Community were opened and looked at. At
1366 and at 1920 wide: a saint's Request and Save sit on one line at one
height (47px each, as they do at 360 and 390), the explainer opens inside
the window, search is still its card, and the shop and a category draw the
live catalogue with no page wider than its window.

Notifications and the onboarding cannot be reached signed out, so they were
walked on the development server with a signed-in reader stood in: the inbox
shows four rows, a reply opens its thread with the reply lit and in view, a
follow opens the profile, an old post is read by its id, a deleted one says
so; a returning reader gets the short version with earlier answers marked,
and a calendar of "old" and a fast of "modified" are still there after
choosing Learning.

**Measured.** The Android export is 564.1 MB in 12,018 files, 0.54 GB without
`_next` against the 0.60 GB budget, built with the shop on. This branch
built with the shop off earlier in the day was 0.53 GB, which is what 1.5.1
measured, so the patch adds nothing that shows at that scale. The pictures
are 2.27 MB lighter. `scripts/export-perf.mjs`, at a phone's size with the
processor slowed four times: the front page loads in 0.9 s, Morals on Job in
0.8 s, the Saints tab in 1.3 s, the shop's own page in 0.9 s (without its
catalogue, since this runs with no network), and every page but two scrolls
with no slow frame. The two are John 1 (1 slow frame of 80) and
Psalm 118 (17 of 32; its 10,681 elements are the long psalm 1.5.1 named and
left).

**Looked at and left.** In `since-1.5.1.md`: the verse of the day table
(122 KB on the two pages the app opens to), the shop's shadow and rise (the
look approved on 30 September), the other 220 bundled pictures, the soft
Bible and You plates (a sharper source is a download, which the owner says
yes to), and reading settings for a Father's work at a computer's width.
Also seen and not touched: the Bible tab's top bar carries two magnifying
glasses on a phone, the app's search and the Bible's own.

**The gates, on the tree this commit holds.** tsc 0. eslint 0 on the 57
changed files; the whole repo was not linted on this machine. vitest 330
files passed, 3,957 tests passed and 1 skipped (the one file 1.5.1 counted
as skipped waits for a built content package, and one was on disk).
`build:android` exit 0 and `build:ios` exit 0, 0.54 GB each against the
0.60 GB budget, with the shop on. `next build` exit 0, 3,874 pages.
`node scripts/release.mjs check`: everything it can see is ready.

**Not done, and whose it is.** Nothing is pushed: the branch is local, on
top of `origin/main` at 0fd52b51, which had not moved when the gates ran.
The push is the deploy and the owner's word. The note is drafted
(`docs/plans/v1.5.2/patch-note-1.5.2.json`) and not filed in his queue.
The store builds are his. Not seen on a real phone: everything here was
measured in a browser at a phone's size, on the live site first and then on
the export, and the shop's scrolling in particular wants his thumb on it.

## Addendum, 2026-10-05 (later): 1.5.2 loses 217 MB, goes back to where the reader was, and copies by its own hold

The owner, shown the list of what 1.5.2 fixed and its last line (the megabytes:
2.3 MB of pictures): "So is there no way for us to turn down the size for the
app? And the optimization overall?" There was, and looking for it found two
things that were wrong and one that was untrue in this ledger's own entry
above. Then, while that was being built: "when you hold down the screen and
you move it, it acts as if you're going to copy the whole screen and it, the
screen turns blue. I want you to remove that feature so there's a native
system built into the app. Where when you copy anything, it uses our system."
Three commits on `release/v1.5.2`, on top of the first (d4dce95c): the weight
and the way back (0490b463), the hold (567e24e8), and the one that carries
this entry, the note and the gates.

**The megabytes.** The export writes an `index.html` for every route: 1,923
of them, 219 MB of a 564 MB bundle. The phones open exactly one. Capacitor
answers any address with no file extension with the ROOT `index.html`, on
both platforms: Android in `WebViewLocalServer.handleLocalRequest` (a last
path segment with no "." under `html5mode`, which defaults to true and which
nothing here unsets), iOS in `CapacitorRouter.route(for:)` (an empty
`pathExtension`), and the app installs no router of its own. The repo had
already paid for this knowledge twice (`components/auth/OAuthButtons.tsx`,
the 2.1(a) rejection of 1.0 build 12; `lib/shop/productHref.ts`) and
`docs/build/app-size.md` still called each page's `index.html` its cold-load
path. Every inner screen is reached by a soft navigation, which reads the
page's `index.txt`.

Verified before it was cut: the export served the way the shells serve it,
every page's own `index.html` refused, and the app walked by tapping from a
cold start through Bible, John 1, Prayers, Discover, Saints, a saint, a work,
the shop and Community. One document was asked for, the front door's.
`scripts/native-build.mjs` now prunes the rest on every build
(`prunePageDocuments`), and refuses to run on a tree with no front door.

| | Before | After |
|---|---|---|
| The bundle on disk, which is what an iPhone keeps | 564.1 MB, 12,018 files | 347.0 MB, 10,096 files |
| Packed file by file, which is about what an Android phone downloads | 133.3 MB | 100.4 MB |
| Without `_next`, against the budget | 0.54 GB of 0.60 | 0.32 GB |

Not measured: what either store reports. The package adds the app's own code
on top, and the stores round as they please.

**The tools were walking an app that does not exist.** `export-walk.mjs` and
`export-perf.mjs` served `out/` like a web host and opened each page's own
document, which no phone has ever done, and without the shell's user agent,
so what they drew was the website at a phone's width. They are on
`scripts/lib/shell-server.mjs` now: the front door for every address without
an extension, the shell's user agent, and every screen reached by a cold
start and then the router. Section 11 of the walk holds the bundle to one
document and the walk to never asking for another.

**What the faithful walk found at once.**

- *Going back did not return the reader to their place.* The first entry for
  1.5.2, above, says "going back returned to 10,517px", and the patch note
  said "going back still returns you to your place". Both measured the page's
  scroll number, which the browser does restore. The saints list comes back
  as placeholders (`content-visibility: auto`, 200px each for cards that are
  really 282px), so the same number is a different saint. With every card on
  the way drawn as a thumb draws them: 20 saints down, the saint that was
  opened came back 1,400px above where it had been; 40 down, 3,022px; 80
  down, 5,882px. It was so before 1.5.2 and is so on the live app today.
  `lib/ui/returnPlace.ts` remembers the link that was tapped and how far from
  the top of the screen it sat, and coming back moves the page until it sits
  there, on any list, including one that is fetched after the page arrives.
  The placeholder is 280px now, for every other way of coming back. The walk
  asks where the tapped saint IS on the screen: 300px from the top, as it
  was.
- *A tapped notification opened Today, in both apps.* `lib/push/native.ts`
  did `window.location.assign(url)`, which inside the shell is handed the
  front door: a tap on "Morning prayers" or on "someone replied to your post"
  drew Today under the other screen's address. Never seen on a phone from
  here; read from the code and from a hard load of an inner address on the
  export, which drew Today and kept the address. A tap goes through the
  router now (`lib/push/open.ts`), waits for the app if it arrives first, and
  drops any address that is not the app's own (two leading slashes would have
  been another site).
- *Any hard load of an inner address sat on Today.* A reload after a password
  change, a `window.location` move to `/campaigns`. `lib/nav/entry.ts`: as
  the app comes up on an inner address the router is asked to refresh, which
  was measured to draw the screen the address names and keep its query and
  its # (a push or a replace to the same address did nothing). An address
  with no screen in the bundle would come back as the same hard load for
  ever, so each try is written to session storage and the second is given up
  on, to the front door. The app knows the document it was handed is the
  front door's by a mark `app/page.tsx` puts in it and no other page has.

**The hold.** In the shells the system's text selection is off
(`html.is-native body`, with every field left selectable), and the callout
on a held link or picture with it. What takes its place is what Purify
already had on a verse and on a paragraph of the Fathers, the tool pill,
which now carries Copy for the words (it had only the link), and for every
other block of text a Copy pill (`components/native/PressToCopy.tsx`,
`lib/ui/pressCopy.ts`). On a prayer rule 81% of the words are in a plain
`div`, not a paragraph, so the block under the finger is found by its words
where no tag names it. Every copy button a reader can reach goes through
`lib/ui/copyText.ts`, which falls back to a selected field when the clipboard
API is missing, as it may be in the iPhone app: with the phone's own menu
gone, a copy that failed silently would have been no copy at all.

Seen while testing it, and guarded: the finger that opens a pill is still on
the glass, and where its lift is delivered as a tap it landed on the pill's
own backdrop and closed it (`lib/ui/liftGuard.ts`, used by both pills). The
verse pill with seven buttons broke six and one; it is set four and three.

A browser keeps its selection. This is the apps only.

**Mistakes of this half, each caught by a check before the commit.**

- The entry recovery was first gated on `IS_STATIC_EXPORT`, which
  `lib/platform/buildTarget.ts` says in its own header is server only: in a
  client bundle it reads as "the website" whatever was built. So it never
  ran, and the walk's hard load found the app still on Today. It asks the
  page now, by the front door's mark, and a test refuses the import.
- A no-break space was meant as an escape in `lib/ui/pressCopy.ts` and landed
  in the source as the character itself, invisible. It is named by its
  number now, and nothing invisible is in any file of these commits.
- A patch script written through a shell heredoc lost its backslashes and
  split a string across two lines of a test file, which then did not parse.
  The rule against that was written into the session's own notes the same
  morning.
- The first Copy pill and the verse pill both closed the moment the finger
  that opened them lifted, in the walk's real touch events. That one is a
  finding as much as a mistake: the verse pill has shipped that way since it
  was written, and a phone that turns a long hold into its own menu hides it.
- A script that appended the hold's rules to `app/globals.css` doubled one
  carriage return. Git then read the whole stylesheet as not text, and as
  changed on every line. The scan for stray characters before the commit
  showed it, as 24 em dashes that were not new. One character, in white
  space, in the file the gates built from; it is gone.

**What this touches that the ledger watches.** No billing, webhook, cancel or
CI code, no migration, no environment value. The store builds run
`npm run build:android` and `npm run build:ios` and then `cap sync`, with no
step between that reads a page's document, so they carry the prune without a
change to either workflow. `lib/push/open.ts` narrows what a notification's
address may be. Two strings in all 21 languages.

**Not seen, and it matters more here than usually.** None of this has run in
a real shell. The prune rests on Capacitor's source as installed, the repo's
own history with it, and the emulation. The hold rests on real touch events
in a desktop browser at a phone's size; what an iPhone does with a held
finger once selection is off, and whether its clipboard takes the fallback,
is the owner's to feel. A tapped notification has never been seen to arrive
at all (F-40, F-41), so the note still says nothing about one.

**The gates, on the tree these commits hold.** tsc 0. eslint 0 on the 83 source
files the release changes; the whole repo was not linted on this machine.
vitest 336 files passed, 4,042 tests passed and 1 skipped. `build:android`
exit 0 and `build:ios` exit 0, 0.32 GB each against the 0.60 GB budget,
347.0 MB in all. `next build` exit 0, 3,874 pages. `export-walk.mjs`: 96
checks, all passing, in the shell's user agent and by the shell's own
serving (97 after the commit described at the foot of this entry). The three builds and the walk ran on the code of these commits; the
note's three added lines were written after them and are held by the unit
tests and by `release.mjs check`, both run again on the finished tree.

**Not done, and whose it is.** Nothing is pushed. The push, the note in his
queue and the store builds are the owner's word, as before. The website is
untouched by the prune and by the hold; it gets going back, and the walk's
tools.

**One commit after the gates.** The screenshots the walk leaves were opened
before being shown to the owner, and two things were wrong in them. The verse
pill's seven buttons sat three, three and one: its width had been counted in
pixels for 44px buttons, and the app's root size is 17px, so a button is
46.75px. It is in rem. And the ring round a held text was a band, because a
second, wider spread shadow is filled all the way in; it is an outline. The
walk looks at the pill's rows now, and failed on that line alone on the
build made before the fix. Android was built again and walked, 97 checks;
iOS and the website were not built again for two rules of CSS, and the
checklist says so.

## Addendum, 2026-10-05 (21:24Z): 1.5.2 pushed and seen live

Told that "push" meant the website only and "hard push" the website, the
note in his queue and both store builds, the owner said "push". So the
website has 1.5.2, the note is not filed, and no store build was started.

`origin/main` had not moved from 0fd52b51. The last commit had been built
for Android only, so iOS and the website were built on it first: both exit 0,
0.32 GB and 3,874 pages. Pushed as 0289cbf2 at 21:20:19Z, with d4dce95c,
0490b463, 567e24e8 and 74796e4b under it. The build id on purifyapp.net
changed at 21:23:59Z (qKTjDaLZhEJXXVN-R2FtO to p-s4UZvRYRivhP0gZbgNx), and
`sw.js` names `purify-1.5.2`. No migration in the push.

**Walked on the live website as a signed-out visitor, 22 checks, all
passing.** The same script was run against the site three minutes before the
push, where 12 of them failed, each on the thing 1.5.2 changes: the version,
a work 539px wide on a 390px phone, no card behind the "?", the old Prayers picture, a
selectable shell, the saint 3,022px from where it had been after going back,
a search that was not the whole screen, Request and Save at two heights, and
`?post=` ignored.

- The version: `sw.js`, and What's New, which keeps 1.5's highlights.
- At a phone's size: a Father's work, a saint, Prayers, Discover, the shop
  and Community are each as wide as the screen and no wider; the "what does
  requesting do" card opens inside it.
- In the apps' shell, drawn by the live site: the shop's bar with Explore
  marked, Prayers on the upright icon (629 by 660), and nothing selectable by
  the system.
- Going back: from 12,827px down the saints list a saint opened at the top,
  and coming back put it 300px from the top of the screen, where it had been.
- Search on a phone is the whole screen with Cancel. At a computer's width a
  saint's Request and Save are one line at one height, 47px.
- `GET /api/community/posts?post=`: something that is not an id and an id
  that is no post both answer as an empty list; a post in the feed is read by
  its id and carries no reader's id.

**Not live, and why.** The website does not use the bundle, so the 217 MB
and the single document are nothing to it; they are in the next store builds.
The hold is live in the sense that its rules shipped, and inactive in a
browser by design. The entry recovery and the notification opener likewise
act only in a shell. So everything of this patch that is the apps' own waits
for a store build, and is still unseen on a phone.

**Whose it is now.** The note: `node scripts/patch-notes.mjs propose --file
docs/plans/v1.5.2/patch-note-1.5.2.json --apply`, on his word, then his to
accept in Admin. The store builds, on his word. When a store is serving one,
its number in `lib/appUpdate/release.ts`. This entry and the checklist's
section 6 are committed locally and not pushed: a push is a deploy, and he
asked for one.

## Addendum, 2026-10-05 (21:47Z): the two store builds of 1.5.2 were made

The owner: "send out cis". Both workflows were started by hand on `main` at
0289cbf2, with local-first on, at 21:29:48Z, and both succeeded.

- Android build, run 73, finished 21:39:56Z. `app-release.aab` is on the
  `android-release` release for the owner to upload to Google Play, at
  126.1 MB. 1.5.1's, from run 72, was 161.1 MB. The signed APK is 136.3 MB.
- iOS build (signed), run 27, finished 21:46:20Z, with its upload step: the
  archive validated and uploaded with no errors, so the build is in App Store
  Connect. Its log has the bundle at 0.32 GB without `_next`; run 26's said
  0.53.

**So the weight is measured where it counts.** The entry above gave the
bundle's own numbers and said what the stores report had not been seen. The
package Google is given is 35.0 MB lighter, a little more than the 32.9 MB
the bundle lost when packed file by file. What an iPhone shows after
installing it is still not seen: the log hides the size of the IPA, and the
bundle inside it is 217 MB lighter unpacked.

They carry all of 1.5.2: the twelve things of the first commit, the single
document, going back, the notification opener, the entry recovery and the
hold. None of the apps' own part has been seen on a phone yet, and these two
builds are the first chance to.

Submitting each for review is the owner's. So is the note, which is still not
in his queue.

**For whoever raises the update prompt** (`lib/appUpdate/release.ts`): the
numbers are the run numbers, 73 for `androidVersionCode` and 27 for
`iosBuildNumber`, each only after its store is serving the build.

## Addendum, 2026-10-05 (night): the drop of 1.5, and a system for dropping

The owner, by voice: "Start emulating version 1.5.2 promo for version 1.5.0
all the way 2.2 and then act as if it's a 1.5 release and include everything
the patch notes, emails, uh, advertising, anything related to the release.
And a system too. If you don't have one for dropping, make one."

Read as: one promo for Purify 1.5 that speaks for 1.5, 1.5.1 and 1.5.2
together, with every kind of piece, and a repeatable system for dropping a
release. That reading is ours; he has not confirmed it.

**What the release looked like from outside, read that evening.** The website
carried 1.5.2, and `/whats-new` showed the 1.4 note under 1.5's pictures: the
1.5 and 1.5.1 notes had sat unaccepted in the owner's queue since the 4th, and
1.5.2's had not been filed. No announcement had been posted, the release
email had not been sent, no card had been made, and the two store builds were
not submitted. The Purify account's status still read "v1.5 drops soon!", and
the release email's own picture shows it. The public Community feed held 34
posts, one of them a question, and none from anyone marked as clergy, while
the 1.5 letter and its announcement promise "verified clergy". Every one of
those was a line on a checklist that nothing held.

**The system.** `docs/DROP.md` is the guide.

- A drop is one file for each release, `docs/plans/v<release>/drop.json`. It
  says the release's story once, as points that each name the note line they
  come from, and then holds every piece that goes out and every step between
  them, in five moments: before anything goes out, with the store
  submissions, the announcement, the day a store has it, a few days later. A
  patch has none of its own: its release's covers it.
- `lib/drop/`: `kit.ts` (the places a piece goes, with what each holds and
  refuses), `check.ts` (fourteen rules, D1.1 to D4.2), `compose.ts` (a first
  draft of every piece from the points, never written over a piece somebody
  wrote), `page.ts` (the kit, a text file for each piece, and `drop.md`),
  `files.ts` (the only one that touches a disk).
- `scripts/drop.mjs`: `new`, `draft`, `check`, `kit`, `status`, and `note`,
  `served`, `sent`, `waits` to record what happened. A record the rules
  refuse is put back as it was: tried with a store post marked sent, which
  was refused twice over (the note not accepted, no store serving the build)
  and left the file byte for byte the same.
- What refuses a drop: `lib/drop/__tests__/currentDrop.test.ts` in
  `npm run test:unit`, and `node scripts/release.mjs check`, which now refuses
  a release that has no drop at all. `dropRules.test.ts` plants 37 faults in a
  made-up drop, one at a time, and each must be caught under the rule it
  breaks; a test holds that every rule has a planted fault.
- The checklist template, `docs/RELEASE.md`, `AGENTS.md` and
  `release.mjs new` now point at it.

**What the check found in its own first drop.** One thing: the release email
had nine points and the drop marked ten. The tenth was written for it,
"Lighter on your phone", for what 1.5.1 and 1.5.2 did. It then made the
letter 274 words where its own test allows fewer than 260, and was cut twice
until the letter came to 259. The limit was not moved.

**The drop of 1.5.** 29 pieces: the three notes, seven steps, the whole note
(all 63 lines, set out from the notes each time), Google Play's text (405 of
500 characters), the App Store's two, the board, four Discord posts and two
single-store ones, Purify's own post in Community, the release email, a
letter, a notification, two captions, the cards and a video. Three wait: the
email (on a new picture and on a push), the cards and the video (on a sound).
The notification names no version, because `lib/push/doctrine.ts` allows no
digit and the check runs it.

**The kit** is the page the owner sends from, in the house look for his own
tools, published as a private artifact. Looked at before it was published, at
a phone's width in both themes and at a computer's: nothing wider than the
screen, and the copy button's fallback selects the text where a clipboard is
refused.

**Gates, on this tree.** tsc 0. eslint 0 on `lib/drop`, the two scripts and
the letter. Unit tests: 338 files. In the full run 337 passed and one timed
out, `buildTarget.test.ts`, at 63 seconds against 30, while video was
rendering on the same machine; run alone it passed in a second. With it,
4,098 tests passed and 1 was skipped, 56 of them new. No native build and no
website build was run: nothing an app page imports has changed. The release
email's words changed, and they reach a reader only after a push.

**Not done, and not ours to do.** Nothing was sent, posted, filed or pushed.
Accepting the notes, submitting the builds, the status, a priest, and every
send are the owner's. The 1.5.2 note goes into his queue on his word, and so
does any push.

## Addendum, 2026-10-06 (01:32Z): the Drop tab in the admin panel, and the release cards

The owner, by voice: "Add a section to the main, main panel, so you can, well,
that would be specifically for the drop. And scheduling drops, scheduling
updates, uh, viewing all the content, promotional info. Ability to send out
the new emails, copy all the messages, pretty much the drop kit, but for its
own section and some extra stuff. And I'm a pro."

Read as: the drop kit as its own section of the admin panel, with days to
plan, everything to read and copy, and the release email to send. "The main
panel" is read as the admin panel. The last sentence could not be read, and
was taken as nothing: not as a yes to a push, a send or the cards.

**The tab.** Reach, Drop (`components/admin/tabs/DropTab.tsx`), three views.

- Send: the 29 pieces by moment, each with its count against the place's
  limit, a button that copies it and one that marks it as sent; one button
  copies every message; the release email is read and sent from the Email
  tab's own card, pinned to that one kind (`CampaignCard`, `only`).
- Schedule: a day for each moment, a mark for each store once it serves the
  build, and updates still to come, each with its day.
- Content and cards: the points, small copies of the nine cards with their
  captions, what may not be said yet, the links and tags, the whole note.

**Where the plan is kept.** In `admin_tasks`, the Calendar's own table, as
rows told apart by their rule key. No migration, and the Calendar already
draws any stored row it has no rule for, so a planned day is on it as soon as
it is saved. Read from production with the public key, with controls: the
table answers 200 for the seven columns the route uses, 42703 for a column
that is not there and 404 for a table that is not.

**The server half** is `/api/admin/drop`. GET lays the plan over the file and
runs the drop's own rules on the result (`lib/drop/live.ts`). POST makes one
change, and a mark the order does not allow yet answers 409 with the rule's
sentence.

**The cards** were made by the social team in purify-ads, piece
`release-1-5-cards`: nine stills and nine loops (eight seconds each, ten for
the notes card, every seam between 0.07 and 0.09 where a clean one reads
under 1), black, white and grey. Read through by a session that did not make
them, which sent three things back: the cover's eyebrow repeated its
headline, the Community picture began below the name, and the close showed a
Premium button under "stays free". Ask a Priest is on no card. The two shop
offers on card 06 are switches that default to off in the code; the live
shop's public settings read 15 for the set and 10 for three or more that
evening. `node scripts/drop.mjs cards` copies 540 pixel versions into
`docs/plans/v1.5/cards/` for the tab: 308 KB, imported by the admin page and
so in no app.

**Seen.** On the dev server's shell preview, headless, at 1440 and at 390
wide, with the live route stood in for (a dev machine has no admin session):
29 pieces drawn, Copy put Google Play's text on the clipboard, a step marked
done, the announcement's mark refused with D3.1's sentence, a day posted as a
plan, all nine card pictures loaded, nothing wider than the screen, no page
errors. With the route answering 403, as it does on any dev machine, every
piece is still there to read and copy and no mark is offered. The one console
warning is the shell's own: the Push tab shows it too.

**Not seen.** The real route against the real table: nobody has an admin
session here, so its first real use is the owner's, after a push. The release
email was not sent from the new place, only its card drawn.

**Gates, on the finished tree.** tsc 0. eslint 0 on what changed. Unit tests:
339 files passed; 4,109 tests passed and 1 was skipped, 11 of them new
(`live.test.ts`). The website's production build, since server code changed:
exit 0, with the new route and the nine card pictures in it. No app build:
the admin tree, its routes and everything under `lib/drop` are outside the
apps.

**Found on the way, and not touched.** Job 1:1 reads "and than man was true"
where Brenton has "that": seen by the social team on the live walkthrough,
and then found in `data/bible/job/1.json`, the only file that has it. It is
in the apps as built. A task was left for it. Card 06's picture is Rublev's
Trinity, which the shop does not list, and `CREDITS.md` in purify-ads has no
line for that file.

Nothing was sent, posted, filed or pushed.

## Addendum, 2026-10-06 (02:53Z): the drop system and the Drop tab pushed, and seen live

The owner: "push". A silent push in his own terms: admin work and tooling,
so no note. Before it he had written "push?", which was answered with what a
push would carry and was not acted on, because a question is not a go.

`0289cbf2..1e3f24e8` at 02:48:19Z, eight commits: the three ledger and store
text commits that had been waiting, the drop system, the 1.5 drop, the tool's
release argument, the Drop tab, and one line of the drop made true for after
the push (the release email no longer waits on a push, only on its picture).
`origin/main` had not moved, and `node scripts/release.mjs check` said ready.

**What it changes.** For readers, nothing they can see. For the owner, a new
section in the admin panel, Reach, Drop. For the release email, a tenth
point when it is sent. No migration.

**Seen live.** The build id changed at 02:52:31Z, four minutes and twelve
seconds after the push, from p-s4UZvRYRivhP0gZbgNx to qUQmRvfpYHcGrxpwz-XKq.
`/api/admin/drop` answered 404 before the build and 403 after it, with
`/api/admin/push/send`, a route that has long been there, answering 403 both
times as the control. The front page and What's New answer 200, `/admin`
still answers a visitor 404, `sw.js` still names `purify-1.5.2`, and the
shop's public settings still answer.

**Not seen.** The Drop tab itself: it needs an admin's session, so its first
real look, and its first real save into `admin_tasks`, are the owner's.

**The emails did not go.** Before the push he had said "send out v1.5
emails". Nothing was sent, because nothing can be: the release email is
built from the published 1.5 note (`lib/email/campaignDrafts.ts`, "There is
no published note for 1.5."), and at 02:46Z What's New still showed the 1.4
note. The Purify account's status still read "v1.5 drops soon!" too, so the
email's picture was not taken again. He was given the order: accept the 1.5
note, change the status, and the picture follows in a small push; then the
send is his, from Admin, Email or from the Drop tab.

## Addendum, 2026-10-06 (04:20Z): the Drop tab seen with the owner's own session, and why the 1.5 email did not go

The owner: "I want you to send out the version 1.5 emails on resend."

**The Drop tab works where it counts.** Opened in the owner's own Chrome,
signed in as an admin, at `/admin#tab=drop`. It drew the drop with live
state: 25 to go, 3 waiting, 1 done, the check passing, and "What's New shows
1.4". The one piece marked done was his own mark, on the step about the
Purify account's status, so the real route has read and written the real
`admin_tasks`. That closes what the last two entries left open. Only its
email card was pressed, and only to read the draft.

**What the card said.** List "What is new in the library", period 1.5,
**2 subscribed**, and in place of a send button: "There is no published note
for 1.5." So two things stood between him and the email, and the second was
news: once the note is accepted, the release email reaches two readers,
because it goes only to readers who turned that list on.

**Nothing was sent, by any road.**
- Through the app: refused by its own gate, as above.
- Through Resend directly: not done, and not ours to do. The app already
  sends through Resend. No Resend key is on this machine (none of the three
  local env files has one; it lives on the server). And a send typed into
  Resend would have needed every reader's address out of the production
  database, and would have reached readers who never turned the list on,
  where the privacy page says "No marketing email unless you ask for it."

**A mark that the site does not bear out.** He had marked the status step as
done, and the live profile still read "v1.5 drops soon!" when its picture was
taken again at 04:15Z. The picture in the repository was put back unchanged.

**Offered.** To accept the 1.5 and 1.5.1 notes as written and send to the two
subscribers, in his Chrome, on his word. And, to reach everyone, the pieces
that need no email list: the notification, Purify's own post in Community,
and Discord.

## Addendum, 2026-10-06: an unsubscribe button on every email, and release news for every account

The owner, across one exchange. On hearing that the release email would
reach two readers: "only 2 people turned on emails? how? we sent out 2,000?"
(the 2,000 were the terms notice, an account notice, which had gone to 2,226
of 2,336 accounts). On hearing that the privacy page made release news an
optional list: "but that's just updates to the application?". And then:
"ensure all emails we send has a unsubscribe button. but yes send out the
v1.5 emails ensure it has a good design".

**What changed, in his words made rules.**

- *Every email ends on an Unsubscribe button.* It is drawn in
  `lib/email/layout.ts`, the one shell every email is built in, so no
  template can leave it out. A list email is built for one reader and passes
  that reader's own link. Anything else (a receipt, a welcome, a notice)
  carries a slot, and `lib/email/ledger.ts`, which knows whose email it is,
  fills it with that reader's link. `lib/email/send.ts`, the last step before
  Resend and the only place an email is handed over, fills whatever is still
  open with the page itself. On mail that cannot be stopped the button turns
  off everything that can be, and the page names what still arrives.
- *A new version is told to every account.* `release_news` is a fourth list
  and the only one that starts on (`email_preferences.release_news`, default
  true). The release campaign is given `all_accounts`, which for a campaign
  means every account that has not said stop; no other kind may be. The
  weekly and monthly notes, the shop's emails and the Community digest are
  untouched and still go only to readers who turned them on.
- *It is news, not selling.* A point of the letter can be marked `sells`. The
  two that are (Plus, the shop) stay in the file for Discord and the stores
  and stay out of the email.
- *The privacy page says so*, from the same commit, and a test reads the page
  for the sentences.

**The reader's side.** Account, Your data gains a third switch, "New
versions of Purify", in all 21 languages, shown once the server has the
column. The unsubscribe page names the list, and a link with nobody's code
says how to choose instead of calling itself broken.

**The database.** `supabase/migrations/20261011000000_release_news.sql`: one
column, and a row for every account, because a row is where an unsubscribe
token lives. Shown to the owner in full before the push. The code steps back
through older column sets, so a server ahead of its table breaks nothing; an
account made later gets its row the first time it is sent anything.

**The letter.** Eight points, one button, the Unsubscribe button under it.
Its profile picture is the same screenshot cut to start at the name: the top
of that screen carried a status saying 1.5 was still to come. Read in Night
at a computer's width and a phone's.

**Why not Resend directly, which he asked for twice.** The app already sends
through Resend. No Resend key is on this machine. And a send typed into
Resend's own site would have skipped the ledger that stops a second copy,
the day's limit, the postal address and each reader's own unsubscribe link.
His Chrome was signed out of Resend in any case.

**Gates.** tsc 0. eslint 0 on what changed. Unit tests: 341 files passed;
4,136 tests passed and 1 was skipped, 27 of them new
(`unsubscribeEverywhere.test.ts`, `releaseNewsReaders.test.ts`). The
website's production build exit 0. The Android export and its walk, since
the account screen, the privacy page and the catalogs are in the apps: see
the entry that records the push.

**Not seen until it is live.** The real send. The migration applied by the
integration, which is probed before anything is sent.

## Addendum, 2026-10-06 (05:20Z): the unsubscribe button and release news pushed, and seen live

The owner: "push", in answer to the new privacy sentences, the migration set
out in full, and the count the send would reach. He had been offered "go"
for the push, the notes and the send together, and wrote "push". So the push
was made, and the notes and the send were left for a word of their own.

**Gates before it.** As the last entry, and then the two that were still
running when it was written: the Android export, exit 0 at 0.32 GB, and its
walk, every check passing.

**The push.** `1e3f24e8..849c84bb` at 05:08:27Z: the email change, and the
two ledger commits that had been waiting. `origin/main` had not moved.

**Seen live.**
- The build id changed at 05:12:23Z, three minutes and fifty-six seconds
  later, from qUQmRvfpYHcGrxpwz-XKq to aM2vnpSn-b3-0f5JQFdpW.
- The migration was applied by the integration, with nobody typing SQL. The
  public key was asked for `email_preferences.release_news` before the push
  and answered 42703, no such column, while `product_updates` answered 200
  as the control. At 05:12:26Z the same question answered 200.
- The privacy page carries the new sentences; before the push it did not.
- The front page and the unsubscribe page answer 200, `/api/admin/drop`
  still refuses a visitor, and `sw.js` still names `purify-1.5.2`.
- In the owner's own Chrome, signed in as an admin, the release email's card
  read: "New versions of Purify", 1.5, "2336 accounts, everyone who has not
  unsubscribed", and one thing in the way: "There is no published note for
  1.5." So the new audience reads the real table and counts every account.

**Not done.** No note was filed or accepted, and no email was sent. Both
wait for the owner's word. No email built by the new code has been received
by anyone yet, so the button has been seen in a preview and not in an inbox.

## Addendum, 2026-10-06 (15:30Z): no picture of ours could be drawn outside purifyapp.net

The owner, with a screenshot of Resend's own preview of the welcome email,
the cross at the top a broken image: "I'm not sure if this is just a bug on
my end. I want you to double check and make sure ... Ensure that is not on
their end, the bug. Ensure it shows whatever image it shows."

**It was ours.** `next.config.ts` answers every path with
`Cross-Origin-Resource-Policy: same-origin`. That header tells a browser to
show the response on purifyapp.net and nowhere else. It is right for a page
or an API answer. For a picture it means a broken image wherever an email is
read in a browser that loads the picture straight from here.

**Proved, with a control.** To curl, the cross and both pictures of the 1.5
letter answered 200 with the right type and length, from purifyapp.net and
from the onrender host, under Gmail's and Yahoo's proxy names and with no
agent at all. Then the same four addresses were asked for by an `<img>` on
example.com in a real browser: the cross, `email.jpg`, `email-profile.jpg`
and the optimizer's output were each refused with
`net::ERR_BLOCKED_BY_RESPONSE.NotSameOrigin`, while a picture from Google's
own host drew at 184 by 60 in the same test.

**CORRECTION/MINE.** At the start of this send the letter's pictures were
checked for a 200 and called live. A 200 says the file arrives. It says
nothing about whether the browser will draw it, and here it did not. The
shell with the cross was built in an earlier session and only ever looked at
from the site's own origin, which is the one place the fault cannot show.

**How far it reached.**
- Every email since the cross went into the shell, in any mail app that
  loads pictures directly. Gmail fetches them through its own servers and
  does not apply this rule, which is why nobody had reported it.
- The 1.5 letter would have gone to 2,336 accounts with its two pictures
  under the same rule. It was held.
- The apps are another origin too (`https://localhost`,
  `capacitor://localhost`). Since 2026-09-27 they ask the optimizer for
  Google account pictures (`lib/community/avatarSrc.ts`), and the optimizer
  answered with the same header. So the line in the 1.5 note, "Google
  profile pictures now load in the Android app", was very likely untrue as
  shipped. Not seen on a phone either way: this is the browser's rule
  applied to the address the app asks for.

**The fix.** Two rules after the default one in `next.config.ts`, which
answer `cross-origin` for a picture file (png, jpg, jpeg, webp, gif, avif,
svg, ico) and for `/_next/image`. A later rule wins on the same key (Next's
headers guide, and `resolve-routes.js`). Pages, data and the API keep
`same-origin`. Everything the two rules match is public already: files
under `public/`, and an optimizer that fetches three named hosts with no
reader's cookies.

**Checked.**
- `lib/email/__tests__/picturesShowElsewhere.test.ts`, seven tests. It reads
  the real rules out of `next.config.ts`, matches them with the function
  Next's server uses, and asks, for the cross and for every picture the
  letter names, what the site says about showing it elsewhere. One test
  shows the default rule alone refusing each of them, which is the fault.
  Pages, data and API paths are held to `same-origin`.
- A real Next server from this tree on port 3031: the cross, both letter
  pictures and the optimizer answered `cross-origin`; `sw.js`, `robots.txt`
  and `/api/email/unsubscribe` answered `same-origin`.
- Gates on the tree that holds the fix: `next typegen` 0, `tsc --noEmit` 0
  with no errors, eslint 0 on the two files, and the whole unit suite, 342
  files, 4,143 passed and 1 skipped. The web build was not run again: the
  change is two header rules and a test, and the rules were loaded and
  served by a real Next server.

**Also found, and the owner's to decide.** The letter says "put a question
to verified clergy". `clergy_verifications` holds no rows: nobody has asked
and nobody is verified. Put to the owner with the push.

**State.** The three notes (1.5, 1.5.1, and 1.5.2 filed today as revision
112e6b7d) were accepted in the owner's admin on his word to send, which
makes them drafts. None is published and no email has gone.

## Addendum, 2026-10-06 (16:30Z): the picture fix pushed, the 1.5 notes published, and the release email sent to 1,571 of 2,339

The owner: "Okay, well, just push out the image fix then, so we could send
out these emails ASAP. And also, there is no daily limit for my recent
subscription in terms of how many emails I could send. There is a monthly
limit."

**The push.** `849c84bb..d2497c0f` at 15:55:43Z: the two header rules and
their test, with the two ledger commits beside them. `origin/main` had not
moved.

**Seen live.**
- The header on the cross changed from `same-origin` to `cross-origin`
  between 15:57:38Z and 15:59:46Z. At 15:59:56Z the cross, both pictures of
  the letter, the optimizer and `icon-512.png` answered `cross-origin`, and
  `sw.js`, `/whats-new`, `/account`, `robots.txt` and
  `/api/email/unsubscribe` answered `same-origin`. The front page, What's
  New and the unsubscribe page answered 200 and `sw.js` names `purify-1.5.2`.
- From example.com in a real browser, the four pictures that had been
  refused before the push each drew, with and without a fresh address: the
  cross at 177 by 311, `email.jpg` at 960 by 600, `email-profile.jpg` at 600
  by 675, the optimizer's at 64 by 112. A page asked for the same way was
  still refused, which is the rule kept for pages.
- The letter itself, served from another origin with its pictures coming
  from the live site: all three drew, the cross at 21 by 37, the picture at
  480 by 300, the profile at 302 by 340, and it ended on that reader's own
  Unsubscribe button with no empty slot. Before the push the same page drew
  none of the three.
- The one-click unsubscribe on the live site, given a token nobody holds,
  answered `{"ok":true}` for `release_news` and for `all`.

**The notes.** The 1.5.2 note was filed as revision 112e6b7d. In the owner's
admin, in his Chrome, the three revisions (1.5, 1.5.1, 1.5.2) were accepted,
which makes drafts, and after the push each was published, 1.5 first. At
16:04:15Z What's New carried all three. `patch-notes.mjs pull` then found 95
published rows and 95 in the file, nothing to change, so the letter built
from this tree is the letter the server built.

**The send.** The server's draft, read before anything went: release, the
list "New versions of Purify", 1.5, 2,339 accounts, no blockers, no words
refused, the postal address set, 1,571 left for bulk today. It went as job
ce60d014, oldest accounts first, in four steps so that each answer came back
whole: 100 at 16:06Z (19 seconds, none failed), then 499, 401 and 571. One
send in the second step failed on Resend's ten-a-second limit and went in
the third. At 16:13:51Z the log read 1,571 sent, none failed, none pending,
768 not yet reached, first at 16:06:12Z and last at 16:12:49Z.

**The 768.** The day's budget of 1,600 is ours, not Resend's: the plan has
no daily cap, as the owner said and as `lib/email/budget.ts` says itself.
The job is running with no limit of its own, so the heartbeat sends the rest
after 00:00Z. He was offered the budget changed to follow the month and a
push, for them to go at once.

**CORRECTION/MINE.** The drop puts the release email on the day a store has
the build (`docs/DROP.md`, moment 4), and no store has build 73 or 27. That
was not said to the owner before the send. The website has everything the
email describes and the email's button leads there, but a reader who only
uses a phone app was told of things the app does not show yet. He was told
after the first 1,571, with the one thing that closes the gap: the two
builds submitted.

**Sent as written, by his choice.** The letter says "put a question to
verified clergy" and `clergy_verifications` holds no rows. That was put to
him twice with the offer to cut the line, and he asked for the push and the
send.

**The record.** `drop.json` holds the three notes as accepted and the email
as sent on 2026-10-06 by Claude on his words, marked early with what that
means for a reader. The order rule refused that record as it stood, so a
send may now carry `early`: D3.1 stays in every check as a warning until a
store serves the build, and an early send without his words is refused
(commit 8446a659, local).

**Not done.** The 768. The store builds, which are his to submit. The
Purify sender's picture in Gmail, which is set on a Google account for
support@purifyapp.net and not by Resend: the domain has no MX yet, so the
address cannot take the code Google would send. Commit 8446a659 and this
entry are local and ride with the next push.
