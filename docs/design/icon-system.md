# Purify icon system — audit and specification (2026-07-11)

Scope per the owner's §14A directive: **interactive interface symbols** (buttons, navigation, toolbars, steppers, ratings). Out of scope and untouched: the Purify logo/three-bar cross mark, sacred artwork, saint icons (`SaintIcon`), product imagery, editorial illustration.

## The problem (audit freeze, before this rework)

The app spoke **three icon languages at once**:
1. A strong custom family — 32 components in `components/ui/icons/` (24px grid, `size` prop, `currentColor`, `aria-hidden`, stroke line-art ~1.4–1.7 with round caps; brand logos filled).
2. **Text/emoji glyphs** in interactive controls: `✦ ⌫ 🔗 ★/☆ ✎` (verse tools), `≡/✕` (nav toggles, sheet close, nudge dismiss), `−/+` (cart stepper), `★` (ratings). Cross-platform weight/baseline drift; `🔗` rendered as a **color emoji on Android**.
3. **lucide-react** in exactly one file (`MobileVerseToolbar`), contradicting the repo's own changelog doctrine ("No lucide-style glyphs in the mobile chrome") — and giving the *same actions* different symbols in the verse row vs the long-press toolbar (bookmark was `★` in one and lucide `Bookmark` in the other).

A11y was already sound (labels, `aria-pressed`, roles verified in the principal audit) — this was a glyph-consistency defect, not a labeling one.

## Family specification

- **Grid:** `viewBox="0 0 24 24"`, ~2.5px breathing room to edges.
- **Stroke:** 1.6 target (existing tab-bar set already 1.6); round caps and joins; `fill="none"` except stateful fills and brand logos. Legacy outliers (Book/Compass/Hands/User at 2.2, Bolt 2.0) noted for a later refine pass — not churned now.
- **Color:** always `currentColor`; never hard-coded.
- **API:** `({ size = N, ...props }: SVGProps<SVGSVGElement> & { size?: number })`, `aria-hidden="true"`, props spread last (so callers may override `strokeWidth` etc.). Stateful icons add `filled?: boolean` (fill toggle — the saved-state language the shop heart established).
- **Sizes in use:** 13 (inline rating stars) · 14–16 (compact tool buttons) · 18 (toolbar) · 20 (nav toggles, heart) · 22 (tab bar) · 26 (review star picker).
- **States:** resting = outline; active/saved = `filled` + accent color + `aria-pressed`; selected tab = color + sliding compartment + **strokeWidth 2 bump** (three signals, none color-only). Disabled inherits button opacity.
- **Labels:** the *control* carries the accessible name describing the action ("Bookmark verse", "Open prayers"), never the image; icons stay `aria-hidden`. This was already house practice — now written down as the rule.

## New icons added (all to spec)

`LinkChain, Pen, Star(filled), Sparkle(filled), Erase, Close, Menu, Plus, Minus, Check, Heart(filled), Flower` — in `components/ui/icons/`.

## Traceability — every replacement in this rework

| Control | Was | Now | File | Verified |
|---|---|---|---|---|
| Verse highlight toggle | `✦` text | `Sparkle filled=highlighted` | components/bible/VerseRow.tsx | preview + suite |
| Clear word highlights | `⌫` | `Erase` | VerseRow.tsx | preview + suite |
| Copy verse link / copied | `🔗`/`✓` | `LinkChain`/`Check` | VerseRow.tsx | preview + suite |
| Bookmark verse | `★`/`☆` | `Star filled=bookmarked` | VerseRow.tsx | preview + suite |
| Add/edit note | `✎` | `Pen` | VerseRow.tsx | preview + suite |
| Long-press toolbar (6 actions) | lucide ×7 | family set (same actions now share symbols with VerseRow) | components/bible/MobileVerseToolbar.tsx | preview + suite |
| Gather to florilegium | lucide Flower2 | `Flower` (new) | MobileVerseToolbar.tsx | preview + suite |
| Cart stepper | `−`/`+` text | `Minus`/`Plus` | components/shop/CartClient.tsx | preview |
| Rating display | `★` text ×5 | `Star size=13 filled` | components/shop/RatingStars.tsx | preview |
| Review star picker | `★` text-[26px] | `Star size=26 filled` | components/shop/WriteReviewForm.tsx | suite |
| Product save heart | inline svg | `Heart filled=saved` (family) | components/shop/FavoriteButton.tsx | preview |
| Sheet close | `✕` | `Close` | components/ui/Sheet.tsx | preview |
| Nudge dismiss | `✕` | `Close` | components/onboarding/FirstStepsNudge.tsx | suite |
| Nav menu toggle | `≡`/`✕` text | `Menu`/`Close` | components/nav/AppNav.tsx, Navbar.tsx | preview |
| Tab bar selected state | color + compartment | + strokeWidth 2 bump | components/nav/MobileTabBar.tsx | preview |

`lucide-react` removed from package.json (was imported by exactly one file).

## Decisions of record

- **Prayer symbol (§14A.4): RETAIN `PrayerRope`.** Already Orthodox-specific (komboskini with knots), unmistakable at 22px, cannot be read as generic wellness/meditation imagery, and documented in-code as drawn to avoid resembling its tab-bar neighbors. No change.
- **Bookmark = Star** everywhere a *verse/passage* is saved (matches the app's existing gold-star state color); **Heart** stays the *shop product* save (commerce affordance, distinct from study bookmarks). Deliberate two-symbol distinction, not an inconsistency.
- Glyphs kept as text on purpose: `→` inline in link labels (typographic, `aria-hidden` where standalone), `…` loading ellipses (text), the commentary red-dot (already an SVG-adjacent styled span with correct labels).

## Verification record and limits

Verified this session: tsc, eslint, vitest suite; localhost preview at 375×812 (screenshots in session record) for reader tools, cart, product page, sheet close, nav toggle; dark theme inherent (app default); no new motion added (reduced-motion posture unchanged); android export builds. **Not verified:** physical-device rendering (no device/emulator — standing limitation), iOS (no iOS build).
