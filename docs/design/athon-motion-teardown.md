# Athon motion teardown

**Source:** 54.1s screen recording of Athon (Android, 720x1600, captured 2026-07-24 20:30), plus two stills (share card, settings drawer).
**Method:** frames extracted with the `/watch` skill (ffmpeg), uniform 2s grid for the flow map, 0.15s grids for each transition. No audio was analyzed.
**Purpose:** identify what makes Athon's UI read as "insanely clean" and decide what Purify should adopt.
**Status:** analysis only. No Purify code was changed.

> Scope note: this documents techniques (timing, easing, staging, hierarchy). It does not propose copying Athon's assets, icons, copy, or layouts. Purify keeps its own design language; Athon is a quality bar.

---

## 1. What Athon is

A direct competitor: an Orthodox prayer / Scripture / saints / parish app. Positioning visible in the recording:

- Blessed by the Romanian Orthodox Church (Archbishop Andrei of Cluj), content overseen by Fr. Iustin Miron of Nicula Monastery and reviewed by the Faculty of Orthodox Theology in Cluj. They lead with this: it is the **second** onboarding screen.
- Claims "#1 Orthodox App", 4.9 stars, 5,000+ reviews.
- Content: 1,093 saint lives + prologue, audio Bible studies, Orthodox commentary (Chrysostom, Augustine), liturgical calendar (New/Old), prayer rule, parish directory, an "Ask" AI feature, "Chapel".
- Monetization: hard paywall at $39.99/yr or $5.99/mo, "SAVE 44%", plus contextual mid-flow paywalls.
- Tabs: Home / Saints / My Parish / Bible / Explore.

Overlap with Purify is close to total. The differences worth noting are strategic, not visual: Athon has an institutional blessing, a parish directory, and audio-first Bible studies.

---

## 2. Screen-by-screen timeline

| Time | Screen |
|---|---|
| 00:00 | Welcome. Full-bleed dark chandelier photo, "Episcopal Blessing" laurel badge, serif `Athon` wordmark, italic serif subhead, gold pill `Begin`. |
| 00:02 | Transition into `Behind Athon`. |
| 00:04-00:07 | `Behind Athon`. **Light cream theme**, navy serif, coat of arms, navy `Continue`. Thin gold progress bar pinned at the very top. |
| 00:08 | Transition into `Where are you on your journey?` (back to dark). |
| 00:09-00:11 | Journey: 4 radio cards, first preselected with gold border + gold filled radio. |
| 00:12 | "Scripture, taught out loud." Icon image bleeds off the top ~30%, feature list below with right-aligned meta labels (`AUDIO`, `EN·FR·RO`, `SYNCED`). |
| 00:14 | "Choose your calendar." 2 radio cards. |
| 00:16 | "Your path to theosis." 4 reminder toggles in one grouped card, each with a gold circular icon chip. |
| 00:18 | "Choose your prayer rule." 2 cards, second carries a `RECOMMENDED` pill and is preselected. |
| 00:20-00:23 | Social proof. Laurel "#1 Orthodox App", 4.9 / 5,000+ reviews, **auto-rotating testimonial** with avatar chips as pagination. `Enter Athon`. |
| 00:24 | "Your Practice Begins Today." `DAY 1` pill over a mosaic hero, 6-step checklist with only step 1 active. Gold gradient CTA + `I'll explore first` text link. |
| 00:26 | **Home.** Cinematic chandelier hero ~60% of viewport, 4 quick-action pills, maroon `TODAY'S WORD` audio card, tab bar. |
| 00:28 | Home → Saints. |
| 00:29-00:31 | Saints. Patron saint card, search, month chips, 1,093-row list, sticky `Get Full Access` banner. |
| 00:32-00:36 | Paywall (full-screen). |
| 00:38-00:41 | Saints list, scrolling. |
| 00:42 | My Parish. Photo cards with jurisdiction badges (`GOA`, `ROCOR`). |
| 00:45 | Bible (Genesis 1) with a bottom `Read with the Holy Fathers` upsell sheet. |
| 00:46 | Bible reading, sheet dismissed. |
| 00:49-00:51 | Explore. Segmented control, category chips, horizontal card rails, locked cards with a padlock. |
| 00:52 | Home, scrolled. Verse over the hero, `ORTHODOX DAILY` rail below. |

---

## 3. Animation inventory

### 3.1 The core primitive: an opacity-only staggered cascade

This is the finding. Athon has essentially **one** entrance animation and uses it on every screen.

Measured at 00:08.00 → 00:08.60 on the Journey screen (0.15s frame grid):

| t | State |
|---|---|
| 8.00 | Title fully resolved. Card 1 title resolved, card 1 subtitle ghosted. Cards 2/3/4 progressively fainter; card 4 barely visible. |
| 8.15 | Card 1 crisp with border. Card 2 title crisp, subtitle ghosted. Card 3 title readable. Card 4 title faint. |
| 8.30 | Card 2 subtitle in. Card 3 subtitle faint. Card 4 subtitle nearly invisible. |
| 8.45 | Card 4 subtitle appearing. |
| 8.60 | All settled. |

Reading off those frames:

- **Total cascade: ~600 ms** across 4 cards plus header.
- **Per-element duration: ~300-350 ms.**
- **Stagger interval: ~60-80 ms.**
- **Property: opacity only.** Element positions are pixel-identical across 8.00, 8.15, 8.30 and 8.60. There is **no y-translate, no scale, no slide.**
- The cascade is not just per-card: within a card, the title resolves before the subtitle. So the stagger is per **text node**, not per card. That is why it reads as "the page is developing" rather than "a list is animating in".
- Easing looks decelerating (most of the alpha change happens early), consistent with an ease-out.

The same cascade appears on the Saints list at 00:28.15-00:28.60, on the onboarding checklist at 00:24, and on the Explore rails at 00:49.

**Why it looks expensive:** it is the cheapest possible animation, applied with total consistency and at a slow enough stagger that the eye tracks the reading order. Most apps do a 200ms fade on the whole container. Athon fades ~10 nodes at 70ms apart, so the screen resolves the way you would read it.

### 3.2 Route / tab transition: a full cross-dissolve

Measured at 00:27.85 → 00:28.15 (Home → Saints):

- 27.85: Home fully settled.
- 28.00: both screens composited at roughly 50/50. Home's verse text and Saints' month chips are simultaneously legible.
- 28.15: Saints screen opaque, cascade beginning.

So: **~300 ms cross-dissolve, no slide, no shared-element morph.** The tab bar and header do not animate through it; the active tab's icon and label just change color.

The same dissolve runs the onboarding transitions. At 00:07.85 (light `Behind Athon` → dark Journey) the two screens overlap into a visible neutral grey wash. They did not hide it or mask it. A straight cross-dissolve between a cream screen and a black screen passes through grey, and Athon shipped it that way.

The destination's cascade starts **as the dissolve finishes**, not during it. Dissolve then cascade, sequentially. That is what prevents the "everything moving at once" mush.

### 3.3 Skeletons participate in the cascade

At 00:28.15 the Saints screen shows grey rounded-rect skeleton rows, and **the skeletons themselves are staggered**: row 1 bright, row 2 dimmer, row 3 barely visible. At 28.30 rows 1 and 2 are both bright. At 28.60 real content replaces them and the real rows run the same stagger (Basil crisp, Sylvester fading in).

So the sequence is: dissolve → staggered skeletons → staggered real content. There is never a hard pop, and the loading state uses the same motion vocabulary as the loaded state. The header, patron-saint card, search field and month chips render immediately with real content; only the list body is skeletonized.

### 3.4 Bottom-of-list fade mask

On the Saints list, the last row above the sticky `Get Full Access` banner is always partially faded (Theodota at 00:30, Ammon at 00:38). It is not a stagger that never finished, it is a **persistent gradient mask** roughly 120px tall sitting above the sticky banner. Content dissolves into the banner instead of being hard-clipped by it. Cheap, and it does a lot of work.

### 3.5 Hero parallax

Between 00:27.55 and 00:27.85 on Home, the chandelier photo drifts up ~15px while the `DAILY VERSE` pill and verse text stay fixed. Continuous slow drift on a static screen, not scroll-linked at that moment. At 00:52, scrolled, the hero has moved at a different rate than the text over it, so there is also a scroll-linked parallax.

### 3.6 Testimonial carousel

At 00:20 chip `A` is active; at 00:22 chip `R` is active and the quote text is mid-swap (ghosted, both quotes briefly overlapping). Auto-rotating on roughly a 2s interval. The avatar chips act as pagination: the active chip is **filled gold and scaled up**, inactive chips are dim outlined circles. A `+5K MORE` pill closes the row. Quote swap is the same cross-dissolve, not a horizontal slide.

### 3.7 Selection state

Selected radio cards (Journey, Calendar, Prayer Rule) get: gold 1px border, a very slightly lighter card fill, and a gold filled radio dot. Unselected cards are borderless with a dim outlined circle. The change appears to be a color transition only, no scale bump. Consistent across every choice screen.

### 3.8 Onboarding progress bar

A ~2px gold bar pinned to the absolute top of the viewport, above the back button, growing left to right across the 9 onboarding steps. No labels, no step counter. Visible at 00:04 through 00:24.

### 3.9 Settings drawer (from the still)

The settings screenshot shows a **side drawer** over a dimmed backdrop, with a sliver of the underlying screen visible at the right edge. Not a full route. Contents: gold small-caps letterspaced section labels (`ACCOUNT`, `SETTINGS`, `COMMUNITY`), rows with gold circular icon chips and chevrons, a `Premium / Unlimited AI spiritual guidance` card, a gold `★ Rate Athon` button, and an underlined `Help us improve` text link.

### 3.10 Share card (from the still)

A `Study Note` card: dim photographic church interior as the full backdrop, a small cross glyph, a centered serif heading, body copy, and a `✦ Orthodox Study Bible` attribution line. Progress segments at the top (story-style), close at top-left, share at top-right. This is a purpose-built share artifact, not a screenshot of a reading screen.

---

## 4. The design language behind it

Five things are doing the work:

1. **One curve, one duration, everywhere.** Nothing in 54 seconds uses a different motion idiom. No spring here and ease-out there. That consistency is most of the perceived quality.
2. **Opacity over transform.** Almost nothing slides. This is why it never feels busy, and it is also why it runs smoothly on a mid-range Android.
3. **Sequential, not simultaneous.** Dissolve completes, then the cascade starts. Two phases, never overlapping.
4. **Stagger follows reading order.** Top to bottom, title before subtitle. Motion reinforces hierarchy instead of competing with it.
5. **Photography carries the emotion, motion stays quiet.** The hero images, the gold-on-near-black palette, and the serif display face do the atmospheric work. Motion is deliberately unremarkable. The restraint is the point.

Palette and type, for reference: near-black `#0B0A08`-ish grounds, warm gold `#C9A961`-ish accents, cream text, a maroon accent card, one full theme inversion to cream/navy for the institutional screen. Display face is a high-contrast serif in small-caps-ish styling; body is a neutral sans.

---

## 5. Purify gap analysis

Purify's motion system today (verified against the current tree):

| Athon technique | Purify today | Gap |
|---|---|---|
| One easing, one duration, tokenized | `app/globals.css` hardcodes `cubic-bezier(0.22, 1, 0.36, 1)` ~25 times; no `--ease-*` or `--duration-*` in the `@theme` block; durations are literal ms scattered inline | **No motion tokens.** Biggest structural gap. 36 keyframes with no shared vocabulary. |
| Staggered opacity cascade on every screen | `.reveal-rise` (7 files), `.rise-in` (3 files), `.appnav-in` (staggered, but only in `components/nav/AppNav.tsx`, only on mount) | The primitive exists in one place and was never generalized. No `stagger` utility. |
| 300ms cross-dissolve between routes | `app/(app)/template.tsx` runs `.route-fade`, 200ms opacity-only, **no exit phase** | Closest thing we have. Correct instinct, half the duration, and no destination cascade after it. The transform-free choice is already documented and correct (a transform on the route root creates a containing block and displaces fixed descendants like the tab bar). |
| Skeletons in the same motion vocabulary | Every route `loading.tsx` (`bible`, `calendar`, `councils`, `history`, `saints`, ...) hand-rolls `bg-paper/10 animate-pulse` divs; ~12 client components do the same | **No shared `Skeleton` component.** Pulse, not cascade. Content pops in hard when it arrives. |
| Bottom-of-list fade mask | Not present | Missing. Purify has sticky bottom chrome (tab bar, reader pills) that hard-clips content. |
| Hero parallax / Ken Burns | `.cinema-drift`, `.cinema-kenburns`, `.account-parallax` exist and already use `@supports (animation-timeline: view())` | **Already at parity or ahead.** Not adopted broadly, but the technique is there. |
| Animated tab indicator | `components/nav/MobileTabBar.tsx` slides a highlight compartment, `transition-[left,opacity] duration-300 ease-out motion-reduce:transition-none`, with a nested-rAF trick so it glides rather than jumps after remount | **Purify is ahead of Athon here.** Athon's tab bar does not animate at all. Keep this. |
| One sheet implementation | Three: `components/ui/Sheet.tsx`, `components/bible/MobileCommentarySheet.tsx`, `components/florilegium/FlorilegiumPickerSheet.tsx` | Three timings, three behaviours. `Sheet.tsx` and `ConfirmDialog.tsx` also animate without a reduced-motion check. |
| Haptics on selection | Duplicated inline in `components/history/TimelineFastScroll.tsx` and `components/prayers/PrayerRope.tsx` (same dynamic-import pattern both times) | No shared `useHaptics`. |

Two constraints any adoption must respect, both already documented in the codebase:

- **No `backdrop-filter`.** `app/globals.css` (~1675, GiftBox header) records that the Android WebView bleeds imagery through it and drops frames; the gift sequence animates transform and opacity only, deliberately. `MobileTabBar` follows this. Note that `components/ui/Sheet.tsx:109` currently violates it with `backdrop-blur-sm`.
- **`prefers-reduced-motion`.** CSS coverage is already thorough (24 blocks in `globals.css`). JS coverage is thin: `matchMedia` is re-implemented locally in `components/admin/CountUp.tsx`, `components/history/EventHero.tsx`, `components/prayers/AudioPlayer.tsx`, `components/prayers/PrayerSlideshow.tsx`.

Convenient fact: Athon's entire motion language is opacity-only, which means **every single technique here is compatible with Purify's existing WebView constraints.** Nothing below requires a new dependency, a transform on a route root, or a backdrop filter.

---

## 6. Ranked adoption list

Ordered by value per unit of effort. Each item is scoped to be independently shippable.

### 1. Motion tokens in `@theme` — S effort, no risk
Add `--ease-out`, `--ease-emphasized`, `--duration-fast|base|slow`, `--stagger-step` to the `@theme` block in `app/globals.css`, then replace the ~25 hardcoded `cubic-bezier(0.22, 1, 0.36, 1)` occurrences. Purely mechanical. Everything below depends on this, and it is the single change that makes future motion work consistent by default.

### 2. A `stagger` utility — S effort, low risk
One class plus CSS custom-property index (`.stagger > * { animation-delay: calc(var(--i) * var(--stagger-step)) }` or `nth-child` up to ~12), driving an opacity-only fade at ~320ms with a ~70ms step. Generalize what `.appnav-in` already does. Highest visible payoff of anything on this list: it is the entire reason Athon reads as premium.

### 3. Shared `Skeleton` component + cascade — M effort, low risk
One component, replacing the hand-rolled `animate-pulse` divs in the 7 route `loading.tsx` files and ~12 client components. Apply the same stagger to skeleton rows and to the real rows that replace them. Kills the content-pop.

### 4. Extend `.route-fade` to 300ms and chain the cascade — S effort, medium risk
Bump `app/(app)/template.tsx`'s fade from 200ms to ~300ms and have page content run the stagger after it. Medium risk only because route transitions touch every screen; verify against the fixed-descendant issue the existing comment documents. Do **not** add a transform.

### 5. Bottom-of-list fade mask — S effort, no risk
A reusable gradient mask utility for lists that sit under sticky bottom chrome. Immediately applicable to the Saints list, Bible chapter, History timeline, and Shop grid.

### 6. `useReducedMotion` and `useHaptics` hooks — S effort, no risk
Extract the four duplicate `matchMedia` implementations and the two duplicate haptics implementations. Then wire `useReducedMotion` into `components/ui/Sheet.tsx` and `components/ConfirmDialog.tsx`, which currently animate unconditionally.

### 7. Consolidate the three sheets — M effort, medium risk
Fold `MobileCommentarySheet` and `FlorilegiumPickerSheet` into `components/ui/Sheet.tsx`. Remove the `backdrop-blur-sm` on line 109 while doing it. Medium risk: three call sites with different dismiss and scroll-lock expectations.

### 8. Progress bar on onboarding — S effort, no risk
A thin gold top-edge bar across Purify's onboarding steps. Small, but it is the kind of detail that reads as finished.

### Considered and rejected

- **Athon's cream/navy theme inversion.** Striking, but the cross-dissolve through grey is a visible artifact and Purify's palette work (deep-indigo + sage) is a settled decision.
- **A motion library (framer-motion et al).** Every technique here is plain CSS. Adding a dependency for opacity fades would cost bundle size and WebView performance for nothing.
- **Shared-element / view transitions for navigation.** Athon does not do this. Purify already has `::view-transition-*` tuned in `globals.css` and one call site in `components/reader/ReaderPrefs.tsx`; worth revisiting later, but it is not what makes Athon feel good and it is a much larger change.

---

## 7. Reproducing this

The `/watch` skill is installed at `~/.claude/skills/watch` with ffmpeg, yt-dlp and Python 3.12 on PATH. To re-derive any measurement above:

```bash
python ~/.claude/skills/watch/scripts/watch.py "<video>" --no-whisper --detail transcript --timestamps 8.00,8.15,8.30,8.45,8.60 --resolution 380
```

Scene detection is too conservative for UI screen recordings (it found 8 frames in 54 seconds). Use `--detail transcript --timestamps` with an explicit uniform grid instead, which bypasses the 2 fps cap and gives exact control over sampling density.
