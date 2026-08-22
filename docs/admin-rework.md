# Admin rework — handoff to Opus 5

Written 2026-08-17, while Purify's iOS 1.0 build 12 sits in App Review. This is
a prompt-only planning document: nothing in this file has been implemented.
Every task below was scoped by reading the actual code (file paths, existing
conventions, real gaps confirmed by grep) — none of it is speculative. It is
handed off whole to a future session to execute.

## How to use this document

Fifteen tasks, each self-contained: file paths, what to read first, what to
build, what NOT to touch, and how to verify. Pick one up cold, in the
recommended order below, and it should stand alone without needing the rest
of this document or the conversation that produced it.

Every task closes with the same standing instruction — carry it forward for
any new work that spins out of this effort:

> Before starting, also do your own quick overview and audit of that part of
> the admin panel — don't limit yourself to only what's written in the task.
> If you spot other real problems or improvement opportunities while you're
> in there, note them (as new tasks or in your own handoff notes) rather than
> silently ignoring them just because they weren't explicitly listed.

## Ground rules that apply across all fifteen

- **Migrations are production DDL on merge.** Per `AGENTS.md`, a Supabase
  GitHub integration applies everything in `supabase/migrations/` the moment
  a PR touching that folder merges to `main`. Every task below that adds a
  table shows Edgar the exact SQL as a copyable block and gets sign-off
  *before* that PR exists, not after.
- **Verify for real.** `npm run typecheck`, `npm run lint`, `npm run
  test:unit` (currently ~250 tests, must stay green) at minimum; several
  tasks add a specific browser walk on top. A claim without command output or
  a live check is not done.
- **Visual work styles off `--adm-*` custom properties** in
  `app/admin/admin-theme.css`, never hardcoded colors — that's what makes
  the Polaris token rewrite (task 1) propagate to everything built after it
  without call-site changes.
- **Money-safety and moderation logic is off-limits** for the purely visual
  tasks (5, 6, 7, 8): restyle the chrome, never touch pricing, entitlement,
  refund, or moderation logic itself.
- GitHub Actions is currently billing-blocked on this repo (account spending
  limit / failed payment) — CI checks won't run until that's fixed on
  GitHub's side. Rely on the local verify commands above in the meantime.

## Corrections, added 2026-08-17 while executing Wave A

Everything below was found by reading the code that this document describes.
Each one changes the work, so read them before picking up any task.

1. **Task 1 was not a token swap, it was a dark-to-light inversion.** The live
   admin is a dark operator console; the preview is light. "Rewrite `--adm-*`
   to match" would have flipped the whole panel and voided the documented CVD
   work on the series palette. Resolved with Edgar as **two palettes and a
   toggle**, now shipped: structure (radius, shadow, easing, type ramp) is
   shared, only colour forks. See the header of `app/admin/admin-theme.css`.

2. **"All 22 files under `components/admin/tabs/` consume `--adm-*`" is wrong
   in both directions.** Only three application files reference those tokens:
   `primitives.tsx` (72), `charts.tsx` (24), `AdminShell.tsx` (~20). The tab
   files reference none. What they DO carry is 300+ reader-theme utilities
   (`text-paper`, `bg-night`, `text-gold`), and `--color-paper` is `#ffffff`,
   so a light admin would have painted white text on white cards in ~25 files.
   Fixed by rebinding five reader tokens inside `.adm`, which works because
   `app/globals.css` opens a plain `@theme` block (not `@theme inline`) and so
   emits `var(--color-*)` into every utility. `html[data-reading-mode="parchment"]`
   already proves the mechanism in production. This was the single biggest risk
   in Wave A and the original document did not mention it.

3. **The preview has no nav rail and no tables.** It renders a topbar, three
   KPI cards, an area chart, a map and a footer. Task 2's instruction to read
   "the topbar/nav chrome section" pointed at something that does not exist,
   and tasks 5, 6 and 7 ask for "the Polaris card/table visual language" from a
   file with no table in it. That part is design work against Polaris
   conventions, not extraction. Budget for it accordingly.

4. **`/admin` cannot be opened on a dev machine**, so none of the visual tasks
   could be verified as written. `getAdminUser()` calls `notFound()`, the local
   Supabase anon key is revoked and `ADMIN_EMAILS` is still the placeholder.
   Added `app/admin/shell-preview/page.tsx`, which mirrors the existing
   `NODE_ENV === "development"` bypass in `app/admin/preview/page.tsx` and
   renders the real `AdminShell`. Every admin API still returns 403 to it, so
   no data is exposed and the tabs' empty and error states get exercised too.
   **Task 9 must delete this route as well as `/admin/preview`.**

5. **Task 12's premise is wrong and needs rewriting before anyone starts it.**
   Analytics IS persisted: `analytics_sessions` and `analytics_pageviews`
   (migration `20260521_analytics.sql`), written by `/api/track`. A daily
   aggregator already exists and is already wired: `analytics_daily_buckets(p_since, p_days)`
   returns `(day, visitors, views, signups)` and `/api/admin/traffic` calls it.
   The real gaps are narrower and different:
   - `/api/track` never writes `analytics_sessions.user_id`, so `signedInUsers`
     and `recurringUsers` in `/api/admin/engagement` are structurally always 0.
   - A session id is per browser tab (`sessionStorage`), so "visitors" is
     distinct tab-sessions per day, not DAU. One user in three tabs counts three.
   - The 20s heartbeat in `AnalyticsTracker` inserts an `analytics_pageviews`
     row on every beat, so that table already grows ~3 rows/minute per open tab.
     Any new tracking should reckon with that rather than add to it.
   - `active_users_streak` genuinely has no source. That part of the task stands.

6. **Task 10 is blocked on a credential that is not in this checkout.**
   `.env.discord` does not exist (only `.env.discord.example`), so
   `discord_members` cannot be wired. `scripts/discord-scan.mjs` also reads that
   file from `process.cwd()` directly rather than from `process.env`, so an API
   route would need a different loading path. Variables are `DISCORD_BOT_TOKEN`,
   `DISCORD_GUILD_ID`, and `DISCORD_CHANNEL_*`.

7. **Task 15's "exactly four write routes" is off by one, and the real gap is
   bigger.** `app/api/admin/eikon-box/announce/route.ts` does not contain
   `created_by_email`; the three that do are `push/send`, `gifts` and
   `eikon-box/drops`. Across `app/api/admin` there are 22 mutating handlers and
   only about 7 record any actor at all. Worth singling out:
   `subscriptions/comp` grants a paid tier with no record of who granted it.

8. **Three tab files are imported by nothing**: `ContentTab.tsx`,
   `ContentHealthTab.tsx` and `HealthTab.tsx` (~760 lines), which also means
   `/api/admin/content`, `/api/admin/content-health` and `/api/admin/health`
   have no UI caller. Task 14 wants a service-health tile on Overview, so that
   is the moment to decide whether `HealthTab` is revived or deleted.

### Fixed in passing during Wave A

- **One tab's failed fetch took down the entire admin panel.**
  `CommerceOverviewTab` called `.then(r => r.json())` with no `r.ok` check, so a
  403 or 500 body was stored as if it were data and the first read of
  `data.recent.length` threw a TypeError. That escaped to the route error
  boundary and replaced the whole panel with "Something went wrong". Guarded,
  matching the pattern `AdminShell`'s own badge fetch already used.
- **`NavItem` was declared inside `AdminShell`'s function body**, making it a
  new component type on every render. React remounted all eleven nav buttons
  whenever the orders badge resolved or the mobile drawer toggled, so a
  keyboard operator lost focus mid-tab-walk. Hoisted to module scope.
- **`adminEmail` only ever appeared as the fallback of the rebuild-status
  line**, so the operator's identity vanished for 2.5s on every cache rebuild
  and permanently after a failed one. It now lives in the rail footer.
- `startTransition(() => {})`, a no-op called after every rebuild, removed
  along with its `useTransition`.
- `app/layout.tsx` gained `suppressHydrationWarning` on `<html>`. Both
  pre-paint scripts mutate that element before hydration, which is the point of
  them; the reader's own palette script has had this latent warning all along.

### Still open, found but not fixed

- `SupportConsole.tsx:226` paints a `rgba(255,255,255,0.04)` inset highlight,
  which is invisible on a light ground. Cosmetic only.
- The 23 tab files still have hand-rolled layouts, uppercase eyebrows and
  bespoke spacing that tokens cannot reach. Light mode is now **coherent**
  after Wave A, not **finished**. That is what Wave C is for, and screenshots
  of the current state should not be read as those tabs being done.

## Wave C, partial, 2026-08-21

Three passes landed. None of them is a task from the list above, because
reading the panel first turned up things the list did not have.

1. **A crash in one tab took the whole panel down, in sixteen files.** Wave A
   found this in `CommerceOverviewTab` and fixed that one. It was never
   general: every `/api/admin` route answers failure with JSON, so a 403 body
   parsed and stored cleanly and threw on the first nested read during render,
   where the loader's own try/catch cannot reach it. `adminJson()` in
   `lib/admin/fetchJson.ts` is now the only way the panel reads a route, and
   `TabBoundary` wraps the active panel from inside the shell so the next one
   stays contained. `lib/admin/__tests__/fetchGuards.test.ts` bans the shape.
   Worth noting for scoping: an audit named six files, the test found ten more.
2. **Thirty six tracked-uppercase labels**, in ten files, two of them inside
   shared class constants where a `className` search does not reach. All are
   sentence case now and take `--adm-ink-3` directly rather than `text-paper/45`
   through the reader-token shim.
3. **Fifty five surfaces on the reader's radius scale**, so 20px panels sat
   beside 8px cards. All on `--adm-radius` / `--adm-radius-sm` now, by the rule
   that uniform padding is a surface and px/py is a control. Every rounded
   element in the panel computes to one of four values.

4. **Twenty four panel roots split between two rhythms**, `space-y-5` and
   `space-y-6`, so switching tabs shifted the vertical spacing by 4px and a hub
   at one rhythm wrapped a panel at the other. All on `space-y-6` now, which is
   both the majority and the `gap-6` the shell already uses between the rail and
   the content column.

### Correction: "ShopTab and EikonBoxTab import no primitives" was wrong

An earlier version of this section named those two files as the largest
remaining inconsistency, on the grounds that they used none of the shared
primitives. **That is false and the commit that said so is on main.** The
measurement behind it used a single-line regex for `from "../primitives"`.
ShopTab's import block spans eleven lines, and EikonBoxTab imports by the
absolute path `@/components/admin/primitives`, so both read as zero.

Measured properly: **all 23 tabs import primitives, and those two are the
heaviest users of them**, ShopTab with 10 and EikonBoxTab with 8. There is no
outlier tab. Whoever picks this up should not go looking for one.

5. **Task 14, the customizable Overview**, landed as
   `components/admin/OverviewWidgets.tsx`. Six compact widgets, each reading
   the section's own existing route rather than re-deriving anything, with a
   Customize control and the visible set in `localStorage` as the task
   recommended. Traffic and Service health are on by default; the rest are one
   click away, because shipping all six and calling it minimized would have
   missed the ask. Load-once, not polled, so a summary cannot double the load
   on routes a full tab already polls.

   Two of the six read `/api/admin/health` and `/api/admin/content-health`,
   which had no caller at all. That is a partial answer to the revive-or-delete
   question below: those two routes now have a consumer, so deleting them would
   be a decision rather than a tidy-up.

### Still open after Wave C

- The `SupportConsole.tsx` inset highlight above is still there.
- The three orphan tabs still await a revive-or-delete decision.
- The remaining tab-level differences are real but small: bespoke one-off
  layouts inside panels rather than a structural gap. Worth an eye during other
  work, not worth a sweep of its own.

## v4, 2026-08-21 — the two panels became one

Driven by two pieces of feedback that turned out to be the same one: "I dont
like switching between /owner and /admin", and "I dont like the yellow". The
first was two routes; the second had only ever been answered inside `.own`.

Base reference was a dark fintech dashboard Edgar supplied. What was taken from
it is an information hierarchy, not a palette: a rail that carries live state
rather than only links, a hero that answers "how are we doing" before any tab
is opened, and one segmented control in place of navigating between products.

### What landed

**One accent, one palette.** `app/owner/owner-theme.css` is deleted. Its indigo
is now the admin accent in both themes, its cooler grounds are the grounds, and
its keyframes moved into `admin-theme.css` because `ProjectionChart` reads
`own-draw` / `own-fill` and would have gone silently dead otherwise. Radii went
8/6/12 to 12/8/16. This also removed two latent bugs: `Modal` portals with
`className="adm"` only, so the first modal opened from an owner section would
have rendered amber inside an indigo panel; and the import order at
`app/owner/layout.tsx` was load-bearing with nothing testing it, so swapping two
lines silently reverted the dashboard to gold.

**One shell.** `AdminShell` gained `mode: "ops" | "owner"` and a segmented
switch. `/owner` is a redirect into `/admin#tab=owner-today`. `OwnerDashboard`
takes `embedded` and `panel` props and renders as three tab bodies.

**The hero.** `MetricCard`, `FeatureCard`, `SectionHead`, `PeriodChips`,
`HeroSpark` in `components/admin/hero.tsx`; assembly in `HeroRow.tsx`. Two
routes feed four cards, and neither is a new poll: traffic carries visitors and
signups together, and the shell's existing overview poll is passed down rather
than opened twice.

### Three things worth knowing before touching this again

**1. Merging leaked the projection engine, and a boolean would not have fixed
it.** `OwnerDashboard` statically imports `MARKETS`, `SCENARIOS`, `project` and
`calibrate`. Behind its own 404 those only ever reached owners. Imported from
`AdminShell` they reach every admin, because the bundler decided at build time
and `isOwner` decides at render time. `OwnerSection.tsx` asks
`/api/owner/actuals` first and only `import()`s on a 200. Verified by network
panel, not by reading source: 403, and no chunk matching `components_owner`,
`OwnerDashboard`, `markets` or `projection` requested.

**2. The series CVD claim was not reproducible and is now measurable.** The old
comment recorded a "worst adjacent deutan dE 9.0" as a hand computation that
could not be re-run. `scripts/check-series-cvd.mjs` computes it now and reads
18.4 for those same values, so the two are not comparable and the old figure was
dropped rather than carried forward. Measuring both sets the same way also
showed the real problem was never adjacent pairs: the shipping light set had
`s1` bronze and `s6` burnt orange at **dE 0.3**, indistinguishable. The new set
is 1.9. Better, still not good. A palette clearing ~19 exists and was found, but
it comes out violet/olive/mauve/mint/slate/rose, which is not this panel's
register. That trade is open, deliberately.

**3. Eighty-three pieces of status text were theme-blind, and no test could see
them.** The tab bodies carried hardcoded `text-rose-300`, `text-emerald-300`,
`text-amber-200` and friends. Tailwind's palette does not follow a theme:
`text-rose-300` is `#fda4af` everywhere, roughly 1.9:1 on a white card. All 83
now route through `--adm-good/warn/serious/critical`, and those four gained a
contrast test they never had. **It failed on the first run**: light
`--adm-warn` was `#916a00`, chosen against white where it is 4.92:1, but 4.40:1
on `--adm-panel-2`, which is exactly where a warning inside a table row sits.
Darkened to `#8a6500`.

### Still open after v4

- **The per-tab layout restyle did not happen.** Every tab got the global
  change (accent, grounds, radii, series, status colours) and none got
  restructured into the reference's card language. `CommerceOverviewTab`,
  `TrafficTab` and `RevenueTab` are the ones worth doing first.
- **~430 reader-palette classes remain** (`text-paper/40`, `bg-night`,
  `border-paper/15`, across 50+ opacity variants). They render correctly
  because the shim in `admin-theme.css` rebinds them, so this is consistency
  debt rather than breakage. Collapsing 12 arbitrary ink opacities into the
  three ink tokens is the right move and is a deliberate visual change to
  hundreds of sites, so it wants eyes on it, not a script run blind.
- **Light mode was not visually verified in the session that built this.** The
  browser pane available at the time never composited: `requestAnimationFrame`
  fired zero times, and `var()`-resolved computed styles did not update on a
  theme switch even though the custom properties themselves did. Dark mode was
  walked across all 11 tabs with no leftover gold. Light rests on the contrast
  tests, which are sound because they read the stylesheet directly, and on
  nothing else. Somebody should look at it.
- Everything listed under "Still open after Wave C" above.

## v4.1, 2026-08-21 — costs, and four places the panel was lying

Started as "add the ability to change the budget and the prices on the monthly
costs". It turned out **both already existed** and had since May: `expense_lines`
and `donations_monthly.goal_cents`, edited in `SustainabilityTab`, read by the
public `/support` page, with `revalidatePath("/support")` on every write. The
work was therefore repair and promotion, not construction.

### First, a defect from v4

The v4 colour sweep left **11 doubled closing brackets**
(`bg-[color-mix(...,transparent_94%)]]`) across six files. Malformed Tailwind
arbitrary values emit no rule, so those warning and error banners rendered with
no background. The sweep regex ended in a word-boundary `\b`, which backtracked past the closing
bracket of a `/[0.06]` opacity and left it behind; only that bracket form was
affected. Nothing caught it: TypeScript does not parse class strings, ESLint has
no opinion, every test passed, and the verification grep was `bg-\[[^]]*\]`,
which stops at the first bracket and was structurally incapable of seeing a
doubled one.

`lib/ui/__tests__/arbitraryValues.test.ts` now counts brackets rather than
matching the one shape that went wrong, and was proved against a reintroduced
instance before being trusted.

### What the panel was claiming that was not true

1. **`/support` published live numbers under a hardcoded date.** The page
   rendered `SUPPORT.lastUpdated`, the string `"May 22, 2026"`, beside figures
   read from the database, and fell back to the committed list on any read
   failure with nothing saying so. `lib/support/expenses.ts` now returns
   provenance (`fromFallback`, `updatedAt`) and the page states which it is
   showing. For a page whose argument is transparency this was the defect that
   mattered most.
2. **"Expense coverage" was donations-only.** `raisedCents / monthlyExpenseCents`
   labelled as a whole-business verdict and accented red under 100%, while shop
   and subscription income sat outside the numerator. Renamed "Donations vs
   costs" and the hint now says what is excluded.
3. **A failed load looked like a pending one.** `adminJson` resolves null on a
   403 and on a network error alike, so the tab sat on "Loading…" for ever.
   It now says the request did not answer, and that it cannot tell which.
4. **Three values claimed to be the budget.** Column default $375, constant
   $275, actual costs $258. The API now reports `goalSetForMonth` so the UI can
   distinguish a goal somebody set from a default nobody chose. The goal lookup
   also stopped treating `0` as absent, which had silently replaced a deliberate
   "not asking this month" with the default.

### Also

- **Costs is a rail tab, not a sub-tab of Revenue.** The one screen that edits
  what Purify spends and what the public page publishes was two clicks deep
  behind a tab about income.
- **The `window.prompt` is gone.** Replaced with an inline editor beside the
  goal it edits rather than in the header of the 12-month history card. Focus
  moves to the input on open, via a ref rather than `autoFocus`: the button that
  opened the editor is replaced by it, so without that a keyboard operator's
  focus fell to `<body>`.

### Deliberately not done

- **Cadence on `expense_lines`** (annual and one-off costs). Needs a migration,
  which is production DDL, so it waits for the owner's sign-off on the SQL.
- **Break-even and runway on the projection.** The owner asked for it and a
  design pass argued against it convincingly: the divisor is
  `annualRevenuePerSubscriber`, a slider spanning 10 to 150 that
  `lib/owner/actuals.ts` documents as not observable, so break-even swings
  roughly 15x with one drag. Drawing that as a line next to a measured series is
  the exact confusion `OwnerDashboard`'s measured/modelled rule exists to
  prevent. The honest substitute is a **measured** monthly surplus in dollars:
  this month's donations plus this month's shop net against
  `monthlyExpenseCents`, with MRR left out until `REVENUECAT_V2_API_KEY` is set.
  Owner's call, and it is recorded here rather than silently dropped.

## v5, 2026-08-21 — the Stakent redesign

A ground-up visual pass against a dark fintech reference the owner supplied.
v4 had fixed the structure; this changed the register.

### Why it looked flat, in named lines rather than adjectives

| Cause | Where | Effect |
|---|---|---|
| `preserveAspectRatio="none"` | `charts.tsx:318`, `:608` | A 1000-unit viewBox stretched non-uniformly to container width, so every stroke thinned horizontally and every curve skewed. The single biggest cause |
| `smoothPath` defined, never called | `charts.tsx:89` | `LineChart`, `AreaChart` and `Sparkline` drew angular polylines. The file exported the good curve maths and no chart inside it used them |
| 11 hardcoded `ui-sans-serif, system-ui` | three chart files | Every axis label and badge was OS system font while the panel was DM Sans |
| `const gid = "own-grad"` at module scope | `ProjectionChart.tsx` | Two projection charts on one page shared a gradient id and the second rendered with no fill. `charts.tsx` had the same bug with `area-grad-0` |
| The slider was the browser's | `OwnerDashboard.tsx` | Only `accentColor` was set. No track, no thumb, no fill |

`HeroSpark` already did everything the reference does. Most of the work was
propagating one existing component's behaviour outward.

### The palette was measured before it was written

The owner's spec turned out to be **better** than what shipped: `#8A8A9E` reads
5.47 on the card where v4's `ink-3` read 4.93. One pairing failed, white on
`#D946EF` at 3.46, so the button gradient stops at `#7c3aed` and only the
feature surface reaches magenta.

A split the spec did not anticipate: `#7c3aed` reads 3.24 as a chart line, which
is dim, while `#a78bfa` reads 6.79 but fails as a button ground at 3.15. Hence
`--adm-accent` and `--adm-accent-line` as two tokens.

**The first series candidate scored a deutan dE of 0.3** between its violet and
blue lines, which is one colour to a red-green colourblind reader. Swapping the
blue for a rose took it to 3.8. Measured with `scripts/check-series-cvd.mjs`:

| | deutan | protan | tritan |
|---|---|---|---|
| v4 dark | 2.8 | 3.5 | 0.8 |
| v4 light | 1.9 | 6.5 | 1.3 |
| **v5 dark** | **3.8** | **13.0** | **2.5** |
| **v5 light** | **6.8** | **5.9** | **1.8** |

Better on every axis in both themes. Still not solved: a set clearing ~19 exists
and comes out violet, olive, mauve, mint, slate and rose, which is not this
panel's register.

### A gradient defect caught by measuring rather than looking

Running the feature card's gradient on to full `#d946ef` put its body copy at
**2.99:1**, under the 4.5 floor, because that magenta is far lighter than it
looks. The fix is a corner bloom capped at 20% instead of a hard band, plus body
copy at 94% rather than 88%, giving a worst-case 4.63:1. **No test can catch
this**: `adminTheme.test.ts` only parses plain colour tokens and throws on a
gradient, so the numbers live in a comment beside the token.

### Magic UI: technique, not packages

The owner installed the Magic UI MCP. Of 82 registry items most are landing-page
effects. `shine-border` has **zero dependencies** and its `mask-composite`
border trick is directly useful. `magic-card` and `number-ticker` both need
`motion`, and `magic-card` also needs `next-themes`, which fights this repo's
own `data-adm-theme` attribute; `number-ticker` duplicates `CountUp.tsx`.
`clsx` and `tailwind-merge` already ship, so the only real gap was `motion`.
Nothing was installed. `lucide-react` was refused on the same grounds loudly
enough to reach a patch note.

### What landed

- **Wave 0.** Deleted `PurifyShopifyAdmin.tsx` and `/admin/preview`, 826 lines
  of dead mockup of a design system the panel had already left. It held 3 of the
  49 touch-target offenders, and the ceiling was at exactly 49, so the redesign
  had no room for a single compact control until it went. Ceiling now 46. Also
  removed four dead amber-era classes from `globals.css` and three unused motion
  classes. **`rail-pulse` was NOT dead** and survived: it belongs to the reader's
  study rail, not the admin.
- **Wave 1.** Four surfaces (`#0b0b0e` / `#0e0e12` / `#13131a` / `#191922`),
  pure white primary ink, the split accent, a three-stop gradient family, the
  new series, 14/10/18 radii. All 66 contrast gates pass, both themes.
- **Wave 2.** Every chart curved through `smoothPath`, every gridline removed,
  gradient fills at 0.20 → 0 with `useId()`-namespaced ids, SVG text on
  `var(--font-sans)`, both `preserveAspectRatio="none"` gone.
- **Wave 3.** A real range slider (dual-tone track, defined thumb, focus ring,
  WebKit and Gecko written side by side because they share no pseudo-elements),
  gradient primary buttons with a matched glow, and a top bar with ⌘K
  jump-to-tab search and a pending-orders bell.
- **New:** `app/admin/charts-preview`, a dev-only gallery rendering every real
  chart on deterministic sample data. It exists because every `/api/admin` route
  answers 403 without a session, so a chart redesign could otherwise be
  typechecked, linted, tested and never once seen. Two AreaCharts sit side by
  side in it deliberately: that is the arrangement that proves the gradient-id
  collision is fixed.

### Still open after v5

- The rail's active state is a neutral fill. The spec offered an accent bar or a
  translucent pill; the bar was removed at the owner's request in v4 and was not
  reinstated without asking.
- The hero analytics panel (the reference's detail-panel anatomy: last-update
  line, oversized hero value with inline actions, control suite, metrics strip)
  was not restructured.
- **419 reader-palette classes across 25 files** still carry reader semantics
  into the admin via the six-line shim. ShopTab alone has 111. Correct, but
  indirect. `components/owner/**` has zero.
- Light mode still unverified visually, for the same reason as v4: the browser
  pane does not composite, so `var()`-resolved styles do not update on a theme
  switch. It rests on the contrast tests, which read the stylesheet directly.

## Recommended execution order

Numbered by task ID (matching the live task tracker), grouped into waves.
Within a wave, tasks can run in parallel; a wave shouldn't start until the
previous one has landed, except where noted.

**Wave A — foundation, sequential, blocks most of the rest**
1. `#1` Extract Polaris design tokens into a reusable admin theme layer
2. `#2` Rebuild AdminShell chrome (rail, header, toolbar) in Polaris style

**Wave B — independent data/infra, no dependency on Wave A, can start immediately and run alongside it**
3. `#10` Add `roadmap_goals` + `roadmap_checklist_items` tables and admin API routes
4. `#12` Build daily-active-user tracking to back the active-user roadmap goals
5. `#13` Replace estimated subscription MRR with real Stripe + RevenueCat billing data, and make Revenue customizable
6. `#15` Add a unified admin activity log (who did what, when)

**Wave C — tab-by-tab Polaris styling, depends on Wave A**
7. `#3` Wire real KPI data into the Overview tab's Polaris cards *(coordinate with #14 — both touch Overview)*
8. `#4` Port the Polaris world map into the live admin's Live tab
9. `#5` Apply Polaris styling to the Money tabs *(coordinate with #13 — both touch RevenueTab.tsx)*
10. `#6` Apply Polaris styling to the People tabs
11. `#7` Apply Polaris styling to the Catalog tabs
12. `#8` Apply Polaris styling to the Reach tabs *(sequence after #4 — TrafficHubTab likely shares the map component)*

**Wave D — feature UI, depends on its Wave B schema**
13. `#11` Build the Roadmap admin tab UI *(depends on #10)*
14. `#14` Turn Overview into a customizable, minimized summary of every admin section *(benefits from #1's tokens; coordinate with #3)*

**Wave E — final, after everything above has landed and been verified live**
15. `#9` Retire or repurpose `/admin/preview` once the live admin fully carries the Polaris look

**Cross-task coordination flags**, called out because more than one task
touches the same file or route and could conflict if built out of order or
without awareness of the other:
- `RevenueTab.tsx`: tasks #5 (visual) and #13 (real data) both touch it.
- Overview tab: tasks #3 (KPI restyle) and #14 (add cross-section widgets)
  both touch it.
- Admin write routes (`subscriptions/comp`, `shop/refunds`, `community`,
  `roadmap/*`): task #15 threads activity logging into routes that #5, #6,
  #7, and #10 also modify.
- `TrafficHubTab.tsx`: likely embeds the same map component task #4 reworks;
  sequence #8 after #4.

---

## Task 1 — Extract Polaris design tokens into a reusable admin theme layer

Repo: C:\Users\Edgar\Homebase\projects\orthoapp. Read components/admin/preview/PurifyShopifyAdmin.tsx in full (826 lines) and app/admin/admin-theme.css. The preview file hardcodes a Shopify-Polaris-grade visual system inline: explicit hex tokens (#E1E3E5 border, #202223 ink, #6D7175 muted), an 8px card radius (R8 = "rounded-[8px]", never Tailwind's rounded-lg because the reader theme redefines that scale), a specific card shadow, and a transition curve (SNAP). The live admin (app/admin/page.tsx -> components/admin/AdminShell.tsx -> components/admin/tabs/*) currently uses a different "operator theme" defined as CSS custom properties in admin-theme.css (--adm-accent, --adm-ink, --adm-ink-2, --adm-ink-3, --adm-rail, --adm-line, --adm-line-strong, --adm-warn, --adm-critical, consumed via inline style={{ color: "var(--adm-ink)" }} throughout AdminShell.tsx and components/admin/primitives.tsx).

Task: pull the Polaris tokens (colors, radius, shadow, transition, spacing scale used by KPI cards) out of PurifyShopifyAdmin.tsx and rewrite admin-theme.css's --adm-* custom properties to match them, so every existing consumer of --adm-* (AdminShell.tsx, primitives.tsx, all 22 files under components/admin/tabs/) picks up the new look automatically with zero call-site changes. Do NOT touch data-fetching code, the auth gate in app/admin/page.tsx, or app/admin/preview/page.tsx. Do NOT delete PurifyShopifyAdmin.tsx yet — later tasks still reference it as the design source. Verify with npm run typecheck and npm run lint (both must stay 0 errors per AGENTS.md), then open /admin locally (real auth required, or set NODE_ENV=development to hit the preview route) and screenshot both /admin and /admin/preview to confirm the palettes now visually match. This is task 1 of the Purify admin Polaris migration; no other visual task should start before this one lands, since every later task assumes --adm-* already carries the Polaris values.

Before starting, also do your own quick overview and audit of this part of the admin panel — don't limit yourself to only what's asked above. If you spot other real problems or improvement opportunities in the theme layer while you're in there, note them (as new tasks or in your handoff notes) rather than silently ignoring them just because they weren't explicitly listed here.

## Task 2 — Rebuild AdminShell chrome (rail, header, toolbar) in Polaris style

Repo: C:\Users\Edgar\Homebase\projects\orthoapp. Depends on task 1 landing first. Read components/admin/AdminShell.tsx (328 lines) in full and the topbar/nav chrome section of components/admin/preview/PurifyShopifyAdmin.tsx (first ~150 lines plus wherever it renders its topbar/nav — read the whole file since it's one component).

AdminShell.tsx owns: the GROUPS array (Money/People/Catalog/Reach, 11 tabs total — soon a 5th group "Plan"/Roadmap per the roadmap-goals tasks, so design for growth not just the current 11-item state), #tab=<id> URL hash sync (readHash/hashchange listener), a pending-orders badge sourced live from GET /api/admin/overview, the "Rebuild caches" toolbar (POST /api/admin/actions with action=cache-rebuild), a sticky desktop rail that collapses to a toggle-open panel on mobile (navOpen state), and per-tab entrance animation (key={active} className="adm-panel-enter").

Task: restyle the rail, header, and toolbar to match the Polaris preview's chrome (card treatment, spacing, typography weight/size, the way it groups nav items) while preserving every piece of behavior listed above verbatim: the hash routing, the orders badge and its live fetch, the four rebuild-cache buttons and their status text, the mobile nav toggle, and the panel-enter animation. Do not change TABS, GROUPS, or any component import — this is a visual pass on the shell only, not a re-architecture.

**Concrete "before" critique, from Edgar's own screenshot of the current rail (2026-08-17), use this as the brief, not just "make it Polaris":**
- The only structural device today is background-fill: nav items are plain text rows, no leading icon, no left accent rule, nothing to scan besides reading each label top to bottom. Give the eye a faster anchor per item (icon, or a left accent bar on the active row) so the rail scans at a glance, not by reading.
- The active-item treatment (currently a dark olive/khaki filled pill around "Users," bold khaki-yellow text) reads low-contrast and muddy against the near-black background — "you are here" should be unmistakable at a glance, not something you have to notice. Push for real contrast: crisper accent color, not a desaturated fill.
- Group labels (Money/People/Catalog/Reach) are undifferentiated small gray caps with zero divider — group boundaries exist only as vertical whitespace. With a 5th group about to land, that whitespace-only separation will blur together into one long list. Add an actual boundary (a rule, or tightened card grouping per group) before the list gets longer — this is the exact density problem AdminShell's own code comment says the last redesign was written to fix ("eleven flat tabs... on a laptop the last three sat off-screen"), don't reintroduce it one layer down.
- The rail has zero account/identity affordance — no avatar, no sign-out, nothing anchoring "who's logged in" to the nav itself (adminEmail currently only surfaces in the header toolbar area, out of the rail entirely). Decide deliberately whether the rail should carry a persistent identity/sign-out control at its base, which is common in Polaris-style admin shells, rather than leaving it purely a list of links.
- The one spot of color in the entire rail is the gold "16" pending-orders badge — that's correct and intentional (AdminShell.tsx's own comment: it's the only count that means "someone is waiting," so it's the only one that earns a badge). Preserve that restraint. Do not add badges to other items just to balance the page visually — that would erase the one signal that currently means something.
- "Purify admin" at the top is plain bold text, no mark/icon. Check whether the Polaris preview brands its own topbar with anything worth carrying over; if not, a small wordmark or icon treatment is still worth considering so the rail doesn't open on bare text.
- The rail is a fixed 184px (`w-[184px]` in the current code) and nav labels already truncate (`truncate` class on NavItem) — if the redesign adds icons or changes width, re-check that labels like "EIKON Box" and "Subscriptions" still don't clip, and that adding a 5th group doesn't force the rail to scroll on a standard laptop viewport, which is the specific failure this whole nav was rebuilt to avoid the first time.

Verify: npm run typecheck, npm run lint, then in a browser confirm deep-linking to #tab=orders still lands on Orders, the mobile nav toggle still works at a narrow viewport, the pending-orders badge still renders when /api/admin/overview returns a nonzero ordersPending, and — new — that the rail stays legible and non-scrolling with all five groups populated (mock the 5th "Plan" group locally if the roadmap-goals tasks haven't landed yet, just to pressure-test the layout).

Before starting, also do your own quick overview and audit of the shell and nav — don't limit yourself to only what's asked above. If you spot other real problems or improvement opportunities while you're in there, note them (as new tasks or in your handoff notes) rather than silently ignoring them just because they weren't explicitly listed here.

## Task 3 — Wire real KPI data into the Overview tab's Polaris cards

Repo: C:\Users\Edgar\Homebase\projects\orthoapp. Depends on tasks 1 and 2 landing first. Read components/admin/preview/PurifyShopifyAdmin.tsx's KPIS array and area-chart section (top ~200 lines), and components/admin/tabs/CommerceOverviewTab.tsx and components/admin/tabs/OverviewTab.tsx (both currently rendered live — CommerceOverviewTab is the "Money > Overview" tab in AdminShell's GROUPS, OverviewTab appears to be an older/alternate overview, check which one AdminShell actually wires today before assuming).

The preview's own header comment (lines 3-23) already maps its sample KPIs to real sources: subscriptionStats from lib/entitlements/adminStats.ts, estimatedMrrCents from lib/premium/mrr.ts, and live sessions/visitors/pageviews already rendered by OverviewTab.tsx. Two sample KPIs in the preview ("Daily Active Prayers", "Average Session Depth") were explicitly invented because no such metric exists in the codebase (lib/analytics/ only holds geo.ts) — the preview reshaped these against real equivalents rather than inventing data; read the preview's comment block for exactly which real numbers it substituted.

Task: take the Polaris KPI-card visual treatment and the hand-rolled SVG area chart from the preview and apply them to the real, data-fetching overview tab, binding to the actual API routes it already calls (check app/api/admin/overview/route.ts and app/api/admin/revenue/route.ts for the real shape) rather than the preview's SERIES sample array. Do not invent new metrics. If a Polaris card in the preview has no real backing data, drop that card rather than fake it. Note: this task overlaps with task 14 ("Turn Overview into a customizable, minimized summary of every admin section") — coordinate rather than duplicating the KPI-card restyle twice. Verify: typecheck, lint, then load /admin#tab=overview as a real admin and confirm the KPI numbers match what /api/admin/overview and /api/admin/revenue actually return (cross-check with curl against a dev server).

Before starting, also do your own quick overview and audit of the Overview tab and its data sources — don't limit yourself to only what's asked above. If you spot other real problems or improvement opportunities while you're in there, note them (as new tasks or in your handoff notes) rather than silently ignoring them just because they weren't explicitly listed here.

## Task 4 — Port the Polaris world map into the live admin's Live tab

Repo: C:\Users\Edgar\Homebase\projects\orthoapp. Depends on task 1. Read components/admin/preview/PurifyShopifyAdmin.tsx's map section (HUBS array, MAP_W/MAP_H/LAT_MAX projection constants, the equirectangular projection math, around lines 100-250) and compare against the currently-live components/admin/WorldMap.tsx, which the preview's header comment says uses react-simple-maps (a topojson fetch + a React 19 peer-dependency risk the preview deliberately avoided by hand-rolling inline SVG instead). Also read components/admin/tabs/LiveTab.tsx to see how WorldMap is currently wired to real visitor data (likely via app/api/admin/traffic/route.ts or similar geo endpoint — check app/api/admin/geo-debug/route.ts too).

Task: decide and execute one of two paths — (a) restyle the existing WorldMap.tsx (keep react-simple-maps, just reskin markers/land colors to Polaris tokens), or (b) replace it with the preview's hand-rolled inline-SVG projection wired to real hub/session data instead of the preview's static HUBS sample array. Recommend path (b) since the preview file's own comment frames the topojson dependency as a risk it was written to avoid, but flag this as an open decision for the owner before deleting WorldMap.tsx — do not delete it without confirmation. Whichever path, the result must plot real live-session geography, not sample cities. Verify: typecheck, lint, then confirm on a browser that the map renders with zero markers when no one is on the site (not the sample NYC/Athens/Belgrade/etc. pins) and with real markers when traffic exists.

Before starting, also do your own quick overview and audit of the live/traffic-map area — don't limit yourself to only what's asked above. If you spot other real problems or improvement opportunities while you're in there, note them (as new tasks or in your handoff notes) rather than silently ignoring them just because they weren't explicitly listed here.

## Task 5 — Apply Polaris styling to the Money tabs (Orders, Revenue, Subscriptions)

Repo: C:\Users\Edgar\Homebase\projects\orthoapp. Depends on tasks 1 and 2. Restyle components/admin/tabs/OrdersTab.tsx, RevenueTab.tsx, and SubscriptionsTab.tsx to match the Polaris card/table visual language established in components/admin/preview/PurifyShopifyAdmin.tsx (card borders, radius, shadow, typography — these should now flow mostly for free from the --adm-* token rewrite in task 1, but table rows, status pills/badges, and any write-action buttons (comp grants, refunds) likely need explicit restyling since the preview has no equivalent table component to copy from — check if Shopify Polaris's actual table/badge conventions are worth following, e.g. resource-list row hover states, status badges as pill shapes with semantic colors).

These three tabs perform real writes: OrdersTab touches app/api/admin/shop/orders and refunds/route.ts, SubscriptionsTab touches app/api/admin/subscriptions/comp/route.ts (owner-only comp grants per AGENTS.md stop conditions — do not change the write logic itself, only its visual presentation and confirm any existing confirmation dialogs/guards are preserved). Do not alter request payloads, endpoints, or validation. Note: RevenueTab.tsx is also the target of task 13, "Replace estimated subscription MRR with real Stripe + RevenueCat billing data, and make Revenue customizable" — coordinate sequencing with that task rather than restyling it twice from scratch. Verify: typecheck, lint, npm run test:unit (must stay green, ~250 tests), then browser-walk each tab as a real admin confirming existing filters/sorts/pagination and the write actions (a refund button, a comp grant) still function identically, just restyled.

Before starting, also do your own quick overview and audit of these three tabs — don't limit yourself to only what's asked above. If you spot other real problems or improvement opportunities while you're in there, note them (as new tasks or in your handoff notes) rather than silently ignoring them just because they weren't explicitly listed here.

## Task 6 — Apply Polaris styling to the People tabs (Users, Messages, Community)

Repo: C:\Users\Edgar\Homebase\projects\orthoapp. Depends on tasks 1 and 2. Restyle components/admin/tabs/UsersHubTab.tsx (and its likely sub-tab UsersTab.tsx, AudienceTab.tsx — check what UsersHubTab actually composes), MessagesTab.tsx (backs SupportConsole.tsx per components/admin/SupportConsole.tsx and app/api/admin/support/route.ts), and CommunityTab.tsx (campaigns and Trapeza moderation, per AdminShell's own eyebrow text, wired to app/api/admin/community/route.ts) to the Polaris visual language from components/admin/preview/PurifyShopifyAdmin.tsx, same token/card/badge conventions as the prior tab-styling tasks.

These tabs read and act on real user data (support tickets, community moderation actions). Do not change any data-fetching, moderation-action, or messaging logic — visual pass only. Pay attention to SupportConsole.tsx specifically since it's a shared component, not tab-local; check whether other call sites of SupportConsole exist before restyling it globally. Verify: typecheck, lint, test:unit green, then browser-walk each tab as a real admin confirming ticket reply, user lookup, and moderation actions (e.g. hiding a Trapeza post) still work exactly as before.

Before starting, also do your own quick overview and audit of these tabs — don't limit yourself to only what's asked above. If you spot other real problems or improvement opportunities while you're in there, note them (as new tasks or in your handoff notes) rather than silently ignoring them just because they weren't explicitly listed here.

## Task 7 — Apply Polaris styling to the Catalog tabs (Shop, EIKON Box)

Repo: C:\Users\Edgar\Homebase\projects\orthoapp. Depends on tasks 1 and 2. Restyle components/admin/tabs/ShopHubTab.tsx (likely composes ShopTab.tsx, MarketplaceTab.tsx — verify what ShopHubTab actually renders) and EikonBoxTab.tsx to the Polaris visual language, matching the card/table/badge conventions used in the prior tab-styling tasks. These tabs are the heaviest on media and product management: check components/admin/ProductMediaManager.tsx (a shared component — verify other call sites before restyling) and the underlying routes app/api/admin/shop/products, /listings, /media, /applications, /applications/provision, and app/api/admin/eikon-box/{announce,claims,drops}.

Per AGENTS.md, checkout/pricing logic is money-safety-critical: "the server re-prices everything, never trust a client price or entitlement." This task is visual only — do not touch any pricing, provisioning, or drop-scheduling logic, only the surrounding chrome (cards, tables, form layout, media grid). Verify: typecheck, lint, test:unit green, then browser-walk product listing management and an EIKON drop announce/claim flow as a real admin to confirm nothing broke.

Before starting, also do your own quick overview and audit of these tabs — don't limit yourself to only what's asked above. If you spot other real problems or improvement opportunities while you're in there, note them (as new tasks or in your handoff notes) rather than silently ignoring them just because they weren't explicitly listed here.

## Task 8 — Apply Polaris styling to the Reach tabs (Push, Traffic)

Repo: C:\Users\Edgar\Homebase\projects\orthoapp. Depends on tasks 1 and 2, and ideally task 4 (the world-map task), since TrafficHubTab likely embeds the same map component being reworked there — check for that overlap before starting, and sequence after task 4 if so. Restyle components/admin/tabs/PushTab.tsx (wired to app/api/admin/push/preview and /push/send) and components/admin/tabs/TrafficHubTab.tsx (likely composes TrafficTab.tsx and EngagementTab.tsx — verify) to the Polaris visual language used in the rest of the migration.

Read docs/audit/findings.yaml's push-notification finding before touching PushTab.tsx: as of the last audit, push is broken end-to-end (missing production tables, unset FCM_SERVICE_ACCOUNT_JSON) — this task must not claim or imply push is functional in its UI copy; if PushTab currently shows any state that could read as "working," preserve or improve that honesty, don't regress it. Do not touch the send logic, broadcast targeting, or the audience-selection code, only the visual chrome. Verify: typecheck, lint, test:unit green, then browser-walk a push preview (not an actual send, since production push is confirmed broken) and confirm the traffic charts still render real analytics data.

Before starting, also do your own quick overview and audit of these tabs — don't limit yourself to only what's asked above. If you spot other real problems or improvement opportunities while you're in there, note them (as new tasks or in your handoff notes) rather than silently ignoring them just because they weren't explicitly listed here.

## Task 9 — Retire or repurpose /admin/preview once the live admin fully carries the Polaris look

Repo: C:\Users\Edgar\Homebase\projects\orthoapp. This is the final task, and must not start until every prior task in this document has landed and been verified in a browser as a real admin.

Once the live /admin route (app/admin/page.tsx, AdminShell.tsx, and every tab under components/admin/tabs/) visually matches what app/admin/preview/page.tsx and components/admin/preview/PurifyShopifyAdmin.tsx currently show on sample data, decide with the owner (Edgar) whether to: (a) delete app/admin/preview/page.tsx and components/admin/preview/PurifyShopifyAdmin.tsx entirely now that they've served their purpose as the design source, or (b) keep /admin/preview alive as a living style reference / sandbox for future design iteration, clearly re-labeled so it's obvious it's no longer "the new design not yet shipped" but "the design sandbox."

**Also delete `app/admin/shell-preview/page.tsx`**, added during Wave A so the real AdminShell could be opened on a dev machine at all (see correction 4 above). It has the same dev-only bypass as /admin/preview. If the local Supabase anon key gets rotated and real local sign-in starts working, it can go immediately rather than waiting for this task. Also re-check the dev-bypass comment in PurifyShopifyAdmin.tsx (renders to non-admins when NODE_ENV==='development' because local Supabase auth was broken) — if that Supabase anon-key issue (see the purify-orthoapp-checkout memory) has since been fixed, consider whether the dev-bypass should be tightened to require real admin auth even in development. Verify: typecheck, lint, confirm scripts/native-build.mjs still correctly stashes whatever remains under app/admin out of the native export (grep native-build.mjs for "admin" to confirm the stash list doesn't reference a file you deleted). By this point the roadmap, revenue, overview, and activity-log tasks have also landed alongside the Polaris migration — do a final pass confirming those integrate visually too, not just the original styling tasks.

Before starting, also do your own quick overview and audit of the whole admin panel as it now stands — don't limit yourself to only what's asked above. This is the natural point to catch anything the individual tasks missed or handled inconsistently with each other; note what you find (as new tasks or in your handoff notes) rather than silently ignoring it just because it wasn't explicitly listed here.

## Task 10 — Add roadmap_goals + roadmap_checklist_items tables and admin API routes

Repo: C:\Users\Edgar\Homebase\projects\orthoapp (lifeistheosis/purifyapp). No dependency on the Polaris migration tasks — this can start immediately.

Edgar tracks goals per calendar month (starting August 2026) with a mix of manual-checklist goals and live-metric goals, and per-goal progress needs to surface as a bar not just on a dedicated Roadmap tab but embedded INSIDE the relevant existing admin tab (e.g. the subscriptions goals show their progress bar on SubscriptionsTab, not only on Roadmap) — see task 11 for the embedded-bar UI half of this.

Read first for conventions: app/api/admin/gifts/route.ts (admin-route pattern: getAdminUser() 403 guard, createAdminClient() from lib/supabase/admin, zod schema, runtime="nodejs", dynamic="force-dynamic"), lib/entitlements/adminStats.ts and lib/premium/mrr.ts (real subscription counts, already used elsewhere in admin), and the newest file in supabase/migrations/ for the migration-file convention (prose header explaining why, RLS). Also re-read AGENTS.md's migration warning: merging a PR touching supabase/migrations/ runs live DDL against production on merge, show Edgar the exact SQL as a copyable block for sign-off first.

Schema — supports months + two goal kinds (manual checklist vs live metric) + a section tag for embedding:

```sql
create table if not exists public.roadmap_goals (
  id uuid primary key default gen_random_uuid(),
  month text not null,                 -- 'YYYY-MM', e.g. '2026-08'
  title text not null,
  description text,
  kind text not null default 'checklist' check (kind in ('checklist', 'metric')),
  metric_key text,                     -- e.g. 'discord_members', 'active_subscriptions', 'active_users_daily' — null for kind='checklist'
  metric_target numeric,               -- e.g. 1000, 50, 20 — null for kind='checklist'
  section text,                        -- which admin tab id this goal's progress bar also renders on, e.g. 'subscriptions', 'shop', 'community', 'engagement'; null = Roadmap tab only
  status text not null default 'planned',
  position integer not null default 0,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.roadmap_checklist_items (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.roadmap_goals (id) on delete cascade,
  label text not null,
  done boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists roadmap_goals_month_idx on public.roadmap_goals (month, position);
create index if not exists roadmap_checklist_items_goal_idx on public.roadmap_checklist_items (goal_id, position);

alter table public.roadmap_goals enable row level security;
alter table public.roadmap_checklist_items enable row level security;
-- No public policies: admin-only, same posture as gifts/entitlements. RLS
-- with zero policies denies all anon/authenticated access by default; every
-- read and write goes through the service-role admin API routes below.
```

For kind='metric' goals, progress = current value (read live from the source named by metric_key) vs metric_target, NOT from checklist items. For kind='checklist' goals, progress = done items / total items in roadmap_checklist_items. A metric goal MAY still carry checklist items as sub-tasks (e.g. "Drop Purify on iOS" is metric-adjacent but really a milestone checklist), the kind flag decides which number drives the bar, it doesn't forbid the other table having rows.

**August 2026 seed data — Edgar's exact list, insert verbatim as the initial month's goals** (title/description text is his, do not rewrite or "improve" the wording; the dollar ranges in the subscription-tier goals are his own figures, carry them as-is in description, do not recompute them against lib/premium/plans.ts pricing):

| title | kind | metric_key | metric_target | section | description |
|---|---|---|---|---|---|
| Hit 1,000 Discord Members | metric | discord_members | 1000 | community | — |
| Drop Purify on iOS | checklist | — | — | — (Roadmap only) | seed its checklist from the real, current blocker list in the purify-release-status memory (App Review screenshot on both subscriptions, captured from the Android paywall) rather than inventing steps; confirm exact wording with Edgar before shipping since that memory is a point-in-time snapshot and may be stale by the time this ships |
| Find reliable and high conversion suppliers for EIKON | checklist | — | — | shop | — |
| Reach 20 active users | metric | active_users_daily | 20 | engagement | — |
| Reach 50 active users | metric | active_users_daily | 50 | engagement | — |
| Reach 100 consecutive daily users | metric | active_users_streak | 100 | engagement | "consecutive daily" implies a streak count, a different metric than the plain snapshot above — do not conflate the two metric_keys |
| Get 50 monthly active subscriptions (x7 users a week) | metric | active_subscriptions | 50 | subscriptions | "$249-$17,400" |
| Get 40 monthly active subscriptions (x5 users a week) | metric | active_subscriptions | 40 | subscriptions | "$199.6-$13,920" |
| Get 25 monthly active subscriptions (x3 users a week) | metric | active_subscriptions | 25 | subscriptions | "$124.75-$8,700" |
| Get 10 monthly active subscriptions (x1 user a week) | metric | active_subscriptions | 10 | subscriptions | "$49.9-$3,480" |

**Critical scoping gap, read before estimating this task:** `active_subscriptions` has a real, already-wired source (subscriptionStats() in lib/entitlements/adminStats.ts, used today by Revenue/Subscriptions tabs) — those four goals can compute live progress immediately. `discord_members` needs a small new fetch against the Discord REST API's `GET /guilds/{id}?with_counts=true` (a bot token already exists for scripts/discord-scan.mjs via .env.discord — reuse that credential, do not create a second one) for `approximate_member_count`. But `active_users_daily` and `active_users_streak` have NO backing data anywhere in this codebase today — grep confirms lib/analytics/ holds only geo.ts, and the "live sessions" number shown in OverviewTab/LiveTab is an ephemeral, non-persisted presence count, not a distinct-daily-visitor log. Those two metric_keys cannot be wired to real numbers without new tracking infrastructure — see task 12. Until that lands, seed those three goals (20/50/100 active users) as kind='checklist' with metric_target left for later, or clearly mark them "no live data yet" in the UI rather than silently showing a stuck-at-zero bar that looks broken.

Build the admin API routes: app/api/admin/roadmap/goals/route.ts (GET list, filterable by ?month=, POST create), app/api/admin/roadmap/goals/[id]/route.ts (PATCH, DELETE), app/api/admin/roadmap/checklist/route.ts (POST), app/api/admin/roadmap/checklist/[id]/route.ts (PATCH/DELETE) — mirror gifts route's guard/validation/error-shape. A GET on goals should resolve current progress server-side for metric-kind goals (query the real source per metric_key) so the client never has to know how to compute it. "Status" (separate from progress) stays a free admin-editable text field, not a hardcoded enum. Verify: typecheck, lint, test:unit, and show Edgar the exact migration SQL (including the August seed inserts) as a copyable block before it goes near a PR that could merge to main.

Before starting, also do your own quick overview and audit of the admin API layer and existing entitlements/analytics code — don't limit yourself to only what's asked above. If you spot other real problems or improvement opportunities while you're in there, note them (as new tasks or in your handoff notes) rather than silently ignoring them just because they weren't explicitly listed here.

## Task 11 — Build the Roadmap admin tab UI (goals, statuses, checklists)

Repo: C:\Users\Edgar\Homebase\projects\orthoapp (lifeistheosis/purifyapp). Depends on task 10 landing first.

Two surfaces, not one. (1) A dedicated Roadmap tab showing ALL of the current month's goals. (2) A compact goals/progress bar embedded at the top of each existing admin tab named in a goal's `section` column, showing only the goals tagged to that section. Per the August seed data (see task 10), that means: SubscriptionsTab gets a bar for the four subscription-tier goals, ShopHubTab gets a bar for the EIKON-suppliers goal, CommunityTab gets a bar for the Discord-members goal, and an "engagement" section (check whether that maps to EngagementTab or OverviewTab/LiveTab — decide based on which tab already shows the closest real number) gets a bar for the active-users goals once those have real data.

Read components/admin/AdminShell.tsx in full first: it owns the GROUPS array (Money/People/Catalog/Reach, 11 tabs) and #tab=<id> hash routing. Roadmap doesn't fit the existing four-group framing ("chasing money, chasing people, minding the catalog, or reaching out" — see the comment above GROUPS). Recommended default: a fifth group "Plan" with one tab "Roadmap", appended last so it doesn't disturb the existing four groups' ordering — flag this placement to Edgar rather than assuming it's final.

Build:
1. components/admin/tabs/RoadmapTab.tsx — the full board for the current month (with a month picker/switcher once more than one month of data exists). Per goal: title, description, status (freely admin-editable, not a fixed label), a progress bar (computed server-side by the API for metric-kind goals, computed client-side as done/total for checklist-kind), and for checklist-kind goals an expandable checklist with add/toggle/delete/reorder. A way to create a new goal and delete one.
2. A small reusable component, e.g. components/admin/SectionGoalsBar.tsx, that a tab renders near its top: `<SectionGoalsBar section="subscriptions" />`. It fetches this month's goals filtered to that section (reuse the same GET /api/admin/roadmap/goals?month=&section= endpoint) and renders a compact strip, not the full editing UI — think "3 little progress bars with a title," not a second copy of RoadmapTab. Clicking it should deep-link to #tab=roadmap so the admin can edit from the one place edits happen; do not duplicate the create/edit/delete controls into every section.
3. Wire SectionGoalsBar into SubscriptionsTab.tsx, ShopHubTab.tsx, CommunityTab.tsx, and whichever tab wins the "engagement" decision above — but only once task 10 confirms those sections have goals to show; don't render an empty bar.

Style everything with the live admin's current CSS custom properties (--adm-accent, --adm-ink, --adm-ink-2, --adm-ink-3, --adm-rail, --adm-line, etc. from app/admin/admin-theme.css), not hardcoded colors, so this inherits whatever the admin theme looks like whenever it's actually built — the old operator theme if built before the Polaris migration tasks land, Polaris tokens if built after. A goal with kind='metric' but no live data source yet (see the active-user metrics gap in task 10) must show an honest "no data yet" state, never a bar frozen at 0% that reads as "zero progress" when the truth is "not wired up." Verify: typecheck, lint, test:unit, then browser-walk as a real admin: switch to August 2026, confirm all ten seeded goals render in the right sections, create a goal, change its status, add/toggle/delete checklist items, confirm #tab=roadmap deep-links and survives reload, and confirm the embedded bars on Subscriptions/Shop/Community show only their own tagged goals.

Before starting, also do your own quick overview and audit of the admin nav and tab structure — don't limit yourself to only what's asked above. If you spot other real problems or improvement opportunities while you're in there, note them (as new tasks or in your handoff notes) rather than silently ignoring them just because they weren't explicitly listed here.

## Task 12 — Build daily-active-user tracking to back the active-user roadmap goals

Repo: C:\Users\Edgar\Homebase\projects\orthoapp (lifeistheosis/purifyapp). Discovered while scoping the roadmap-goals feature: three of Purify's August 2026 goals — "Reach 20 active users," "Reach 50 active users," and "Reach 100 consecutive daily users" — have no real data source anywhere in this codebase. Confirmed by grep: lib/analytics/ holds only geo.ts (IP geolocation, no session/visitor persistence). Whatever powers the "readers praying now" live count in components/admin/tabs/OverviewTab.tsx / LiveTab.tsx is an ephemeral, in-the-moment presence signal, not a persisted log of distinct visitors per day — read that code first to confirm exactly what it does today before assuming.

Task: figure out and build the smallest reasonable way to answer two questions live: (a) how many distinct users/sessions were active on a given day (backs "Reach N active users"), and (b) how many consecutive days in a row has that daily count stayed above some threshold, or some other reasonable reading of "100 consecutive daily users" — the exact definition of "consecutive daily users" is ambiguous as written (100 users each active every day this streak, vs 100+ active users on each of N consecutive days — these are very different to build and to hit) and should be confirmed with Edgar before committing to a schema, not assumed.

Whatever you build needs to be cheap to write on every relevant request (this is a prayer app, most traffic is anonymous reads, do not add a write-amplifying table that fires on every pageview without thinking about volume) and needs to feed a metric_key of active_users_daily and active_users_streak that the roadmap-goals API (app/api/admin/roadmap/goals) can query for progress. Consider whether existing infrastructure can be reused or extended (e.g. is there already a lightweight pageview/session ping somewhere that just isn't persisted — check app/api for any /api/*/ping, /api/*/beacon, or similar route before designing a new one from scratch) rather than building a second, parallel analytics system next to whatever already exists. If a new supabase table is the right call, follow the same migration-file convention as task 10 (prose header, RLS, shown to Edgar as a copyable SQL block before any PR touching it can merge, since merging applies it to production). This task has no hard dependency on the roadmap-goals tasks landing first — the tracking infrastructure is useful on its own — but the roadmap UI's active-user goals will show "no data yet" until this ships.

Before starting, also do your own quick overview and audit of the existing analytics/traffic code — don't limit yourself to only what's asked above. If you spot other real problems or improvement opportunities while you're in there, note them (as new tasks or in your handoff notes) rather than silently ignoring them just because they weren't explicitly listed here.

## Task 13 — Replace estimated subscription MRR with real Stripe + RevenueCat billing data, and make Revenue customizable

Repo: C:\Users\Edgar\Homebase\projects\orthoapp (lifeistheosis/purifyapp). Prompted by Edgar's screenshot of the current Revenue tab: "Subs MRR · est. $24.98" is a formula (active subscriber count × list price), not a real billed number, while "Shop net" and "Donations" on the same screen are already real. Task: make subscription revenue real too, sourced from RevenueCat, and make the whole tab customizable rather than a fixed all-time/current snapshot.

**Confirmed by reading the code, not assumed:**
- app/api/shop/stripe-webhook/route.ts already settles real Stripe checkout sessions into shop_orders via lib/shop/webhookSettlement.ts, amount-verified. Shop net/Avg order/Top products in RevenueTab.tsx are already real. Nothing is broken here — Stripe's contribution to this screen does not need a data-source fix, only whatever "customizable" ends up requiring on the UI side (see below).
- app/api/billing/revenuecat/route.ts (the RevenueCat webhook) receives an event body but only ever reads `type`, `app_user_id`, `store`, `expiration_at_ms`, `entitlement_ids` — it writes exactly one thing, `plus_until`/`pro_until` via the `upsert_entitlement` RPC, and discards the rest. RevenueCat's actual webhook payload also carries `price`, `price_in_purchased_currency`, `currency`, `product_id`, `transaction_id`, `purchased_at_ms`, and `period_type` on purchase/renewal events — none of that is captured anywhere today. lib/premium/mrr.ts's own header comment says this explicitly: "RevenueCat holds the real money and the webhook discards the event body." Grepped the repo for subscription_transactions / billing_events / revenuecat_events — no such table exists, so this really is greenfield, not a wiring bug in something half-built.

**Build, in order:**
1. A new table (migration, following the existing dated-file + prose-header + RLS convention in supabase/migrations/, service-role-only access like roadmap_goals) to persist real transaction events as they arrive: e.g. `subscription_transactions(id, user_id, event_type, store, product_id, price_cents, currency, purchased_at, transaction_id, created_at)`. Show Edgar the exact SQL as a copyable block before it's anywhere near a PR that could merge to main — per AGENTS.md, merging a migration runs live DDL against production.
2. Extend app/api/billing/revenuecat/route.ts to also insert a row into that table for purchase/renewal event types, alongside its existing entitlement upsert — do not touch the existing plus_until/pro_until logic, this is additive. Use `transaction_id` for idempotency (RevenueCat retries on non-2xx) so a retried webhook doesn't double-count revenue.
3. Add a real-MRR aggregator (new function near lib/premium/mrr.ts, keep the existing estimatedMrrCents/estimatedArrCents as a fallback for the period before this ships — there will be zero real transaction rows for all historical time, so the UI needs to keep showing the estimate for anything before this table existed, clearly labeled which figure is which) and wire it into app/api/admin/revenue/route.ts alongside the existing shop/donations data.
4. RevenueTab.tsx: replace or supplement the "Subs MRR · est." card with a real figure once transaction data exists, and keep the existing disclosure text pattern (the tab already has an honest "this number is estimated" line under the stat cards — mirror that same honesty if real and estimated numbers are shown side by side during the transition, e.g. "Aug 1–17 real, before that estimated").

**"Customizable" is ambiguous as Edgar wrote it — do not guess silently, confirm which of these (or something else) he means before building the UI half:** a date-range picker on the whole tab, per-source toggle chips (Shop / Donations / Subscriptions) to show/hide cards and charts, or admin-chosen which stat cards appear at all. Default assumption if it can't be confirmed in time: add a date-range picker (the monthly/top-products data already exists per-month in the API response, so this is mostly a filter on data already being computed) since that's the most common meaning of "customizable" for a revenue dashboard and requires no new backend shape.

Verify: npm run typecheck, npm run lint, npm run test:unit, and confirm the RevenueCat webhook's idempotency (send the same transaction_id twice, confirm it inserts once) since a duplicate-counted transaction table would make the "real" number worse than the estimate it's replacing.

Before starting, also do your own quick overview and audit of the billing/revenue code paths — don't limit yourself to only what's asked above. If you spot other real problems or improvement opportunities while you're in there, note them (as new tasks or in your handoff notes) rather than silently ignoring them just because they weren't explicitly listed here.

## Task 14 — Turn Overview into a customizable, minimized summary of every admin section

Repo: C:\Users\Edgar\Homebase\projects\orthoapp (lifeistheosis/purifyapp). Prompted by Edgar's screenshot of the current Overview tab: it only shows commerce (revenue, orders, subscribers) and new-user count — nothing from Traffic, Engagement, Health, Carts, Audience, Community, Push, EIKON, or Sustainability, all of which are full tabs elsewhere in the admin with their own data already live. This is additive: keep everything CommerceOverviewTab.tsx already renders (the "At a glance" and "Subscribers" KPI rows, the 30-day net-revenue chart, the recent-paid-orders list) and add compact summaries of the rest around it, with the admin able to choose which ones show.

Note the API route's own comment is already stale evidence of this gap: app/api/admin/overview/route.ts says "the traffic sparkline comes from /api/admin/traffic (the client already has it)" but CommerceOverviewTab.tsx renders no traffic sparkline at all today — that aspiration was never finished.

**Catalog of what exists to pull from, read each tab's own file header first, don't re-derive data that's already computed elsewhere:**
- Traffic — components/admin/tabs/TrafficTab.tsx / TrafficHubTab.tsx, reads /api/admin/traffic
- Engagement — EngagementTab.tsx, reads /api/admin/engagement (range-aware, returning-visitor rate, top pages)
- Audience — AudienceTab.tsx, countries/devices/auth, 30-day window
- Users/carts — UsersHubTab.tsx, reads /api/admin/carts (live carts, abandoned checkouts)
- Service health — HealthTab.tsx, outbound dependency probes — but IMPORTANT: this one is on-demand and nothing is persisted ("click Re-probe to re-run"), so a health tile on Overview either triggers its own probe on load (cheap, matches how HealthTab already works) or this task needs to add last-known-status persistence — decide and note which, don't silently assume a persisted status exists when it doesn't
- Community — CommunityTab.tsx, reads /api/admin/community, has a moderation queue (reported campaigns, submitted recipes) worth surfacing as a pending-count
- Push — PushTab.tsx, broadcast history + recipient counts
- EIKON Box — EikonBoxTab.tsx, drops/claims
- Content health — ContentHealthTab.tsx, read-only inventory of data/ gaps
- Sustainability — SustainabilityTab.tsx, current-month BMC raised vs goal

**Build a small reusable compact-widget component** (e.g. components/admin/MiniStat.tsx or reuse the existing StatCard/KpiCard from components/admin/primitives.tsx directly — check whether those primitives are already compact enough before building a new one) — one number or two, not a chart, not the full tab. Each pulls from that section's EXISTING api route, does not duplicate query logic that already lives in the full tab.

**Customization:** since this is single-operator software (only Edgar uses /admin), default to a localStorage-persisted set of which widgets are visible and in what order — no new migration needed for a v1. Flag as an open question for Edgar whether he wants it to follow him across browsers/devices, which would need a small `admin_dashboard_prefs` table (user_id or just a singleton row, since there's effectively one admin) instead — don't build the DB version unless he confirms he wants cross-device persistence. Add a lightweight "Customize" control (a gear icon or button near "At a glance") that opens a toggle list of the catalog above; default ON set should be small enough to stay "minimized" as Edgar asked — recommend starting with Traffic + New users (already shown) + Service health, and leaving Community/Push/EIKON/Content-health/Sustainability off by default since Edgar can turn them on, rather than shipping all nine at once and calling that "minimized."

Style with the same primitives and --adm-* tokens already used by CommerceOverviewTab.tsx (KpiCard, Card, ChartFrame) so this doesn't introduce a second visual language. Verify: npm run typecheck, npm run lint, npm run test:unit, then browser-walk as a real admin: default Overview shows the original commerce KPIs plus the default-on new widgets, opening Customize toggles a widget on/off and it persists across a page reload, and confirm none of the added widgets re-fetch data a full tab already fetches in a way that doubles load on the underlying APIs (e.g. don't poll /api/admin/traffic every 30s from both Overview and TrafficTab simultaneously without a reason).

Before starting, also do your own quick overview and audit of the whole admin section — don't limit yourself to only what's asked above. If you spot other real problems or improvement opportunities while you're in there, note them (as new tasks or in your handoff notes) rather than silently ignoring them just because they weren't explicitly listed here.

## Task 15 — Add a unified admin activity log (who did what, when)

Repo: C:\Users\Edgar\Homebase\projects\orthoapp (lifeistheosis/purifyapp). Confirmed by grep, not assumed: no audit_log/activity_log table exists anywhere in supabase/migrations, lib, or app/api. `created_by_email` is recorded ad-hoc in exactly four write routes — app/api/admin/gifts/route.ts, app/api/admin/eikon-box/announce/route.ts, app/api/admin/eikon-box/drops/route.ts, app/api/admin/push/send/route.ts — and nowhere else. Real admin writes that record NOTHING about who performed them today include: subscription comps (app/api/admin/subscriptions/comp/route.ts), refunds (app/api/admin/shop/refunds/route.ts), community moderation (app/api/admin/community/route.ts), and — once they exist — roadmap goal/checklist edits (app/api/admin/roadmap/*, see task 10). As this admin panel accumulates more write surfaces (goals, comps, refunds, moderation), "who did what when" becomes a real operational question with no answer today.

Task: add one admin_activity_log table (migration, following the existing dated-file + prose-header + RLS convention in supabase/migrations/, service-role-only like roadmap_goals — show Edgar the exact SQL as a copyable block before any PR touching it can merge, since merging applies it to production) with columns like (id, actor_email, action text, entity_type text, entity_id text, detail jsonb, created_at). Add a small helper (e.g. lib/admin/activityLog.ts, a single logActivity() function) and thread it into every admin write route that currently records nothing: subscriptions/comp, shop/refunds, community, roadmap goals/checklist once built, and any other mutating admin route you find while auditing (see below). Do not remove the four existing ad-hoc created_by_email columns — they can stay as-is on their own tables, this is additive, not a migration of existing data. Add a simple admin-facing view of the log (a tab, or a panel inside an existing one — your call, propose it to Edgar rather than assuming) showing the most recent N entries, filterable by actor/action/entity type.

Before starting, also do your own quick overview and audit of every admin write route under app/api/admin — don't limit yourself to the four call sites named above, there may be more mutating routes worth wiring into the log that weren't enumerated here. Note what you find (as new tasks or in your handoff notes) rather than silently skipping routes that weren't explicitly listed. Verify: npm run typecheck, npm run lint, npm run test:unit, then browser-walk as a real admin: perform a comp grant, a refund, and a moderation action, and confirm all three appear in the activity log with the correct actor email and detail.
