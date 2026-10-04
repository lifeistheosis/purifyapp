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

**The order for F-32.** `20261007000100_admin_rollups.sql` is NOT in the
first push. It goes to the owner as SQL to run, which is the sign-off, and is
pushed after; the merge then runs it a second time, which it is written to
survive. Until then Audience is whole by paging, and Engagement and Content
count the newest 20,000 page views and say so on the tab.

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
