# Domestic Church Matrix and Catechumen Corner: structural specification

| | |
|---|---|
| Status | Draft for owner review. Not approved for build. |
| Date | 2026-09-25 |
| Scope | Structure, layout, interface rules and system constraints for two surfaces: the Domestic Church Matrix (family accounts) and the Catechumen Corner. |
| Not in scope | All copy and all liturgical, doctrinal or catechetical content. Every string is a typed placeholder (section 0.1). This document creates no route, component, table or migration. |
| Verification | Contrast ratios, font coverage, font payload, sheet budget and fold budget were measured, not estimated. Method in section 0.3 and Appendix A. Every claim about shipped code cites the file. |

## Summary for the owner

The brief is buildable. Five findings decide how. The second is solved inside this spec; the other four need your ruling before build starts.

1. **The palette collides with what ships.** Purify already encodes liturgical state in color twice: day tones in `lib/calendar/tone.ts` (a fast day renders crimson) and a hue for each of ten named seasons in `SEASON_TONES`. A module-local gold/violet system would give one app two color languages for the same fact. Decision D-01.
2. **Mount Athos Violet fails as a line or as text.** #4A2E80 on the dark base measures 1.78:1; WCAG needs 3:1 for a boundary and 4.5:1 for text. It passes as a fill under light text (9.77:1). This spec adds two same-hue tints for lines (#7953C1) and text (#9375CD).
3. **Cinzel serves Latin only.** Purify ships 21 locales, including Greek, Russian, Ukrainian, Serbian, Bulgarian and Georgian. Saint names set in Cinzel would lose the face in exactly the languages most likely to read them. Decision D-04.
4. **The Sync Feed, as briefed, would publish per-person spiritual compliance inside a family.** `CONTRIBUTING.md` forbids any figure or public count about prayer. Per-person fasting visibility is a pastoral question. This spec limits the shared feed to Scripture reading (and later, owner-approved custom tasks), makes visibility member-controlled, and forbids nudges. Decision D-06.
5. **Two hard gates sit outside design.** Children under 13 cannot hold accounts (Terms, section 1), so a family product needs managed child profiles: children's data plus religious data, which is special-category data under GDPR Article 9. And "Ask a Priest" carries anonymity, safeguarding and liability exposure that no interface can solve. Both need legal review and named clergy before build (D-07, D-08, D-10).

Also found in passing, and folded into the plan: the shipped fasting engine has nine confirmed-defect rows awaiting clergy sign-off (`docs/editorial/fasting-rule-matrix.md`, section A). A household card would repeat those errors to a whole family with more authority than a personal calendar does, and the mode resolver reads the same engine, so the fasting row and the mode color are both gated on that sign-off.

---

## 0. Conventions

### 0.1 Placeholder grammar

| Prefix | Meaning | Source of truth | Review path |
|---|---|---|---|
| `[TXT_*]` | Fixed interface copy: headings, labels, helper and error text | `lib/i18n/messages/*.json`, all 21 catalogs | Owner, house voice |
| `[EDT_*]` | Liturgical, doctrinal or catechetical content: season titles, saint names, fasting explanations, briefings, definitions, answers | Editorial tables with a review state (section 3.7.1) | Clergy and editorial queue, `docs/editorial-standards.md` |
| `[DAT_*]` | Runtime data: names, dates, states, positions | Database or calendar engine | None, computed |
| `[USR_*]` | User-written text: custom task titles, questions | User input, validated server-side | Moderation where another person reads it |
| `[ICN_*]` | Icon slot | `components/ui/icons/`, `components/calendar/fastMeta.tsx` | Owner |
| `[AUD_*]` | Audio asset hook | Per-entry URL, cached on first play | Editorial |
| `[CONST]` | Tunable system constant, shown with a recommended value | Code constant | Owner |

Aliases used only inside wireframes, where width is tight:

| Alias | Full slot |
|---|---|
| `[TSK_n]`, `[TSK_n_FULL]` | `[DAT_TASK_LABEL_n]`, short and full-length forms |
| `[ICN_FK]` | `[ICN_FAST_KIND]` |
| `[ICN_ND]` | `[ICN_NAMEDAY]` |
| `[EDT_Rn]` | `[EDT_RESTRICTION_n]` |
| `[EDT_Tn]` | `[EDT_TERM_n]` |
| `[TXT_MGD]` | `[TXT_MANAGED_TAG]` |
| `(AB)` | `[DAT_MONOGRAM]`, 32dp |

Wireframe glyphs: `▓` accent fill, `░` scrim, `[x]` completed, `[ ]` pending (in a form: an unchecked box), `[-]` not shared, `.` not assigned (renders nothing), `[--o]` toggle on, `[o--]` toggle off, heavy border `┏━┓` = the screen's one attention element, dashed box `╭┄╮` = secondary button, solid box = primary button. Right-margin numbers are heights in dp.

Rules:

1. Placeholders are design-time only. At runtime an empty slot renders nothing: no placeholder, no dash, no "coming soon". This is already house law ("empty sections render nothing rather than placeholders", `docs/editorial-standards.md`, line 3).
2. No `[EDT_*]` slot may carry AI-generated text in production. AI may draft into the review queue only (`docs/editorial-standards.md`, content classes table).
3. Every `[TXT_*]` key exists in all 21 catalogs before its surface ships. A lone English string in a translated screen is a known failure here (see the `nav.shop` note in `components/nav/MobileTabBar.tsx`).

### 0.2 Decision register

Nothing marked `requires-*` is decided by this document. Build starts after these are ruled on.

| ID | Decision | Recommendation | Gate |
|---|---|---|---|
| D-01 | Scope of the Dual Liturgical Palette | Adopt it as one app-wide mode layer driven by the shipped calendar engine, or do not adopt it. Module-local accents contradict `toneFor()` and `SEASON_TONES` in `lib/calendar/tone.ts`, which already assign their own hues, one of them a violet for a named season. | requires-owner |
| D-02 | Base #121212 vs shipped `--color-night` #101013 | One token. Either change `--color-night` app-wide or keep #101013 here. A per-module base draws a seam at every route change and under the tab bar. | requires-owner |
| D-03 | Text #F9F6F0 vs shipped `--color-paper` #FFFFFF | Same rule. Changing the token re-inks every `text-paper/NN` utility at once; a module-local value does not. | requires-owner |
| D-04 | Typefaces | Map the brief's roles onto the shipped stacks (section 1.4). Do not add Cinzel. Inter vs DM Sans is already an open owner ASK, raised for admin numerics (`docs/DECISIONS.md`; v1.4 `MASTER.md`, Phase 0 item 3); decide it once, app-wide. | requires-owner |
| D-05 | Mode mapping: which calendar states render FEAST, FAST, ORDINARY, and precedence on overlap | Leave the mapping to clergy (table in 1.3). Note the shipped precedent: `toneFor()` resolves a feast before a fast. | requires-editorial-review |
| D-06 | Which task kinds may appear in the shared feed | Phase 1: the Scripture reading plan only. Prayer tasks never (`CONTRIBUTING.md`, "On prayer, no figures at all"). Per-person fasting status never without clergy sign-off. Custom tasks in a later phase, after a ruling on prayer-like free text. | requires-owner, requires-editorial-review |
| D-07 | Managed (no-login) profiles for children under 13 | Required for the product to serve families. Minimal fields only (2.8.8). | requires-legal |
| D-08 | Lawful basis for religious data | Explicit consent at household creation and at each join, recorded with a version. Privacy policy update. | requires-legal |
| D-09 | Is Family gated on Purify Plus; store family sharing | Out of design scope. Pricing and subscription terms are an owner stop condition. | requires-owner |
| D-10 | Ask a Priest: who answers, how clergy are verified, response window, safeguarding duties, attribution, Terms section 3 ("Not professional advice") | Do not ship without named clergy, a moderation rota and a legal pass. | requires-owner, requires-legal, clergy |
| D-11 | Ask a Priest answer delivery | Private receipt on the device (default). A public archive only with per-question opt-in. | requires-owner |
| D-12 | Household limits | 1 household per user, 2 admins, 12 members, 3 daily tasks. | requires-owner |
| D-13 | Freshness transport | Visibility-aware polling (2.8.6). Supabase Realtime is a separate infrastructure decision with prerequisites. | requires-owner only if Realtime is wanted |
| D-14 | Placement | Household under the Community tab; the Corner as a Discover tile and route. Not a seventh tab: the bar already carries five or six. Optional Today entry card is a separate call. | requires-owner |
| D-15 | 35% sheet vs the reader's inline gloss | Apply the sheet rule to these two modules only. Leave `GlossedText` inline; its inline pattern is a documented decision (a popover lands under the thumb). | requires-owner |
| D-16 | Relationship to v1.4 "Today's Catechism" (`docs/plans/v1.4/catechism.md`), which plans completion counts and collection badges | Siblings, not merged. The Corner may deep-link into catechism content but never displays its completion state or badges. Share one citation resolver (3.7.1). | requires-owner |

### 0.3 What was measured

| Claim | Method | Result |
|---|---|---|
| Contrast of every token pair | WCAG 2.x relative luminance, script in Appendix A | Section 1.2 tables |
| Script coverage of Cinzel, Playfair Display, Inter and the shipped faces | `fonts.googleapis.com/css2` subsets served, 2026-09-25 | Section 1.4 |
| Payload of the brief's faces | Sum of every woff2 subset served (the native export bundles all subsets, `app/layout.tsx`, lines 56 to 61) | Cinzel 40 KB, Playfair Display with italics 185 KB, Inter 219 KB |
| 35% sheet content window | Viewport arithmetic on six real phone sizes | Appendix B |
| Primary action above the fold | Native chrome heights from `MobileTopBar` (48) and `--tab-bar-h` (86) | Appendix B |

### 0.4 Constants register

Recommended values. Each is a named code constant, never a literal at the call site.

| Constant | Recommended | Governs | Section |
|---|---|---|---|
| `[MAX_MEMBERS]` / `[MAX_ADMINS]` | 12 / 2 | Household size and co-admins | D-12 |
| `[MAX_DAILY_TASKS]` | 3 | Matrix columns; fits 360dp with 48dp cells | 2.5 |
| `[NAMEDAY_WINDOW_DAYS]` | 7 | How far ahead row A3 looks | 2.3 |
| `[NOTICE_WINDOW_DAYS]` | 3 | When the banner announces a mode change | 1.6 |
| `[SEGMENT_MAX]` | 30 | Discrete segments before the tracker goes continuous | 2.4 |
| `[POLL_MS]` / `[STALE_MS]` | 15000 / 45000 | Refresh cadence; when the feed says it is stale | 2.8.6 |
| `[GRACE_CUTOFF_LOCAL]` | 03:00 household time | Last moment yesterday can still be checked in | 2.8.4 |
| `[OUTBOX_MAX]` | 20 | Offline check-ins held on the device | 2.8.7 |
| `[INVITE_TTL_HOURS]` | 72 | Invite lifetime | 2.8.2 |
| `[RETENTION_DAYS_AFTER_PLAN]` | 30 | Check-in deletion after a plan ends | 2.8.8 |
| `[VACANCY_DAYS]` | 30 | Admin vacancy before the household is deleted | 2.8.8 |
| `[DEF_SHORT_MAX]` / `[DEF_LONG_MAX]` | 110 / 1200 characters | Sheet definition (derived from Appendix B) / full entry | 1.7, 3.5 |
| `[MAX_CHIPS]` | 12 | Chips in the grid before "all terms" | 3.4 |
| `[BRIEFING_TITLE_MAX]` / `[MAX_BLOCKS]` | 60 characters / 4 | Briefing title and block count | 3.3 |
| `[BLOCK_MAX_CHARS]` / `[BLOCK_PREVIEW_CHARS]` | 600 / 240 | Block body, full and on the card | 3.3 |
| `[BRIEFING_WINDOW_WEEKS]` | 8 | Briefings baked into the native bundle | 3.7.2 |
| `[ASK_MIN]` / `[ASK_MAX]` | 20 / 1200 characters | Question length | 3.6 |
| `[ASK_RATE]` / `[QUEUE_CAP]` | 3 per 24h per key / 200 untriaged | Abuse and backpressure | 3.7.4 |
| `[ANSWER_RETENTION_DAYS]` / `[UNANSWERED_EXPIRY_DAYS]` | 30 / 60 | Question and answer deletion | 3.7.4 |

---

## 1. System core

### 1.1 Reconciliation with the shipped design system

| Brief rule | What ships today | Consequence if built as briefed | Recommendation |
|---|---|---|---|
| Base #121212, "absolute pitch-black" | `--color-night` #101013, `themeColor` #101013 | #121212 is not pitch black, and that is correct: pure #000 smears on OLED and seams against the ramp (documented at `--color-night-deep`). But two near-blacks side by side read as a seam. | D-02 |
| Text #F9F6F0 | `--color-paper` #FFFFFF at alphas | Warm text in two modules, white text everywhere else. | D-03 |
| Byzantine Gold #D4AF37 | `--color-festal` #D4AF37, "real liturgical gold, for feast marks only" | None. Identical value. | Reuse `--color-festal`; do not redeclare. |
| Violet #4A2E80 for fasting | Fast days render crimson (`toneFor`); `FAST_DOT` colors each `FastKind`; a hue per named season | Same fact, two colors, depending on the screen. | D-01, and the line/ink tints in 1.2 |
| Cinzel / Playfair Display | Lora (serif), DM Serif Display (display), DM Sans (sans), Noto per-script chains | Loss of face in 9 locales; about 444 KB more per install | D-04, section 1.4 |
| Inter / System UI | DM Sans with Noto chain | Third sans in the product | D-04 |
| Bold only for biblical entities, tracking numbers, parent-assigned tasks | Global unlayered `h1, h2 ... h6 { font-weight: 700 }` (`app/globals.css`, lines 511 to 519) | Every heading is bold, which the brief forbids | Scoped override, section 1.4 |
| 35% bottom sheet for every popup | `components/ui/Sheet.tsx`: content-sized to `max-h-[85dvh]`; no focus move, no focus trap, no focus return; close button 40px | A second sheet primitive, or an inaccessible one | Extend the one primitive, section 1.7 |
| Dotted underline for terms | `GlossedText` already marks terms with a dotted underline and expands inline | One affordance, two behaviors across the app | D-15 |
| No secular gamification | `CONTRIBUTING.md`, "Reminders and streaks": no figures on prayer; a strict six-clause bar on everything else | None; the brief and the house rule agree. The rule set in 1.8 is derived from it. | Adopt 1.8 |

### 1.2 Color tokens and semantic lock

Declared once in the `@theme` block of `app/globals.css`, never as literals in components.

| Token | Value | Role | Measured |
|---|---|---|---|
| `--color-night` (shipped) | #101013, or #121212 per D-02 | Base | |
| `--color-night-soft` (shipped) | #1D1D20 | Cards and sheet surface | |
| `--color-paper` (shipped) | #FFFFFF, or #F9F6F0 per D-03 | Primary text; the primary button fill | Alabaster on #121212: 17.37:1 |
| `--color-festal` (shipped) | #D4AF37 | Feast mode accent; completed state; toggle on; celebratory heading | 8.91:1 on #121212; 8.00:1 on #1D1D20 |
| `--mode-fast-fill` (new) | #4A2E80 | Fast mode fills only | Alabaster on it: 9.77:1 |
| `--mode-fast-line` (new) | #7953C1 | Fast mode outlines and boundary rules | 3.06:1 on #1D1D20; 3.41:1 on #121212 |
| `--mode-fast-ink` (new) | #9375CD | Fast mode text or small icons, if ever needed | 4.54:1 on #1D1D20; 5.06:1 on #121212 |
| `--mode-accent` (new, resolved at runtime) | festal, or fast-line, or paper at 0.35 | The one variable every mode-aware element reads | |
| `--mode-fill` (new, resolved at runtime) | festal, or fast-fill, or none | Card A banner fill | |

The two new violet tints keep the brief's hue (260 degrees, 47% saturation) and move only lightness, to the first value that clears each threshold.

Semantic lock:

| Color | Allowed | Forbidden |
|---|---|---|
| Gold | Feast mode rule and banner; completed glyph; toggle on-state; celebratory heading | The primary button (it would read as "done"); warnings; body text |
| Violet fill | Fast mode banner and containers | Text; outlines; icons under 24dp |
| Violet line | Fast mode outlines, boundary rules, the fast tab indicator | Fills behind body text |
| Alabaster solid | The single primary button per screen; primary text | Any status meaning |
| Alabaster at 0.60 | Secondary text (6.75:1) | None |
| Alabaster at 0.35 | Non-text only: dividers, pending ring, dotted underline, attention border (3.07:1) | Any text: 0.45 already fails at 4.30:1 |

Two collisions in the brief, resolved:

1. **Gold means both "feast season" and "completed".** Season is carried only by full-bleed shapes (the 4dp mode rule and the Card A banner). Completion is carried only by a check glyph inside a 24dp disc, always paired with a text label or accessible name. Color is never the only signal; that is also shipped policy (`app/globals.css`, line 952).
2. **The brief reserves gold for completed states, so the primary action cannot be gold.** Primary is an Alabaster fill with a night-colored label, which is the shipped dark-surface convention ("white pills/fabs", `app/globals.css`, lines 69 to 72).

A gap in the brief, filled: the calendar has days that are neither feast nor fast. **ORDINARY** mode renders the mode rule in Alabaster at 0.35 and no banner fill. Without a third state the resolver has to misreport one of the other two.

Reading modes: Candlelight, Monastery and Parchment remap the palette only while a reader surface is mounted (`app/globals.css`, lines 1334 to 1345). Neither module mounts one in this spec. If the full briefing view ever does, the mode tokens need Parchment remaps, exactly as `--color-festal` already remaps to #8A6A12 there.

### 1.3 Mode resolver

One pure function feeds both modules, and the calendar too if D-01 goes app-wide.

```ts
// lib/liturgy/mode.ts (proposed)
export type LiturgicalMode = "feast" | "fast" | "ordinary";

/** Pure. Inputs come only from lib/calendar/orthodox.ts:
 *  fastingStatus(day).kind, feastsOn(day), currentSeason(day),
 *  shifted by shiftForStyle(day, style) for the household's reckoning. */
export function resolveMode(day: Date, style: CalStyle): LiturgicalMode;
```

Mapping table, owned by clergy (D-05). Left blank on purpose.

| Calendar input | Mode |
|---|---|
| Each `FastKind` value | `[EDT_MODE_FOR_FASTKIND]` |
| A day for which `feastsOn(day)` meets `[EDT_FEAST_QUALIFIER]` | `[EDT_MODE_FOR_FEAST]` |
| Both rows above on one day | `[EDT_OVERLAP_PRECEDENCE]` |
| `currentSeason(day)` is non-null | `[EDT_MODE_FOR_SEASON]` |
| None of the above | `ordinary` |

Constraints: unit-tested once per `FastKind` and once per overlap case; both reckonings tested; no component computes a mode itself.

### 1.4 Typography matrix

| Role | Brief | Build with | Size | Line height | Weight |
|---|---|---|---|---|---|
| Major section banner (screen masthead) | Cinzel | `--font-display-serif` (DM Serif Display) | `--text-title`, 28px | 1.15 | 400 (its only weight) |
| Liturgical heading (season title, card title, block title) | Cinzel or Playfair | `--font-heading` (Lora) | `--text-title-sm`, 22px | 1.25 | 500 |
| Saint name, inline or in a list | Cinzel or Playfair | `--font-serif` (Lora) | inherits: 17px body, 14px rows | 1.35 | 500 |
| Scripture reference | Cinzel or Playfair | `--font-serif` (Lora) | inherits | inherits | 500; 600 on `[EDT_BOOK_TITLE]` (bold rule) |
| Briefing text blocks | Inter | `--font-sans` (DM Sans, Noto chain) | `--text-body`, 17px | 1.6 | 400 |
| Buttons, inputs, feed rows, navigation | Inter | `--font-sans` | `--text-ui`, 14px | 1.0 buttons, 1.4 rows | 500 |
| Eyebrow | Inter | `--font-sans`, uppercase, 2px tracking (the `MobileSectionLabel` style) | `--text-eyebrow`, 11px | 1.2 | 500 |
| Tracking numbers | Inter | `--font-sans`, `tabular-nums` | per slot | 1.0 | 600 (bold rule) |

Bold rule, enforced structurally: weight 600 or more appears only on slots marked BOLD in the slot tables: `[EDT_BOOK_TITLE]` (core biblical entity), `[DAT_POSITION]` (key tracking number), `[USR_TASK_TITLE]` (parent-assigned task). Because the global heading rule is unlayered, a utility class cannot lower it. Both modules wrap their root in `.lit-surface` and ship this unlayered override, which wins at specificity (0,1,1) over (0,0,1):

```css
.lit-surface :is(h1, h2, h3, h4) { font-weight: 500; }
.lit-surface h1 { font-family: var(--font-display-serif); font-weight: 400; }
```

Why not the brief's faces (Google Fonts css2, 2026-09-25):

| Face | Scripts served | Purify locales left without it |
|---|---|---|
| Cinzel | latin, latin-ext | el, ru, uk, sr, bg, ka, ar, ur, ne |
| Playfair Display | cyrillic, latin, latin-ext, vietnamese | el, ka, ar, ur, ne |
| Inter | cyrillic, cyrillic-ext, greek, greek-ext, latin, latin-ext, vietnamese | ka, ar, ur, ne |
| DM Sans, DM Serif Display (shipped) | latin, latin-ext | covered today by the Noto chains in `--font-sans` and `--font-display-serif` |

Cinzel is also a capitals face: its lowercase letters are small capitals, so a long saint's name set in it reads as all caps, which slows reading of the very names the brief wants to honor. If the owner still wants it for mastheads: Latin locales only, masthead role only, 22px minimum, never for names.

### 1.5 Layout grid and spacing

| Rule | Value | Source |
|---|---|---|
| Base unit | 4dp | |
| Outer gutter | 16dp (`px-4`) | Every mobile shell |
| Card | radius 16dp (`rounded-2xl`), 1px border paper at 0.10, padding 16dp | `components/mobile/MobileCard.tsx` |
| Card gap / section gap | 12dp / 24dp | |
| Touch target | 48dp minimum on new surfaces. Shipped icon buttons are 40px (`h-10`) and are not the model. | Android guidance |
| Directionality | Logical properties only (`padding-inline`, `inset-inline`, `margin-inline`). Progress fill, chip scroll and chevrons mirror under `dir="rtl"` (ar, ur). | `app/layout.tsx` sets `dir` per locale |
| Safe areas | `topbar-safe`, `.safe-pb`; never literal insets | `app/globals.css`, lines 226 to 330 |
| Tablet (native, 768dp and up) | Content column max 560dp, centered; sheets max 560dp wide | `native-md-*` rules |
| House style | No colored left-edge tabs on cards. Emphasis is a full hairline border and a faint fill. | `components/bible/GlossedText.tsx`, panel note |

### 1.6 The 3-Second Scanning Law, operationalized

The brief's law has three parts. Each becomes a testable rule.

| Part | Rule | Test |
|---|---|---|
| L1 Season | The 4dp mode rule under the top bar and the Card A banner (the only large colored field) are both inside the first viewport on 360x640. No other element uses a mode color over more than 5% of the viewport. | Screenshot at 360x640 |
| L2 Attention | At most one element carries the attention treatment: border steps from paper at 0.10 to paper at 0.35, and its eyebrow gains `[ICN_ATTENTION]`. No strips, badges, dots, counts or motion. Chosen by a fixed ladder; recomputed at most once per data refresh; keeps attention until its condition clears. | Unit test on the ladder |
| L3 Primary | Zero or one Alabaster-filled button per screen. Its slot does not move during a session; state changes happen in place. When nothing is required, no filled button exists: the absence is the message. | DOM query in e2e |

Attention ladder for Module 1 (first match wins):

1. The viewer has a pending check-in today: Card B.
2. The viewer is an admin and a join request waits: a single request row at the top of Section C.
3. A household nameday is today: Card A, row A3, in the celebratory treatment.
4. The mode changes within `[NOTICE_WINDOW_DAYS]` = 3: Card A banner shows `[DAT_MODE_CHANGE_NOTICE]`. This is the brief's "fasting countdown container". It is calendar information, not a figure about any person, so the house rule permits it.
5. Otherwise: nothing carries attention.

Primary ladder for Module 1: pending own check-in gives `[TXT_CHECKIN_CTA]`; an admin with no active plan gives `[TXT_ASSIGN_PLAN_CTA]`; otherwise none.

Measured on the smallest supported native viewport (360x640, Appendix B): the default state puts the primary button's bottom edge at 388dp of 458dp visible, a 70dp margin. A separate attention strip would cut that margin to 2dp, which is why attention is a treatment on an existing element and never a new row.

Layout stability: fixed row heights; skeletons at final size (`components/ui/Skeleton.tsx`); first paint from the last cached state, marked stale until refreshed.

### 1.7 The 35% bottom-sheet pattern

Built as a fixed-detent variant of the one shared primitive, `components/ui/Sheet.tsx`, not as a second sheet.

| Property | Rule |
|---|---|
| Height | `height: 35vh; height: 35dvh;` in that order (fallback first). Fixed, not content-sized, no other detents. The body scrolls inside. |
| Width | Full-bleed on phones; max 560dp centered on tablets. |
| Surface | `--color-night-soft`, 1px top border paper at 0.15, top radius 24dp. The shipped sheet uses `bg-night`, the same as the page it covers; on a dark UI, elevation is shown by a lighter surface, not a shadow. |
| Scrim | Flat `--color-night` at 0.70. No `backdrop-filter`: it bleeds and drops frames in the Android WebView (documented in `Sheet.tsx`). |
| Anatomy | Handle 20dp (4x40 pill, paper at 0.25, decorative). Header 48dp: title, at most one action, close button 48x48. Optional caption 20dp. Body scrolls. Bottom padding 20dp plus `env(safe-area-inset-bottom)`. |
| Dismiss | Scrim tap dismisses on pointer-up with no confirmation. Also the close button, Escape, and Android back (`useAndroidBack`, already wired). "Instantly" means the sheet is inert and focus has returned on the same frame; the 200ms slide is visual only and drops to 0ms under reduced motion. |
| Focus | On open, focus moves to the sheet title (`tabindex="-1"`). Tab is trapped inside (`lib/ui/focusTrap.ts`, which exists and is used only by admin today). On close, focus returns to the element that opened it. The shared primitive does none of these three today; fixing that is a prerequisite and benefits its eight existing callers. |
| Semantics | `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing at the title. |
| No text inputs | A soft keyboard takes roughly 40% of a phone screen, more than the sheet. Sheets hold toggles, segmented controls and buttons only. Text entry routes to a full screen. |
| No stacking | One sheet at a time; a sheet never opens a sheet. A destructive action opens `ConfirmDialog`. The counted body-scroll lock (`lib/ui/overlay.ts`) makes two overlays safe; its absence caused audit finding F-19. |
| Portal | To `document.body`, never inline (audit finding F-20). The tab bar already hides while an overlay is open. |
| Content budget | Measured window in Appendix B. Editorial limits follow from it: `definition_short` at most `[DEF_SHORT_MAX]` = 110 characters, which is three lines at 360x640. |
| Large text | At 130% text size the smallest phone shows two lines. The height stays 35%; the body scrolls, and `[TXT_READ_MORE]` opens a full-screen route. Nothing is clipped. |

### 1.8 Anti-gamification rules

The brief's ban combined with `CONTRIBUTING.md`, "Reminders and streaks" (binding). Where the two differ, the stricter wins: the house rule is stricter on prayer (no figures at all); the brief is stricter on reading, where the house bar would allow an opt-in streak.

| Permitted | Why |
|---|---|
| A state: "done today" for oneself or, with consent, for a family member's reading | "A state is not a tally" |
| A position: plan segment N of M | "A position is not a score"; reading figures clear the bar |
| The viewer's own completed plan segments on the tracker, with no figure attached | Same class as the shipped fourteen-day rhythm strip, a memory aid |

| Forbidden, in both modules | Source |
|---|---|
| Streaks, day counts, totals, personal bests, percentages per person | The brief; for prayer also "no figures at all" |
| Sorting or ranking members by completion | House rule: a visible count beside people ranks them |
| Badges, points, levels, confetti, celebratory animation | The brief; clause 4, no pressure mechanics |
| Unread counts, red dots, tab badges for household activity | Clause 4 |
| A "nudge" or "remind" button aimed at a family member | Clause 4, and coercive inside a family |
| Push or email about someone else's activity | Clause 5, no personal content in a payload |
| History of other members beyond today | Surveillance, not guidance (R-01) |
| Quiz completion or collection badges from v1.4 inside the Corner | D-16 |

### 1.9 Motion, accessibility and internationalization

| Area | Rule |
|---|---|
| Motion | House tokens only: sheet slide and state color change at `--duration-fast` (200ms) on `--ease-house`. No entrance choreography on these screens. All motion off under reduced motion. |
| Status change | Color and opacity only; geometry never changes. |
| Screen readers | Own action results through one polite live region. Others' updates are silent. Every glyph-only cell has an accessible name built from `[DAT_NAME]`, `[DAT_TASK_LABEL_n]` and the state. |
| Contrast floor | Text 4.5:1, boundaries and glyphs 3:1, against the surface they sit on (1.2). |
| Locales | Every `[TXT_*]` in 21 catalogs; ICU plurals for any count; dates through the shipped formatters (`formatLongDate`, `formatMonthDay`); names never uppercased by CSS in scripts without case. |
| Automated | Both modules join the Playwright smoke and axe suite before their flags turn on. |

---

## 2. Module 1: Domestic Church Matrix

### 2.1 Placement, routes and the native pattern

| Item | Rule |
|---|---|
| Tab | Community lights for `/household*`: add the prefix to its `matches` predicate in `MobileTabBar.tsx`. |
| Routes | `/household` (dashboard), `/household/create`, `/household/join`, `/household/plan` (admin plan editor), `/household/settings` (admin). All static. No dynamic segment anywhere: runtime ids cannot be pre-rendered by the export, which is why `campaigns/[id]` sits in the stash list of `scripts/native-build.mjs`. |
| Page shape | Server shell exporting `metadata`, plus a `"use client"` child, the pattern of `app/(app)/account/(signed)/*`. No `cookies()`, no server session read. |
| Reads | `apiFetch` to `GET /api/household/state`. No direct table reads (2.8.3). |
| Writes | `apiFetch` to the routes in 2.8.4. Each route exports `OPTIONS = corsPreflight` so the native origin can reach it. |
| Invite link | `https://purifyapp.net/household/join#t=<token>`. The token rides in the fragment, which never reaches server logs or a Referer header; the static page reads `location.hash` and posts it. Manual token entry is the fallback wherever deep links are not configured. |

### 2.2 Wireframe: default state

Fast mode shown. The viewer has not yet checked in, so Card B carries attention and holds the screen's one primary button.

```text
┌──────────────────────────────────────────────────────┐
│ status bar, safe-area-inset-top                      │
├──────────────────────────────────────────────────────┤
│ [ICN_BACK]      [TXT_HH_TITLE]            [ICN_GEAR] │  48  MobileTopBar
├──────────────────────────────────────────────────────┤
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│  4  S0 mode rule, --mode-accent (L1)
│                                                      │  12
│ ╭──────────────────────────────────────────────────╮ │
│ │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ │  56  A1 banner, --mode-fill (L1)
│ │▓ [ICN_MODE] [EDT_SEASON_TITLE]                  ▓│ │
│ │▓ [DAT_SEASON_SPAN]                              ▓│ │
│ │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ │
│ │ [TXT_FAST_EYEBROW]                    [ICN_INFO] │ │  56  A2 fasting row
│ │ [ICN_FK] [EDT_FAST_LABEL]      [EDT_R1] [EDT_R2] │ │
│ ├──────────────────────────────────────────────────┤ │
│ │ [ICN_ND] [DAT_DATE]  [DAT_MEMBER_NAME]           │ │  48  A3 nameday row
│ │          [EDT_SAINT_NAME]             [DAT_MORE] │ │
│ ╰──────────────────────────────────────────────────╯ │
│                                                      │  12
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │  ATTENTION: border paper@0.35 (L2)
│ ┃ [TXT_PLAN_EYEBROW]                    [ICN_CHEV] ┃ │  76  B1 plan header
│ ┃ [EDT_BOOK_TITLE]                                 ┃ │
│ ┃ [DAT_CHAPTER_RANGE]                              ┃ │
│ ┃ [#########|--------------]        [DAT_POSITION] ┃ │  48  B2 tracker, one target
│ ┃ ┌──────────────────────────────────────────────┐ ┃ │  48  B3 PRIMARY, paper fill (L3)
│ ┃ │              [TXT_CHECKIN_CTA]               │ ┃ │
│ ┃ └──────────────────────────────────────────────┘ ┃ │
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │
│                                                      │  24
│ [TXT_FEED_EYEBROW]                   [DAT_DAY_LABEL] │  32  C0 feed header
│ ╭──────────────────────────────────────────────────╮ │
│ │                          [TSK_1] [TSK_2] [TSK_3] │ │  32  C1 task columns (max 3)
│ ├──────────────────────────────────────────────────┤ │
│ │ (AB) [DAT_NAME] [TXT_YOU]  [ ]     [x]      .    │ │  56  C2 viewer, pinned first
│ ├──────────────────────────────────────────────────┤ │
│ │ (CD) [DAT_NAME]            [x]     [ ]     [ ]   │ │  56  C3 account member
│ │ (EF) [DAT_NAME]            [-]     [-]     [-]   │ │  56  C3 not shared
│ │ (GH) [DAT_NAME] [TXT_MGD]  [ ]     [ ]      .    │ │  56  C3 managed profile
│ ╰──────────────────────────────────────────────────╯ │
├──────────────────────────────────────────────────────┤
│ MobileTabBar (--tab-bar-h 86) + inset-bottom         │  86
└──────────────────────────────────────────────────────┘
```

Card order is fixed: A, B, C. Section C scrolls; A and B never move. The matrix is drawn at its maximum of three task columns; Phase 1 ships one (D-06).

### 2.3 Card A: Liturgical Household State

Banner variants:

```text
┌──────────────────────────────────────────────────────┐
│ FEAST                                                │
│ ╭──────────────────────────────────────────────────╮ │
│ │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ │  fill --color-festal, ink --color-night 8.91:1
│ │▓ [ICN_FEAST] [EDT_SEASON_TITLE]                 ▓│ │
│ │▓ [DAT_SEASON_SPAN]                              ▓│ │
│ │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ │
│ ╰──────────────────────────────────────────────────╯ │
│ FAST, with mode-change notice                        │
│ ╭──────────────────────────────────────────────────╮ │
│ │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ │  fill --mode-fast-fill, ink paper 9.77:1
│ │▓ [ICN_FAST] [EDT_SEASON_TITLE]                  ▓│ │
│ │▓ [DAT_MODE_CHANGE_NOTICE]                       ▓│ │
│ │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ │  notice replaces span inside [NOTICE_WINDOW_DAYS]
│ ╰──────────────────────────────────────────────────╯ │
│ ORDINARY                                             │
│ ╭──────────────────────────────────────────────────╮ │
│ │ [ICN_ORDINARY] [EDT_SEASON_TITLE]                │ │  no fill, surface --color-night-soft
│ │ [DAT_SEASON_SPAN]                                │ │
│ │┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄│ │  rule paper@0.35 replaces the fill
│ ╰──────────────────────────────────────────────────╯ │
└──────────────────────────────────────────────────────┘
```

| Slot | Content | Type | Constraint |
|---|---|---|---|
| A1 `[ICN_MODE]` | Mode icon | 24dp, ink matches banner text | Decorative; the title carries meaning |
| A1 `[EDT_SEASON_TITLE]` | Season or day title | Lora 22 / 500 | One line, ellipsis; full text in the accessible name |
| A1 `[DAT_SEASON_SPAN]` | Date span | DM Sans 12, ink at 0.87 of banner text | Replaced by `[DAT_MODE_CHANGE_NOTICE]` inside the notice window |
| A2 `[TXT_FAST_EYEBROW]` | Row label | Eyebrow | |
| A2 `[ICN_FK]` + `[EDT_FAST_LABEL]` | Today's rule, by `FastingStatus.ruleId` through the existing `calendar.fast.{ruleId}.label` catalog keys | Icon from `fastMeta.tsx` plus DM Sans 14 / 500 | Icon and text always together, never color alone |
| A2 `[EDT_R1]`, `[EDT_R2]` | Up to two restriction chips, not interactive | 28dp chips, paper at 0.35 outline in feast or ordinary, `--mode-fast-line` in fast | Needs new structured data keyed by `FastRuleId`; the engine exposes one line of text today. Overflow goes to the sheet. |
| A2 `[ICN_INFO]` | Opens the fasting sheet (2.6) | 48dp target | |
| A3 `[ICN_ND]` `[DAT_DATE]` `[DAT_MEMBER_NAME]` | Next nameday in the household within `[NAMEDAY_WINDOW_DAYS]` = 7 | DM Sans 14 | Only members with `share_nameday` on. Row renders nothing when none. |
| A3 `[EDT_SAINT_NAME]` | Patron saint, from the member's saint slug via `lib/saints` | Lora 14 / 500 | Gold when the nameday is today (celebratory heading) |
| A3 `[DAT_MORE]` | Count of further namedays in the window | `tabular-nums` | Opens a nameday sheet |

Dependencies, both hard gates:

- **Fasting row and mode color are gated on the fasting-rule sign-off.** `docs/editorial/fasting-rule-matrix.md` lists nine confirmed-defect rows in `fastingStatus()`, and `resolveMode()` reads the same function, so D-05 and that matrix are one clergy review, not two. Until it lands, Card A runs reduced: no A2 row, and the banner shows the season title with no mode color, so the card states no fasting rule at all.
- **Namedays need the household's reckoning.** The shipped name-day job computes on the new calendar only, because "a reader's reckoning is not readable here yet" (`lib/email/nameDay.ts`). The household stores `calendar_style`; A3 computes client-side through `feastsOn()` after `shiftForStyle()`.

### 2.4 Card B: Shared Family Reading Plan

| Slot | Content | Type | Constraint |
|---|---|---|---|
| B1 `[TXT_PLAN_EYEBROW]` | Label | Eyebrow; gains `[ICN_ATTENTION]` when Card B holds attention | |
| B1 `[EDT_BOOK_TITLE]` | Book, from the shipped Bible data by slug | Lora 22 / 600, BOLD | Never free text |
| B1 `[DAT_CHAPTER_RANGE]` | Today's chapters | DM Sans 17 / 400 | Computed from plan start, chapters per day and the household day |
| B2 tracker | Plan position plus the viewer's own completed segments | 8dp bar inside one 48dp target | See tracker rules |
| B2 `[DAT_POSITION]` | Segment N of M | DM Sans 14 / 600, `tabular-nums`, BOLD | ICU plural via `[TXT_POSITION_FORMAT]` |
| B3 | The check-in button | 48dp, full card width | State machine below |

Tracker rules:

- Segments are plan days. Up to `[SEGMENT_MAX]` = 30, segments are discrete with 2dp gaps; above that, a continuous fill with a position marker.
- Viewer's completed segments: gold. Today: 1.5dp Alabaster outline. Future: paper at 0.12, a decorative track. Position is also stated in text, so the track itself needs no contrast.
- No other member's completion appears on the bar.
- The whole row is one button that opens the plan sheet (2.6). Segments are narrower than 48dp, so per-segment taps are not offered.
- Built on `components/ui/ProgressBar.tsx` (already `role="progressbar"`, animates `transform` not `width`) with a `segments` prop, not a second bar.

Button states:

```text
┌──────────────────────────────────────────────────────┐
│ B3.1 pending (the screen's PRIMARY)                  │
│ ┌──────────────────────────────────────────────────┐ │  paper fill, night label
│ │                [TXT_CHECKIN_CTA]                 │ │
│ └──────────────────────────────────────────────────┘ │
│ B3.2 submitting                                      │
│ ┌──────────────────────────────────────────────────┐ │  aria-busy, inert, same size
│ │                  [ICN_SPINNER]                   │ │
│ └──────────────────────────────────────────────────┘ │
│ B3.3 completed (no primary left on screen)           │
│ ╭┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄╮ │  gold 1.5px outline, not filled
│ ┆          [ICN_CHECK] [TXT_CHECKIN_DONE]          ┆ │
│ ╰┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄╯ │
│ B3.4 completed, queued offline                       │
│ ╭┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄╮ │  outline + sync glyph
│ ┆    [ICN_CHECK] [TXT_CHECKIN_DONE] [ICN_SYNC]     ┆ │
│ ╰┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄╯ │
│ B3.5 failed (reverts to B3.1)                        │
│ ┌──────────────────────────────────────────────────┐ │  paper fill
│ │                [TXT_CHECKIN_CTA]                 │ │
│ └──────────────────────────────────────────────────┘ │
│ [ICN_ALERT] [TXT_CHECKIN_ERROR]                      │  inline, no toast
│ B3.6 admin, no active plan                           │
│ ┌──────────────────────────────────────────────────┐ │  PRIMARY, opens /household/plan
│ │              [TXT_ASSIGN_PLAN_CTA]               │ │
│ └──────────────────────────────────────────────────┘ │
│ B3.7 member, no active plan: card renders nothing    │
└──────────────────────────────────────────────────────┘
```

| State | Enters when | Leaves when |
|---|---|---|
| B3.1 pending | Own status for today is pending | Tap |
| B3.2 submitting | Tap, online | Response |
| B3.3 completed | 200 response, or state already completed | Undo from the plan sheet, or day rollover |
| B3.4 queued | Tap while offline (2.8.7) | Outbox replay succeeds (to B3.3) or is refused (to B3.5) |
| B3.5 failed | Error or refusal | Next tap |
| B3.6 no plan, admin | No active plan | Plan saved |
| B3.7 no plan, member | No active plan | Card renders nothing |

Undo is deliberately one level deep: in the plan sheet, never on the button, so a second tap cannot silently erase a check-in.

### 2.5 Section C: Household Sync Feed

The matrix: members are rows, today's tasks are columns (at most `[MAX_DAILY_TASKS]` = 3). In Phase 1 there is one column, the reading plan.

| Element | Rule |
|---|---|
| Row order | Viewer first, marked `[TXT_YOU]`; then the admin-set `sort_order`. Never by completion, never reordered by a refresh. |
| Row | 56dp: monogram `[DAT_MONOGRAM]` 32dp (initials on paper at 0.12, no photos), `[DAT_NAME]` DM Sans 14 / 500 with ellipsis, then cells. |
| Cell | 48x48 target, 24dp glyph. |
| Completed `[x]` | Gold disc, night check glyph |
| Pending `[ ]` | 1.5dp ring, paper at 0.35 |
| Not shared `[-]` | Dash, paper at 0.35, accessible name `[TXT_STATE_PRIVATE]`. Never drawn as pending: pending would say they have not done it. |
| Not assigned | Renders nothing |
| Who can tap a cell | The viewer on their own row; an admin on a managed profile's row. Every other cell is static text to assistive technology. |
| Who can tap a row | An admin on any row, or any member on their own row: opens the member sheet (2.6). |
| Header C0 | `[TXT_FEED_EYEBROW]` and `[DAT_DAY_LABEL]`, the household day. `[TXT_FEED_STALE]` appears when the last good refresh is older than `[STALE_MS]` = 45000. |

Reflow variant, used when the card is narrower than 344dp or text size is 130% or more. State words become visible; glyphs never stand alone:

```text
┌──────────────────────────────────────────────────────┐
│ [TXT_FEED_EYEBROW]                   [DAT_DAY_LABEL] │  C0
│ [ICN_STALE] [TXT_FEED_STALE]                         │  only when last sync > [STALE_MS]
│ ╭──────────────────────────────────────────────────╮ │
│ │ (AB) [DAT_NAME] [TXT_YOU]                        │ │  row height grows, min 72
│ │      [TSK_1_FULL]        [x] [TXT_STATE_DONE]    │ │
│ │      [TSK_2_FULL]        [ ] [TXT_STATE_PENDING] │ │
│ ├──────────────────────────────────────────────────┤ │
│ │ (CD) [DAT_NAME]                                  │ │
│ │      [TSK_1_FULL]        [-] [TXT_STATE_PRIVATE] │ │
│ │      [TSK_2_FULL]        [-] [TXT_STATE_PRIVATE] │ │
│ ╰──────────────────────────────────────────────────╯ │
└──────────────────────────────────────────────────────┘
```

### 2.6 Sheets in Module 1

All three follow 1.7. None contains a text input.

```text
┌──────────────────────────────────────────────────────┐
│ status bar, safe-area-inset-top                      │
├──────────────────────────────────────────────────────┤
│░░░[DASHBOARD,░dimmed]░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│  scrim --color-night/70, tap = dismiss
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│  65%
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│ ┌──────────────────────────────────────────────────┐ │  35dvh, surface --color-night-soft
│ │                       ────                       │ │  20  handle, decorative
│ │ [DAT_MEMBER_NAME]                    [ICN_CLOSE] │ │  48  header, close 48x48
│ │ [DAT_PROFILE_KIND]  [DAT_ROLE]                   │ │  20  caption
│ │ [TXT_SHARE_STATUS]                         [--o] │ │  48  toggle on = gold track
│ │ [TXT_SHARE_NAMEDAY]                        [o--] │ │  48  toggle off = paper@0.35
│ │ [TXT_ORDER]                    [ICN_UP] [ICN_DN] │ │  48  admin only
│ │ [TXT_REMOVE_MEMBER]                              │ │  48  opens ConfirmDialog
│ │ safe-area-inset-bottom                           │ │  body scrolls past the fold
└──────────────────────────────────────────────────────┘
```

| Sheet | Opened from | Contents, in order of frequency | Viewer rights |
|---|---|---|---|
| Member | A row in Section C | `[DAT_MEMBER_NAME]`; `[DAT_PROFILE_KIND]` and `[DAT_ROLE]`; share status toggle; share nameday toggle; order; remove or leave | Account members change only their own toggles. Admins change managed profiles' toggles, order, removal. An admin can never override an account member's sharing. Rows the viewer cannot act on render nothing. |
| Fasting | A2 `[ICN_INFO]` | `[ICN_FK]` `[EDT_FAST_LABEL]`; `[DAT_DATE_LONG]`; `[EDT_FAST_RULE_DETAIL]`; restriction list `[EDT_RESTRICTION_n]` with state; `[EDT_PASTORAL_NOTICE]` (required); `[EDT_SOURCE_CITATION]` | Read-only |
| Plan | B2 tracker | `[EDT_BOOK_TITLE]` BOLD; `[DAT_PLAN_SPAN]`; segment list (`[DAT_SEGMENT_DAY]`, `[DAT_SEGMENT_RANGE]`, own state); `[TXT_OPEN_READER]`; `[TXT_UNDO_CHECKIN]` (today only); admin: `[TXT_EDIT_PLAN]` routes to `/household/plan` | Undo on own and managed rows only |

`[EDT_PASTORAL_NOTICE]` is required, not optional: the engine follows one tradition, and its own header says a priest's direction takes precedence. Its wording is for clergy.

### 2.7 Screen states

```text
┌──────────────────────────────────────────────────────┐
│ status bar, safe-area-inset-top                      │
├──────────────────────────────────────────────────────┤
│ [ICN_BACK]      [TXT_HH_TITLE]                       │  48
├──────────────────────────────────────────────────────┤
│ E1 no household                                      │
│ ╭──────────────────────────────────────────────────╮ │
│ │ [TXT_HH_EMPTY_TITLE]                             │ │  display serif, 28
│ │ [TXT_HH_EMPTY_BODY]                              │ │
│ │ ┌──────────────────────────────────────────────┐ │ │  PRIMARY, /household/create
│ │ │               [TXT_CREATE_CTA]               │ │ │
│ │ └──────────────────────────────────────────────┘ │ │
│ │ ╭┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄╮ │ │  secondary, /household/join
│ │ ┆                [TXT_JOIN_CTA]                ┆ │ │
│ │ ╰┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄╯ │ │
│ │ [ICN_LOCK] [TXT_PRIVACY_SUMMARY]                 │ │
│ │            [TXT_PRIVACY_LINK]                    │ │
│ ╰──────────────────────────────────────────────────╯ │
│                                                      │
│ E2 join requested, awaiting approval                 │
│ ╭──────────────────────────────────────────────────╮ │
│ │ [TXT_PENDING_TITLE]                              │ │  no household data is shown
│ │ [TXT_PENDING_BODY]                               │ │
│ │ ╭┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄╮ │ │  secondary; no primary here
│ │ ┆             [TXT_CANCEL_REQUEST]             ┆ │ │
│ │ ╰┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄╯ │ │
│ ╰──────────────────────────────────────────────────╯ │
├──────────────────────────────────────────────────────┤
│ MobileTabBar (--tab-bar-h 86) + inset-bottom         │  86
└──────────────────────────────────────────────────────┘
```

| State | Renders | Primary |
|---|---|---|
| E1 no household | Invitation card only | `[TXT_CREATE_CTA]` |
| E2 join requested | Pending card; no household data at all until an admin approves | None |
| Loading, first ever | Skeletons at final geometry | None |
| Loading, returning | Last cached state, `[TXT_FEED_STALE]` until refreshed | As cached |
| Offline | Cached state; own check-ins queue (B3.4) | As cached |
| Admin vacancy | `[TXT_ADMIN_VACANT]` banner with `[TXT_ACCEPT_ADMIN]` for account members | `[TXT_ACCEPT_ADMIN]` |
| Error | `[TXT_LOAD_ERROR]` and `[TXT_RETRY]` inside Section C; A and B from cache | None |
| Flag off | Route `notFound()`; entry points hidden | |

Create and join are full-screen routes because they need text input: household name, timezone (IANA picker defaulting to the device zone), reckoning, and an unchecked `[TXT_CONSENT_RELIGIOUS_DATA]` checkbox that must be ticked, linking the privacy policy (D-08). Joining shows exactly what the household will see about the joiner before they confirm.

### 2.8 Technical specification

#### 2.8.1 Roles and permissions

Three profile kinds: **Household Administrator** (an account holder with role `admin`), **Linked Profile** (an account holder with role `member`, aged 13 or over per the Terms), **Managed Profile** (no login; a child's row operated by an admin).

| Capability | Administrator | Linked Profile | Managed Profile | Enforced in |
|---|---|---|---|---|
| Read household state | Yes | Yes | No login | API: caller is an active member |
| Check in self | Yes | Yes | n/a | API subject rule |
| Check in a managed profile | Yes | No | Subject only | API subject rule |
| Check in another account holder | No | No | n/a | API subject rule. No proxy completions, so no record can be written about an adult by someone else. |
| Undo, same household day | Own and managed | Own | n/a | API day rule |
| Set own visibility (`share_status`, `share_nameday`) | Yes | Yes | Set by admin | API; an admin cannot override an account member |
| Create, edit or end the reading plan | Yes | No | n/a | API role check |
| Custom tasks (later phase, D-06) | Yes | No | n/a | API role check |
| Create an invite; approve or decline a join | Yes | No | n/a | API role check |
| Create, edit or delete a managed profile | Yes | No | n/a | API role check |
| Reorder rows | Yes | No | n/a | API role check |
| Remove a member | Yes, never the last admin | No | n/a | API; 409 on last admin |
| Promote to admin | Yes; takes effect only when the member accepts | Accept only | Never | API |
| Leave the household | After handing over admin, if others remain | Yes, at any time, immediately, no approval | n/a | API. Unilateral exit is a hard rule. |
| Household settings (name, timezone, reckoning) | Yes | No | n/a | API role check |
| Delete the household | Yes, with typed confirmation | No | n/a | API |
| See another member's email or account id | Never | Never | Never | Never serialized |

#### 2.8.2 Data model (sketch)

**Sketch only, not a migration.** Merging a file in `supabase/migrations/` applies it to production (`AGENTS.md`). The SQL below needs owner sign-off before any such file is opened.

```sql
create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  timezone text not null check (char_length(timezone) between 1 and 64), -- IANA, validated by the API
  calendar_style text not null default 'new' check (calendar_style in ('new', 'old')),
  admin_vacant_since timestamptz,             -- set by trigger when the last admin row goes
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.household_members (
  id uuid primary key default gen_random_uuid(),  -- the only id other members ever receive
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade, -- null for managed profiles
  kind text not null check (kind in ('account', 'managed')),
  role text not null default 'member' check (role in ('admin', 'member')),
  status text not null default 'active' check (status in ('requested', 'active')),
  display_name text not null check (char_length(display_name) between 1 and 40),
  patron_saint text check (patron_saint is null or patron_saint ~ '^[a-z0-9-]{1,100}$'),
  share_status boolean not null default true,
  share_nameday boolean not null default false,
  sort_order smallint not null default 0,
  consent_version text,
  consented_at timestamptz,
  joined_at timestamptz not null default now(),
  check ((kind = 'account') = (user_id is not null)),
  check (kind = 'account' or role = 'member')
);
create unique index household_members_one_per_user
  on public.household_members (user_id) where user_id is not null;  -- D-12

create table public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  token_hash bytea not null unique,           -- sha256 of a 128-bit random token, shown once
  created_by uuid references public.household_members (id) on delete set null,
  expires_at timestamptz not null,            -- now() + [INVITE_TTL_HOURS] = 72
  consumed_at timestamptz
);

create table public.household_plans (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  book_slug text not null,                    -- key into shipped Bible data, never free text
  chapter_from smallint not null,
  chapter_to smallint not null,
  chapters_per_day smallint not null check (chapters_per_day between 1 and 10),
  start_day date not null,
  ended_at timestamptz,
  check (chapter_to >= chapter_from)
);
create unique index household_plans_one_active
  on public.household_plans (household_id) where ended_at is null;

create table public.household_checkins (
  household_id uuid not null references public.households (id) on delete cascade,
  member_id uuid not null references public.household_members (id) on delete cascade,
  task_ref text not null check (task_ref ~ '^(plan|task):[0-9a-f-]{36}$'),
  day_key date not null,                      -- the household's calendar day
  done_by uuid references public.household_members (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (member_id, task_ref, day_key)
);

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;
alter table public.household_plans enable row level security;
alter table public.household_checkins enable row level security;
-- No client policies on any of the five: deny by default. Every read and write
-- goes through the API with the service role (2.8.3).
```

Deliberate choices:

- **A surrogate member id.** Other members receive `household_members.id`, never `auth.users.id`, in line with the direction of `20260802_revoke_public_user_id.sql`.
- **Profile patron, copied with consent.** `profiles.patron_saint` exists (`20260914_email_consent.sql`). Other members cannot read `profiles`, so the API copies the slug onto the member row at join and on change, only while `share_nameday` is on.
- **No client RLS policies.** Visibility here is conditional per row and per column (sharing flags, today only, no ids). RLS plus column grants cannot express that cleanly, and the campaign-groups precedent already routes every read of a private roster through the service role, after a `using (true)` policy leaked every group's invite code (`20260811_campaign_groups_and_streaks.sql`).

#### 2.8.3 Read path

`GET /api/household/state?dayKey=YYYY-MM-DD&since=<version>`

- 200: `{ version, household: { name, calendarStyle, timezone }, viewer: { memberId, role }, members: [{ memberId, displayName, kind, role, sortOrder, patronSaint? }], tasks: [...], statuses: [{ memberId, taskRef, state }] }`.
- 204 when nothing changed since `version`, so a steady poll costs almost nothing.
- Statuses are for the requested household day only, and only for members with `share_status` on. There is no parameter that returns history for other members.
- The response shape is pinned by a unit test that fails if a key such as `userId` or `email` ever appears.

#### 2.8.4 Write path and validation constraints

Shared for every route, in this order: a coarse IP-keyed `rateLimited()` (as the pray route does, so a flood never reaches the auth call); `createClientFromRequest()` for the caller; the per-route limit in the table; a zod schema from `lib/security/schemas.ts` (`.strict()`); membership; role; the write with `createAdminClient()`. A caller who is not a member receives 404, never 403, so a route never confirms that a household exists.

| Method and path | Caller | Body | Rate limit (key, window s, max) | Errors |
|---|---|---|---|---|
| POST `/api/household` | Signed in, in no household | `{ name, timezone, calendarStyle, consent: true, consentVersion }` | `hh-create:{uid}`, 86400, 3 | 400, 401, 409 |
| POST `/api/household/invites` | Admin | `{}`; returns the token once | `hh-invite:{hid}`, 86400, 10 | 404 |
| POST `/api/household/join` | Signed in | `{ token, displayName, shareNameday, consent: true, consentVersion }` | `hh-join:{ip}`, 3600, 10 | 400; 404 for unknown, expired and used alike |
| POST `/api/household/members` | Admin | Discriminated union on `action`: approve, decline, remove, promote, reorder, createManaged, updateManaged | `hh-members:{uid}`, 3600, 60 | 400, 404, 409 last admin |
| POST `/api/household/me` | Member | `{ shareStatus?, shareNameday?, displayName? }` | `hh-me:{uid}`, 3600, 30 | 400 |
| POST `/api/household/plan` | Admin | `{ bookSlug, chapterFrom, chapterTo, chaptersPerDay, startDay }` or `{ end: true }` | `hh-plan:{uid}`, 3600, 20 | 400 unknown book or range |
| POST `/api/household/checkins` | Member | `{ memberId, taskRef, dayKey, state, clientMutationId }` | `hh-checkin:{uid}`, 3600, 120 | 400, 404, 409 `DAY_CLOSED` |
| POST `/api/household/leave` | Member | `{ confirm: true }` | `hh-leave:{uid}`, 3600, 5 | 409 last admin with others present |
| POST `/api/household/delete` | Admin | `{ confirm: true, nameEcho }` | `hh-delete:{uid}`, 3600, 3 | 400 on mismatch |

Check-in validation, in order:

1. **Shape.** `memberId` uuid; `taskRef` matches `^(plan|task):<uuid>$`; `dayKey` matches `^\d{4}-\d{2}-\d{2}$`; `state` is `completed` or `pending`; `clientMutationId` uuid.
2. **Subject.** `memberId` is the caller's own row, or a managed row and the caller is an admin. Anything else is 404.
3. **Day.** The server computes today in the household's timezone. `dayKey` must equal today, or yesterday while household local time is before `[GRACE_CUTOFF_LOCAL]` = 03:00. Otherwise 409 `DAY_CLOSED`. This is stricter than the pray route's plus or minus two days (`app/api/campaigns/[id]/pray/route.ts`) on purpose: there, a forged day changes only the caller's own record; here, it changes what the rest of the family sees.
4. **Task.** The plan is active on `dayKey`.
5. **Write.** `completed` inserts and lets the primary key answer (23505 means already done, returned as success). `pending` deletes. Both are idempotent.
6. **Answer.** `{ state, version, clientMutationId }`, the id echoed so the client can match replies to taps.

The client computes the day key in the household's timezone, not the device's, with `Intl.DateTimeFormat` and the stored IANA zone. A member who travels still sees the family's day.

#### 2.8.5 Status updates under the 3-Second Scanning Law

1. **Optimistic, then authoritative.** Own taps flip immediately and roll back on refusal with an inline message. Never a toast.
2. **No reordering**, ever, from any update.
3. **Fixed geometry.** Rows 56dp, cells 48dp. A change animates color and opacity only.
4. **Silence for others.** Another member's check-in arrives without toast, sound, haptic or live-region announcement.
5. **Attention settles.** The ladder in 1.6 is re-evaluated at most once per refresh, and an element keeps attention until its condition clears, so nothing flickers.
6. **The primary slot never moves.** Its content changes state in place.
7. **Stale is stated, never blanked.** Past `[STALE_MS]`, the header says so and the last known states remain.
8. **Private stays private.** Statuses of members with sharing off are never serialized, so no client bug can reveal them.
9. **Out-of-order safety.** `version` only increases; the client discards any response older than the one it holds.

#### 2.8.6 Freshness: polling, not Realtime

Poll `GET /api/household/state` every `[POLL_MS]` = 15000 while the dashboard is mounted and the document is visible. Refresh immediately on `visibilitychange` to visible, on Capacitor resume, and after the viewer's own write. Pause when hidden.

Reasons, from the codebase rather than preference:

- `components/community/CommunityClient.tsx`, from line 60: "Realtime has no precedent in this repo: no channel is opened anywhere, no migration adds a table to the `supabase_realtime` publication, and the native shell would need a new WebSocket egress path that neither `build:android` nor `build:ios` exercises."
- A household of at most 12 people checking in once a day gains nothing a person can perceive from sub-second delivery.
- With `since` and 204, a visible dashboard costs about four empty responses a minute.

If Realtime is ever wanted (D-13), its prerequisites are a publication migration, `wss:` in the CSP `connect-src`, private channels authorized by RLS, and on-device verification in both native builds.

#### 2.8.7 Offline outbox

- Own check-ins made offline go into a local outbox (`localStorage` key `purify:household.outbox`, at most `[OUTBOX_MAX]` = 20 entries, each with its `clientMutationId`).
- Replayed first-in first-out on `online` and on resume. A 409 or 404 drops the entry and shows `[TXT_CHECKIN_EXPIRED]` once. A 5xx keeps it, with backoff.
- Storage access is wrapped in try and catch; a blocked store degrades to online-only, never to a crash.
- The key sits in the `purify:*` namespace that `ProfileData` exports and imports. A stale entry restored from an old export is harmless: the day rule refuses it with 409.

#### 2.8.8 Privacy, consent, retention, deletion, succession

| Topic | Rule |
|---|---|
| Stored per account member | Display name, role, sharing flags, sort order, patron slug if shared, consent version and time. Nothing else. |
| Stored per managed profile | Display name (initials are enough), patron slug if the admin sets one. No birth date, photo, email or school. |
| Consent | Explicit, unticked by default, versioned, at creation and at every join (D-08). |
| Retention | Check-ins are deleted `[RETENTION_DAYS_AFTER_PLAN]` = 30 days after their plan ends. Other members' history is never served in any case. |
| Account deletion | `app/api/auth/delete/route.ts` deletes the auth user and relies on cascades. `household_members.user_id` cascades, and check-ins cascade from the member row, so this route needs no change. `households` carries no foreign key to a person, so one member's deletion never deletes a family's household. |
| Last admin leaves or is deleted | A trigger sets `admin_vacant_since`. Account members see the vacancy state and may accept the role. If nobody accepts within `[VACANCY_DAYS]` = 30, a job deletes the household and every managed profile in it. |
| Data export | The shipped export (`components/profile/ProfileData.tsx`) bundles local `purify:*` storage only, with no server round-trip. Household data lives on the server, so the export gains one authenticated fetch of the caller's own membership, display name and check-ins. |
| Notifications | None about household activity, push or email. The existing name-day email stays self-only; managed profiles have no address and never enter it. |

#### 2.8.9 Feature flag and rollout

`lib/household/flags.ts` with `NEXT_PUBLIC_HOUSEHOLD_ENABLED`, following `lib/campaigns/flags.ts`: routes `notFound()` and the API answers 404 while it is unset, so nothing renders or writes before its tables exist. The value is inlined at build time, so the native apps need a new build to change it. Order: migration applied and probed, then flag, then the native builds.

---

## 3. Module 2: Catechumen Corner

### 3.1 Placement, routes and the native pattern

| Item | Rule |
|---|---|
| Entry | A Discover tile; Discover lights for `/catechumen*`. Not a seventh bottom tab (D-14). |
| Routes | `/catechumen` (the Corner), `/catechumen/briefing` (this week's briefing, resolved client-side), `/catechumen/terms` (all terms), `/catechumen/term?slug=` (one full entry), `/catechumen/ask` (form, receipts and answers). All static shells. A term published after a native build has no pre-rendered page, so a `[slug]` route with `generateStaticParams` would miss it; the query-param shell, the `/bible/multi?q=` pattern in `scripts/native-build.mjs`, does not. The client child reads the parameter from `window.location` in a mount effect, never through `useSearchParams` behind `Suspense`, which never hydrated on the static export (audit finding F-17). |
| Reads | Published content through a cookie-less anon client, the `lib/shop/catalog.ts` pattern, over a bundled fallback. |
| Catechumen status | Never stored on the server. Being a catechumen is religious data and the Corner does not need it. Any "pin the Corner" preference is local to the device. |

### 3.2 Wireframe: the Corner

The week's briefing carries attention and the screen's one primary button. Ask a Priest is reached through a secondary button, so the Corner never shows two primaries.

```text
┌──────────────────────────────────────────────────────┐
│ status bar, safe-area-inset-top                      │
├──────────────────────────────────────────────────────┤
│ [ICN_BACK]      [TXT_CORNER_TITLE]                   │  48  MobileTopBar
├──────────────────────────────────────────────────────┤
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│  4  S0 mode rule (L1)
│                                                      │  16
│ [TXT_CORNER_MASTHEAD]                                │  36  display serif, 28
│ [TXT_CORNER_INTRO]                                   │  20  paper@0.60
│                                                      │  16
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │  D ATTENTION: this week's briefing (L2)
│ ┃ [TXT_BRIEF_EYEBROW]            [DAT_SUNDAY_DATE] ┃ │  D1
│ ┃ [EDT_BRIEFING_TITLE]                             ┃ │  Lora 22 / 500
│ ┃ (o) [EDT_VESTMENT_LABEL]                         ┃ │  D2 swatch row, 32
│ ┃ [EDT_BLOCK_1_TITLE]                              ┃ │  D3 first block, full
│ ┃ ..............................................   ┃ │  DM Sans 17 / 1.6
│ ┃ ..............................................   ┃ │
│ ┃ ............................                     ┃ │
│ ┃ ┌──────────────────────────────────────────────┐ ┃ │  48  D4 PRIMARY (L3)
│ ┃ │              [TXT_BRIEFING_CTA]              │ ┃ │
│ ┃ └──────────────────────────────────────────────┘ ┃ │
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │
│                                                      │  24
│ [TXT_VOCAB_EYEBROW]                  [TXT_ALL_TERMS] │  E0
│ ┌──────────┐ ┌──────────────┐ ┌──────────┐ ┌─────────│  E1 two-row grid, scrolls on x
│ │ [EDT_T1] │ │ [EDT_T2]     │ │ [EDT_T3] │ │ [EDT_T7]│  peek: last chip cut at the edge
│ └──────────┘ └──────────────┘ └──────────┘ └─────────│
│ ┌────────────┐ ┌──────────┐ ┌──────────────┐ ┌───────│
│ │ [EDT_T4]   │ │ [EDT_T5] │ │ [EDT_T6]     │ │ [EDT_T│
│ └────────────┘ └──────────┘ └──────────────┘ └───────│
│                                                      │  24
│ ╭──────────────────────────────────────────────────╮ │
│ │ [TXT_ASK_EYEBROW]                                │ │  F portal card
│ │ [TXT_ASK_TITLE]                                  │ │  Lora 22 / 500
│ │ [TXT_ASK_INTRO]                                  │ │
│ │ ╭┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄╮ │ │  secondary, /catechumen/ask
│ │ ┆               [TXT_ASK_ENTRY]                ┆ │ │
│ │ ╰┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄╯ │ │
│ ╰──────────────────────────────────────────────────╯ │
├──────────────────────────────────────────────────────┤
│ MobileTabBar (--tab-bar-h 86) + inset-bottom         │  86
└──────────────────────────────────────────────────────┘
```

### 3.3 Sunday Briefing

Full view:

```text
┌──────────────────────────────────────────────────────┐
│ status bar, safe-area-inset-top                      │
├──────────────────────────────────────────────────────┤
│ [ICN_BACK]      [TXT_BRIEFING_SCREEN]                │  48
├──────────────────────────────────────────────────────┤
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│  4  S0 mode rule
│ [TXT_BRIEF_EYEBROW]                [DAT_SUNDAY_DATE] │  20
│ [EDT_BRIEFING_TITLE]                                 │  display serif, 28, max 2 lines
│ (o) [EDT_VESTMENT_LABEL]                             │  32  swatch 16dp + text label
│ ──────────────────────────────────────────────────── │  hairline paper@0.12
│ [EDT_BLOCK_n_TITLE]                                  │  Lora 22 / 500, h2
│ ..................................................   │  DM Sans 17 / 1.6
│ ..................................................   │  measure: max 65ch
│ ..................................................   │
│ ...............................                      │  block body <= [BLOCK_MAX_CHARS]
│ [EDT_BLOCK_n_REF]  [ICN_CHEV]                        │  serif ref, opens the reader
│ ┌──────────┐ ┌──────────────┐                        │  terms in this block
│ │ [EDT_Ta] │ │ [EDT_Tb]     │                        │  (no inline marks in body)
│ └──────────┘ └──────────────┘                        │
│                                                      │  repeat for blocks 2 to [MAX_BLOCKS]
│ ──────────────────────────────────────────────────── │
│ [TXT_SOURCES_EYEBROW]                                │  required when any block quotes
│ [EDT_SOURCE_1]                                       │
│ [EDT_SOURCE_2]                                       │
│ [TXT_REVIEWED_LINE] [EDT_REVIEWER]                   │  optional, per D-10
├──────────────────────────────────────────────────────┤
│ MobileTabBar (--tab-bar-h 86) + inset-bottom         │  86
└──────────────────────────────────────────────────────┘
```

| Slot | Content | Type | Constraint |
|---|---|---|---|
| `[TXT_BRIEF_EYEBROW]`, `[DAT_SUNDAY_DATE]` | Label and date in the reader's reckoning | Eyebrow; DM Sans 12 | |
| `[EDT_BRIEFING_TITLE]` | The Sunday's title | Lora 22 / 500 on the card; DM Serif Display 28 on the full view | At most `[BRIEFING_TITLE_MAX]` = 60 characters |
| Swatch `(o)` and `[EDT_VESTMENT_LABEL]` | The color the reader will see in church, and its name | 16dp disc with a 1px paper at 0.35 ring, so dark colors stay visible; text label always present | The only place a color outside the palette may appear. Never used as text or accent. |
| `[EDT_BLOCK_n_TITLE]` | One observable action or color per block | Lora 22 / 500, `h2` | At most `[MAX_BLOCKS]` = 4 blocks |
| `[EDT_BLOCK_n_BODY]` | Why it happens | DM Sans 17 / 1.6, measure at most 65ch, left-aligned, never justified, 16dp between paragraphs | At most `[BLOCK_MAX_CHARS]` = 600; the card preview shows block 1 only, at most `[BLOCK_PREVIEW_CHARS]` = 240 |
| `[EDT_BLOCK_n_REF]` | Scripture reference | Lora, links into the Bible reader | Resolved by the shared citation resolver (3.7.1) |
| Term chips for the block | Terms that appear in the block | Chip spec in 3.4 | Body text carries no inline marks (D-15); terms surface as chips instead |
| `[EDT_SOURCE_n]` | Citations | DM Sans 13, paper at 0.60 | Required whenever a block quotes (`docs/editorial-standards.md`) |
| `[TXT_REVIEWED_LINE]` `[EDT_REVIEWER]` | Review attribution | DM Sans 13 | Only with the reviewer's consent (D-10) |

Bold appears only on a core biblical entity inside a block, marked as such in the data.

### 3.4 Liturgical Vocabulary Chip Grid

```text
┌──────────────────────────────────────────────────────┐
│ [TXT_VOCAB_EYEBROW]                  [TXT_ALL_TERMS] │  32
│░┌──────────┐ ┌──────────────┐ ┌──────────┐ ┌─────────│  fade 24dp at inline-start once scrolled
│░│ [EDT_T1] │ │ [EDT_T2]     │ │ [EDT_T3] │ │ [EDT_T7]│  row 1: 48 target, 40 visual pill
│░└──────────┘ └──────────────┘ └──────────┘ └─────────│
│                                                      │  row-gap 8
│░┌────────────┐ ┌──────────┐ ┌──────────────┐ ┌───────│
│░│ [EDT_T4]   │ │ [EDT_T5] │ │ [EDT_T6]     │ │ [EDT_T│  row 2
│░└────────────┘ └──────────┘ └──────────────┘ └───────│  fade 24dp at inline-end
│   ^ dotted underline under each label, paper@0.35    │
└──────────────────────────────────────────────────────┘
```

| Property | Rule |
|---|---|
| Layout | CSS grid, `grid-auto-flow: column`, `grid-template-rows: repeat(2, 48px)`, column and row gap 8dp, `overflow-x: auto`, scrollbar hidden. Full-bleed: first chip at the 16dp gutter, last chip cut by the screen edge so the scroll is discoverable. |
| Snap | `scroll-snap-type: x proximity`; `scroll-padding-inline: 16px`; each chip `scroll-snap-align: start`. |
| Chip | 48dp target, 40dp visible pill, 1px paper at 0.12 border, padding-inline 12dp. Label DM Sans 14 / 500 with `text-decoration: underline dotted`, 1px, paper at 0.35 (3.07:1), `text-underline-offset: 3px`. |
| Order | This week's terms first, then the rest, at most `[MAX_CHIPS]` = 12; `[TXT_ALL_TERMS]` opens `/catechumen/terms`. |
| Edge fades | 24dp masks with `mask-image` at inline-start (only once scrolled) and inline-end. No `backdrop-filter`. |
| RTL | Scroll origin follows `dir`; fades swap sides. |
| Semantics | A list of buttons: `ul`, each `li` holding a `button` with `aria-haspopup="dialog"`; the region is labelled `[TXT_VOCAB_REGION_A11Y]`. Tab order follows reading order. |
| Terms without a published definition | Not rendered. |

### 3.5 Vocabulary bottom sheet

```text
┌──────────────────────────────────────────────────────┐
│ status bar, safe-area-inset-top                      │
├──────────────────────────────────────────────────────┤
│░░░[CORNER,░dimmed]░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│  scrim --color-night/70
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│  65%, tap anywhere here = dismiss
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│ ┌──────────────────────────────────────────────────┐ │  35dvh (fallback 35vh)
│ │                       ────                       │ │  20  handle
│ │ [EDT_TERM]                [AUD_PLAY] [ICN_CLOSE] │ │  48  header: term, audio, close
│ │ [EDT_PHONETIC]  [EDT_ORIGIN_LANG]                │ │  20  caption, paper@0.60
│ │                                                  │ │  8
│ │ [EDT_DEFINITION_SHORT]                           │ │  body, scrolls internally
│ │ ............................................     │ │  <= 110 chars: 3 lines @ 360x640
│ │ ..............................                   │ │
│ │ [TXT_READ_MORE]  [ICN_CHEV]                      │ │  only if definition_long
│ │ safe-area-inset-bottom                           │ │
└──────────────────────────────────────────────────────┘
```

| Slot | Content | Type | Constraint |
|---|---|---|---|
| `[EDT_TERM]` | The term | Lora 22 / 500 | One line; full text in the accessible name |
| `[AUD_PLAY]` | Pronunciation | 48dp icon button | State machine below |
| `[EDT_PHONETIC]` `[EDT_ORIGIN_LANG]` | Respelling and source language | DM Sans 12, paper at 0.60 | Optional; row renders nothing when both are empty |
| `[EDT_DEFINITION_SHORT]` | The definition | DM Sans 17 / 1.6 | At most `[DEF_SHORT_MAX]` = 110 characters, validated at write time |
| `[TXT_READ_MORE]` | Full entry | Text button | Only when `definition_long` exists |

Pronunciation states:

| State | Glyph | Behavior |
|---|---|---|
| Idle | `[ICN_PLAY]` | Tap plays. Never autoplays. |
| Loading | `[ICN_SPINNER]` | Streams and caches on first play. |
| Playing | `[ICN_STOP]` | Tap stops. Closing the sheet stops. One clip at a time. |
| Unavailable (no asset, or offline and uncached) | Not rendered | No disabled control, no retry loop. |

If prayer audio is playing in `NowPlayingBar`, a pronunciation pauses it and does not resume it on its own: two voices at once is the amateur result, and an unrequested resume is a surprise.

### 3.6 Ask a Priest

Form:

```text
┌──────────────────────────────────────────────────────┐
│ status bar, safe-area-inset-top                      │
├──────────────────────────────────────────────────────┤
│ [ICN_BACK]      [TXT_ASK_SCREEN]                     │  48
├──────────────────────────────────────────────────────┤
│ [TXT_ASK_MASTHEAD]                                   │  display serif, 28
│ [TXT_ASK_INTRO]                                      │  paper@0.60
│ [EDT_PASTORAL_SCOPE_NOTICE]                          │  clergy-authored, required
│                                                      │
│ ┌──────────────────────────────────────────────────┐ │  textarea, 5 lines, grows to 10
│ │ [TXT_ASK_PLACEHOLDER]                            │ │  paper@0.60 placeholder
│ │                                                  │ │
│ │                                                  │ │
│ │                                                  │ │
│ └──────────────────────────────────────────────────┘ │
│ [TXT_ASK_ERR]        [DAT_CHAR_COUNT]/[DAT_CHAR_MAX] │  error left, counter right
│ [ ] [TXT_PUBLISH_CONSENT]                            │  only if D-11 archive; unchecked
│ [ICN_LOCK]  [TXT_PRIVACY_LINE] [TXT_PRIVACY_LINK]    │  wording bound by 3.7.3
│ [ICN_HELP]  [TXT_SAFEGUARD_LINE] [TXT_CRISIS_LINK]   │  required
│ ┌──────────────────────────────────────────────────┐ │  48  PRIMARY; reachable with keyboard up
│ │                 [TXT_ASK_SUBMIT]                 │ │
│ └──────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────┤
│ MobileTabBar (--tab-bar-h 86) + inset-bottom         │  86
└──────────────────────────────────────────────────────┘
```

Receipt, list and answer:

```text
┌──────────────────────────────────────────────────────┐
│ R1 after submit (replaces the form)                  │
│ ╭──────────────────────────────────────────────────╮ │
│ │ [ICN_CHECK] [TXT_RECEIPT_TITLE]                  │ │
│ │ [TXT_RECEIPT_BODY]                               │ │
│ │ [DAT_RECEIPT_CODE]                    [TXT_COPY] │ │  grouped, tabular, selectable
│ │ [TXT_RECEIPT_DEVICE_NOTE]                        │ │  stored on this device only
│ │ ╭┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄╮ │ │  secondary
│ │ ┆             [TXT_BACK_TO_CORNER]             ┆ │ │
│ │ ╰┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄╯ │ │
│ ╰──────────────────────────────────────────────────╯ │
│                                                      │
│ R2 my questions (from receipts on this device)       │
│ ╭──────────────────────────────────────────────────╮ │
│ │ [DAT_SUBMITTED_DAY]              [DAT_STATE_TAG] │ │  48  one row per receipt
│ ├──────────────────────────────────────────────────┤ │
│ │ [DAT_SUBMITTED_DAY]              [DAT_STATE_TAG] │ │
│ ├──────────────────────────────────────────────────┤ │
│ │ [TXT_ENTER_CODE]                                 │ │  restore a receipt by code
│ ╰──────────────────────────────────────────────────╯ │
│                                                      │
│ R3 answer view                                       │
│ ╭──────────────────────────────────────────────────╮ │
│ │ [TXT_YOUR_QUESTION]                              │ │
│ │ [USR_QUESTION_BODY]                              │ │  escaped plain text
│ │┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄│ │
│ │ [TXT_ANSWER_EYEBROW]          [DAT_ANSWERED_DAY] │ │
│ │ [EDT_ANSWER_BODY]                                │ │  clergy-authored only
│ │ [DAT_ANSWER_ATTRIBUTION]                         │ │  per D-10
│ ╰──────────────────────────────────────────────────╯ │
└──────────────────────────────────────────────────────┘
```

| Slot | Content | Constraint |
|---|---|---|
| `[EDT_PASTORAL_SCOPE_NOTICE]` | What this service is and is not, relative to the reader's own priest | Required. Clergy-authored. |
| Textarea | `[USR_QUESTION_BODY]` | `[ASK_MIN]` = 20 to `[ASK_MAX]` = 1200 characters after trimming; counter `tabular-nums`; the draft is kept on the device until sent, so a failed send never loses it. |
| `[TXT_PUBLISH_CONSENT]` | Opt-in to an anonymous public archive | Rendered only if D-11 creates one; unchecked by default. |
| `[TXT_PRIVACY_LINE]` | The anonymity statement | Bound by the table in 3.7.3. Links the privacy policy. |
| `[TXT_SAFEGUARD_LINE]` `[TXT_CRISIS_LINK]` | Where to get urgent help | Required, visible before and after sending, localized per locale by legal and owner. |
| `[TXT_ASK_SUBMIT]` | Primary | Validates on submit, not by disabling the button; must be reachable by scrolling with the keyboard open on both native builds. |

| State | Screen |
|---|---|
| Idle | Form |
| Invalid | `[TXT_ASK_ERR]` under the field; focus returns to the field |
| Sending | Button busy |
| Sent | R1 replaces the form; receipt saved on the device |
| Rate limited (429) | `[TXT_ASK_RATE_LIMITED]`; draft kept |
| Paused (503, queue full or limiter unavailable) | `[TXT_ASK_PAUSED]`; draft kept |
| Network error | `[TXT_ASK_NETWORK_ERROR]` and `[TXT_RETRY]`; draft kept |
| Flag off | Route `notFound()`; portal card renders nothing |

Answers are pull-only: the list checks its receipts when opened. There is no push for an answer, because a push token is a device identifier, and linking it to a question would undo the anonymity model.

### 3.7 Technical specification

#### 3.7.1 Content model and editorial pipeline

| Table | Key fields | Rules |
|---|---|---|
| `catechumen_briefings` | `liturgical_key`, `locale`, `title`, `vestment_hex`, `vestment_label`, `blocks` (json: title, body, ref, term slugs), `sources` (json), `review_state`, `reviewed_by`, `reviewed_at`, `ai_drafted`, `version` | `liturgical_key` identifies the liturgical day, not a civil date: `movable:<offset in days from the date orthodoxPascha() returns>` or `fixed:<MM-DD>`, resolved through the shipped engine in the reader's reckoning. Readers on either calendar get the right briefing from one row. |
| `catechumen_terms` | `slug`, `locale`, `term`, `phonetic`, `origin_lang`, `definition_short` (at most `[DEF_SHORT_MAX]`, checked), `definition_long` (at most `[DEF_LONG_MAX]` = 1200), `audio_url`, `sources`, `review_state`, `reviewed_by`, `reviewed_at`, `ai_drafted` | One row per locale. |

- **Review states:** `draft`, `clergy_review`, `approved`, `published`, `retired`. Only `published` is readable by the anon role (RLS). A check constraint refuses `published` without `reviewed_by` and `reviewed_at`.
- **AI drafts** may exist only in `draft`, flagged `ai_drafted = true` so the reviewer knows what they are reading.
- **One pipeline, already proven:** mirror the patch-notes pattern in `AGENTS.md`. The table is live; a committed JSON file is the fallback and the native bundle; a pull script keeps the file in step with production; proposed edits wait in an admin queue for acceptance. The review console is admin, which the native export already stashes.
- **One citation resolver:** v1.4 plans `lib/catechism/sourceRef.ts` to turn a source reference into a link and a label. Briefing references and term sources use the same format and resolver, so the app has one way to cite.
- **Voice:** "Edgar, the Purify Team". No em dashes in any `[TXT_*]` or `[EDT_*]` string.

#### 3.7.2 Offline and locale rules

- The export bakes a window of `[BRIEFING_WINDOW_WEEKS]` = 8 weeks of published briefings and every published term, the date-window pattern `VerseOfDayCard` uses and v1.4 plans for the catechism. Online, the client refreshes from the anon client.
- Audio is not bundled. It streams, caches on first play, and the control is hidden when it cannot play.
- A missing locale falls back to the English row with `[TXT_ENGLISH_ONLY_NOTICE]`. Machine translation of `[EDT_*]` content never publishes: it is AI-generated material and goes through review per locale like anything else.

#### 3.7.3 Ask a Priest: the anonymity model

| We can truthfully say | We must not say | Why |
|---|---|---|
| Your question is not linked to your Purify account | "Completely anonymous" | The hosting platform's request logs record IP addresses outside our code, and question text can identify its author. |
| The priest does not see who asked | "We cannot know who you are" | Same. |
| We do not store your IP address with your question | "Confidential like confession" | No legal privilege attaches to an app message, and reporting duties may apply to clergy (D-10). |
| Your receipt is kept only on this device | "Only you can ever read it" | The receipt is a bearer secret; anyone holding it can read the answer. |

Enforced in code, so the claims stay true:

- The route never calls `createClientFromRequest` and ignores any `Authorization` header. `apiFetch` gains an `anonymous: true` option that omits the bearer token on native; the form uses it.
- The question row has no user id, IP address, device id or user agent. It stores `submitted_on` as a date, not a timestamp, which weakens timing correlation.
- Rate limiting keys on `HMAC-SHA256(ip, ASK_RL_SECRET)` with a secret that rotates daily, never on the raw IP. The shared `ipKey()` returns the raw address and `rateLimited()` persists its key (`lib/security/ratelimit.ts`); used as-is, a rate-limit row and a question row would sit side by side with near-identical times.
- No request-body logging on the route.
- No push, no email, no account link for answers.

#### 3.7.4 Ask a Priest: write path, abuse controls, moderation

| Route | Body | Behavior |
|---|---|---|
| POST `/api/ask` | `{ body, publishConsent, hp }` | zod: trimmed length bounds, control characters stripped, honeypot `hp` must be empty. Rate limit `ask:{hmac}`, 86400 s, `[ASK_RATE]` = 3, **failing closed**: the shared limiter fails open by design (`lib/security/ratelimit.ts`, line 29), which is wrong for an anonymous public write. Queue cap: above `[QUEUE_CAP]` = 200 untriaged questions, answer 503 `[TXT_ASK_PAUSED]`, which protects the clergy and keeps the promise honest. Returns a 128-bit receipt once, base32 and grouped; stores only its SHA-256. |
| POST `/api/ask/status` | `{ receipts: string[] }`, at most 20 | Hashes each, returns `[{ state, answer? }]` in order. Receipts travel in the body, never in a URL. |

- **States:** `received`, `triaged`, `assigned`, `answered`, `closed`, `rejected`.
- **Moderation:** a web-only admin tab. A moderator triages before any clergy member reads, filtering abuse and spam and flagging disclosures of risk under a protocol written with counsel (D-10).
- **Answers:** written by the assigned, verified clergy member. Never drafted by AI: text presented as a priest's answer must be a priest's words. Attribution per D-10.
- **Retention:** question and answer deleted `[ANSWER_RETENTION_DAYS]` = 30 days after the answer is first fetched, or `[UNANSWERED_EXPIRY_DAYS]` = 60 days after submission if never answered. Archived items, if D-11 creates an archive, keep only the opted-in text after editorial review.

#### 3.7.5 Feature flags

`NEXT_PUBLIC_CATECHUMEN_ENABLED` for the Corner, and a separate `NEXT_PUBLIC_ASK_PRIEST_ENABLED` for Ask a Priest, off until D-10 and D-11 are settled. An unstaffed question box is a broken promise, so it must be able to stay dark while the rest of the Corner ships.

---

## 4. Risk register

| ID | Risk | Severity | Mitigation in this spec | Residual owner |
|---|---|---|---|---|
| R-01 | The feed becomes a tool for coercive monitoring of adults' spiritual life | High | Scripture reading only (D-06); member-controlled visibility; no proxy check-ins for adults; unilateral leave; no nudges; no history of others | Owner |
| R-02 | Breach of special-category data | High | No client policies; surrogate ids; minimal fields; retention; response-shape test | Owner, legal |
| R-03 | Children's data handled without a lawful basis | High | Managed profiles with minimal fields; hard legal gate (D-07) | Legal |
| R-04 | Ask a Priest: a disclosure of risk with no way to reach the person; liability for pastoral advice | High | Crisis line before and after sending; triage before clergy; protocol with counsel; separate flag | Owner, legal, clergy |
| R-05 | Anonymity undone by correlating stored records | Medium | HMAC-keyed limits; date-only submission; no push; truthful claims table | Engineering |
| R-06 | Anonymous endpoint flooded while the limiter fails open | Medium | Fail-closed wrapper; queue cap; honeypot | Engineering |
| R-07 | Two color languages for one liturgical fact | Medium | D-01 | Owner |
| R-08 | Typeface lost in nine locales | Medium | D-04 | Owner |
| R-09 | Doctrinally wrong or unreviewed content ships | High | Review states enforced by constraint; only `published` readable; AI only in `draft`; sources required | Clergy |
| R-10 | Household card repeats known fasting defects to a whole family | High | Fasting row gated on the rule-matrix sign-off; required pastoral notice | Clergy |
| R-11 | Admin succession leaves children's rows orphaned | Medium | Vacancy state; acceptance-only promotion; timed deletion | Engineering |
| R-12 | Invite tokens leaked or guessed | Medium | 128-bit, hashed at rest, single use, 72h; fragment transport; admin approval before any data is visible | Engineering |
| R-13 | Native export breaks on a dynamic route or server read | Medium | Static routes only; client children; both native builds in the definition of done | Engineering |

---

## 5. Build sequence and definition of done

| Phase | Contents | Gate |
|---|---|---|
| 0 | Rulings on D-01 to D-16; legal review (D-07, D-08, D-10); clergy on the mode map, the fasting-rule matrix and the pastoral notices | Owner sign-off |
| 1 | Foundations: mode tokens; `resolveMode()` with tests; the fixed-detent sheet variant and focus management in the shared `Sheet`; `.lit-surface` override; flags | Unit tests; axe on an existing sheet caller |
| 2 | Corner, read-only: content tables and RLS (owner-approved SQL), review console, briefing, chip grid, vocabulary sheet | Content published through review |
| 3 | Household: tables, API, dashboard, polling, outbox, consent flows, succession job | Legal gate cleared |
| 4 | Ask a Priest: route, moderation console, receipts | D-10 and D-11 cleared; clergy named |
| 5 | Custom household tasks | D-06 ruling |

Every phase meets the repo's own definition of done (`AGENTS.md`): typecheck and unit tests green; `npm run build:android` then `npm run build:ios`, one after the other; the web build when server code changed; the changed flows walked in a browser; axe clean; patch notes truthful and never claiming a dark feature; the audit ledger updated where an audited area was touched.

Tests this spec requires, beyond the usual:

- `resolveMode()`: every `FastKind`, every overlap case, both reckonings.
- Day-key window: household zones at UTC+14 and UTC-12, the grace cutoff on both sides, and a traveling member.
- Subject rule: the full matrix in 2.8.1, including the refusals.
- Serialization: `GET /api/household/state` never contains `userId` or `email`, and never a status for a member with sharing off.
- Idempotency: a double tap and an outbox replay produce one row.
- Sheet: focus moves in, stays in, returns; scrim, Escape and Android back all dismiss; no text input can mount inside a fixed-detent sheet.
- Ask route: a grep-style test, in the manner of `lib/push/__tests__/doctrine.test.ts`, that fails if the route imports `createClientFromRequest` or calls `ipKey()` without the HMAC wrapper; and a test that the limiter fails closed there.

---

## Appendix A. Contrast method

WCAG 2.x relative luminance. Run with `node`; paste the pairs to recheck after any token change.

```js
const hex = (h) => h.replace("#", "").match(/../g).map((x) => parseInt(x, 16));
const lin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => {
  const [x, y] = [lum(hex(a)), lum(hex(b))].sort((p, q) => q - p);
  return ((x + 0.05) / (y + 0.05)).toFixed(2);
};
console.log(ratio("#F9F6F0", "#121212")); // 17.37 text
console.log(ratio("#4A2E80", "#121212")); //  1.78 violet as a line: fails 3:1
console.log(ratio("#F9F6F0", "#4A2E80")); //  9.77 text on violet fill
console.log(ratio("#7953C1", "#1D1D20")); //  3.06 violet line tint on card
console.log(ratio("#9375CD", "#1D1D20")); //  4.54 violet ink tint on card
console.log(ratio("#121212", "#D4AF37")); //  8.91 night text on gold
```

## Appendix B. Measured budgets

35% sheet, body window after chrome: handle 20, header 48, caption 20, gap 8, bottom padding 20, plus the bottom inset. Body text 17px at 1.6.

| Viewport (bottom inset) | Sheet | Body window | Lines at 100% | Lines at 130% |
|---|---|---|---|---|
| Android 360x640 (24) | 224 | 84 | 3 | 2 |
| Android 360x800 (24) | 280 | 140 | 5 | 3 |
| Android 412x915 (24) | 320 | 180 | 6 | 5 |
| iPhone SE 375x667 (0) | 233 | 117 | 4 | 3 |
| iPhone 390x844 (34) | 295 | 145 | 5 | 4 |
| iPhone Pro Max 430x932 (34) | 326 | 176 | 6 | 4 |

Fold, native 360x640: visible content is 640 minus inset-top 24, top bar 48, tab bar 86 and inset-bottom 24, which leaves 458. Default stack: mode rule 4, gap 12, Card A 176, gap 12, Card B header 76, tracker 48, gap 12, button 48, card padding 32. The primary button ends at 388: above the fold with 70 to spare. A second nameday row would end it at 436; a separate attention strip at 456, leaving 2.
