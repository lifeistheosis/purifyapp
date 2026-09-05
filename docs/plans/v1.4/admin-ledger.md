# Admin panel style: "Ledger"

Owner spec "Purify, Admin Panel Style: Ledger" (2026-09-05). A visual system
and component library for the admin panel. Data unchanged. Where the spec
says "auto fill the rest from the previous prompt", the v1.4 spec's rules
carry over: C2 (no third-party anything), C5 voice, `docs/DECISIONS.md` for
every call, one PR per group, screenshots at 1440 and 390.

The spec references "Admin Panel v3 Additions". That document is not in the
repo. The panel in the tree is what `docs/admin-rework.md` calls v4: six rail
groups, 29 tabs, `components/admin/primitives.tsx` and
`app/admin/admin-theme.css`. This plan re-skins what exists and treats the
current tabs as the data set.

## What exists, and what the spec removes

| Today | Spec | Change |
|---|---|---|
| Dark theme default, light theme behind a toggle (`purify.admin.theme`, `data-adm-theme`) | Light only, cream | Light becomes the only theme. The toggle and `AdminThemeToggle` go. Dark tokens are deleted, not kept dormant. |
| `--adm-shadow-card`, `--adm-shadow-pop`, `--adm-grad-*` (15 uses), glass blur on the top bar | No shadows, gradients, glass | Tokens set to `none` / removed and the 33 call sites cleaned. |
| `--adm-good` (green, 42 uses) for positive | No green. Positive is gold. | `--adm-good` is retired; a new `--adm-up` (darkened gold `#8A6A1C`) and `--adm-down` (muted red `#A63D2F`). Warn stays for attention findings but never as a fill. |
| Odometer "casino reel" count-up with sound, motion toggle, streamer mode, larp mode | Count up 400ms once, no sound, no glow | Odometer becomes a plain 400ms ease-out count-up that runs once per view. `AdminSoundToggle`, the click register, `public/admin-audio` and the reel go. Streamer (blur of emails) and larp (inflated demo numbers) are operator tools, not decoration: kept. Motion toggle kept only as the reduced-motion override. |
| `Pill` with filled tones, `StatCard`, `KpiCard`, `ChartFrame` with grid | Hairline pills, `KpiTile`, `TrendChart` | Existing primitives are re-skinned in place where the shape matches; `KpiTile`, `TrendChart`, `PeriodBar`, `StatList` are new names for what `KpiCard`, `ChartFrame`, `PeriodChips` and the mobile card mode already do. |
| Groups: Money, People, Catalog, Reach, System, Strategy | Overview, Growth, Revenue, Content, Community, System | Rail regrouped. Every existing tab keeps its id and URL; only the group it sits under changes. Tabs the spec names that do not exist (Funnels, Retention, Parish codes, Catechism stats) render as an empty state with one muted sentence until their feature lands. |
| Hero row on Overview | Summary: pinned KPIs, one trend chart, 2-up | Summary replaces the hero row. Pins persist per operator in localStorage, defaults from the owner. |
| Fonts: `--font-sans` (DM Sans), serif Cardo/Lora in the app | Inter if present, serif only in wordmark and title | Inter is not in the tree. DM Sans with `tabular-nums` is the closest present sans; ASK whether to add Inter (one Google font, self-hosted like the others). |

## Tokens

CSS variables on `[data-surface="admin"]` (set on the admin root, replacing
`data-adm-theme`), in `app/admin/admin-theme.css`, because that is what the
codebase already does. No Tailwind preset, no new library.

```
--adm-canvas   #F7F5F1     --adm-card  #FFFFFF    --adm-line #E6E2DA
--adm-ink      #1B1A17     --adm-ink-2 #6B675F    --adm-ink-3 #8F8A80
--adm-up       #8A6A1C     --adm-down  #A63D2F    --adm-warn (kept, text only)
--adm-radius   6px         --adm-radius-sm 4px    --adm-line-w 1px
--adm-chart-line 1.25px    --adm-count-ms 400ms   --adm-draw-ms 500ms
```
The names `--adm-bg`, `--adm-panel`, `--adm-line`, `--adm-ink*` keep their
current meaning so the 28 shell files and 31 tabs mostly re-colour without
edits; `--adm-accent` becomes the gold. `color-scheme: light` is forced on
the admin root so an OS dark mode cannot pull the app's dark tokens in.

## Components (`components/admin/ledger/`)

```
KpiTile.tsx      label, info tooltip, value (tabular 28-32px), delta, 36px sparkline, pinned
TrendChart.tsx   title, value, delta, one ink line, optional dashed compare, 2-3 ticks, cursor tooltip
PeriodBar.tsx    7 / 30 / 90 / YTD / custom, compare control, last refreshed + refresh glyph
Rail.tsx         serif wordmark, workspace line, six groups, gold text + 2px bar active, getting-started card
StatList.tsx     label / value / delta / 24px sparkline rows (the phone Summary)
DataTable.tsx    existing DataTable re-skinned: cream header, hairlines, right-aligned tabular, 44px rows
Sparkline.tsx    hand-rolled SVG path, about 40 lines, draw-once via stroke-dashoffset
CountUp.tsx      400ms ease-out once per mount; reduced motion renders final
```
`app/admin/styleguide/page.tsx` shows every component in loading, empty,
error, populated and pinned states. Admin-gated like the rest.

## Screens

1. Summary (new landing): pinned tiles, one TrendChart with an MRR / DAU
   toggle, a 2-up. Fits 1440x900 above the fold; StatList on a phone.
2. One PR per rail group migrating its tabs onto the set. Keep every
   metric. Drop every decoration that is not a number, label, hairline or
   line. Projection views draw as a dashed extension with a faint band.
3. Integrity checks under System: a checklist of the guards that exist
   (`publicColumnExposure`, the i18n em-dash gate, the tracker allowlist
   from the C2 rule). Gold check, red cross, one line each.

## Mobile

Below 768: the rail is a 5-item bottom bar (Summary, Growth, Revenue,
Content, More), hairline icons, gold active. `PeriodBar` collapses to two
pills. Tile grids become `StatList`. Legible at 130% font scale.

## Files touched beyond the new folder

`app/admin/admin-theme.css`, `app/admin/layout.tsx` (pre-paint theme script
removed, `data-surface` set), `components/admin/AdminShell.tsx` (GROUPS,
Rail), `components/admin/primitives.tsx` (re-skin, Pill tones), `HeroRow.tsx`
(replaced by Summary), `Odometer.tsx` (simplified), `AdminSoundToggle.tsx`,
`AdminThemeToggle.tsx`, `lib/admin/clickSample.ts`, `public/admin-audio`
(deleted), `scripts/native-build.mjs` (stash entry removed), `nav-icons.tsx`
(hairline stroke), `docs/ADMIN-STYLE.md` (new), `docs/admin-rework.md`
(superseded note).

## Tests

- `adminTheme.test.ts` updated: no dark tokens, `color-scheme: light`.
- A token audit test: no `--adm-good`, no `box-shadow` other than `none`, no
  `linear-gradient`, no `backdrop-filter` in admin CSS or admin components.
- Sparkline path generator unit test.
- Playwright: Summary at 1440x900 has no vertical scroll above the fold;
  Summary at 390 has no horizontal scroll.

## Order

1. Tokens + `ledger/` components + styleguide.
2. Summary. Owner review with 1440 and 390 screenshots.
3. Overview and Revenue groups. 4. Growth and Content. 5. Community and
System. 6. Remove sound, dark theme, reel, audio assets last, once nothing
references them.
