# Admin style: the Ledger

> **SUPERSEDED IN PART, 2026-09-13.** On seeing the Ledger live, the owner kept
> its layout and rejected its palette and its cards: "i liked the design not
> the ui card and theme change". So on release/v1.4:
>
> **No longer true.** The one-accent rule, the light-only cream palette, the
> removal of the Theme toggle, "no green", "no shadow", "no gradient", the
> flat Ledger tile and chart card, and the gold 2px rail bar. The panel is back
> on the two themes it had before v1.4, dark and light, keyed on
> `data-adm-theme` and switched from the rail. Cards, buttons, pills and
> skeletons use the pre-v1.4 styles from `components/admin/primitives.tsx`.
> `lib/admin/__tests__/adminLedgerAudit.test.ts` enforced the retired
> must-nots and is deleted; `adminTheme.test.ts` is back to testing both
> palettes.
>
> **Still true.** The rail groups and the Summary layout, the ledger
> components as COMPONENTS (KpiTile, StatList, TrendChart, Sparkline, PeriodBar,
> Rail), the 232px rail and 1440px content measure, the draw-once motion
> budgets, section heading sizes, and table pinning. KpiTile and TrendChart now
> draw the panel's own card and accent line. The v1.4 token names
> (`--adm-card`, `--adm-up`, `--adm-down`, `--adm-canvas` and the rest) still
> resolve, as aliases of the restored tokens, so nothing that uses them needs
> an edit.
>
> The sections below describe the Ledger as it was specified and are kept as
> the record. Read them as history where they conflict with this note.

The visual system for `/admin`, `/admin/shop` and `/owner`, since 2026-09-05.
Owner spec "Purify, Admin Panel Style: Ledger"; plan in
`docs/plans/v1.4/admin-ledger.md`; calls in `docs/DECISIONS.md` under
"Admin panel Ledger". This file is the working reference: what the tokens
are, what the components take, and the one rule that keeps the panel
looking like one thing.

Every rule here is enforced by a test where a test can enforce it:
`lib/admin/__tests__/adminTheme.test.ts` (the palette and its contrast) and
`lib/admin/__tests__/adminLedgerAudit.test.ts` (the must-nots). The
styleguide at `/admin/styleguide` renders every component in every state.

## The one-accent rule

Positive is gold. Negative is red. Nothing else in the admin has a hue.

- `--adm-up` `#8A6A1C` colours a delta that went the right way, the active
  rail item, a passing check, the one filled button.
- `--adm-down` `#A63D2F` colours a delta that went the wrong way, an error
  sentence, a failing check.
- Everything else is ink on cream: the canvas, white cards, one hairline
  weight, three inks.

There is no green anywhere in the admin palette. `--adm-good` is an alias
of `--adm-up` for one release so a stray consumer resolves; the audit test
fails if anything outside the token file names it, and the alias goes in
the release after this one.

A delta is coloured by direction alone, with a true minus sign (U+2212) for
a fall and a plus for a rise. A metric where down is good (churn, refunds)
passes `invert: true`: the colour flips, the sign stays truthful.

## Tokens

All in `app/admin/admin-theme.css`, on `[data-surface="admin"]` (set by
`app/admin/layout.tsx` and `app/owner/layout.tsx`) and on `.adm` for the
portals that render outside that root. Components use tokens only; hex
lives in the token file and nowhere else.

| Token | Value | Use |
|---|---|---|
| `--adm-canvas`, `--adm-bg` | `#F7F5F1` | The page ground |
| `--adm-card`, `--adm-panel` | `#FFFFFF` | Cards, panels, table wrappers |
| `--adm-panel-2` | `#F7F5F1` | Table headers, input wells, tooltips |
| `--adm-line` | `#E6E2DA` | The hairline. The only separator |
| `--adm-line-strong` | `#D5D0C6` | Control outlines |
| `--adm-ink` | `#1B1A17` | Values, titles, the chart line |
| `--adm-ink-2` | `#6B675F` | Labels, the compare line |
| `--adm-ink-3` | `#726D64` | Hints, ticks, disabled text |
| `--adm-up`, `--adm-accent` | `#8A6A1C` | Positive, selected, primary |
| `--adm-down`, `--adm-critical` | `#A63D2F` | Negative, error |
| `--adm-warn` | `#8A6500` | Attention findings, text only |
| `--adm-radius`, `--adm-radius-sm` | `6px`, `4px` | Cards, controls |
| `--adm-chart-line` | `1.25px` | The ink line's weight |
| `--adm-count-ms`, `--adm-draw-ms` | `400ms`, `500ms` | Count-up, line draw |
| `--adm-rail-w`, `--adm-content-max` | `232px`, `1440px` | Rail, content measure |
| `--adm-shadow-card`, `--adm-shadow-pop` | `none` | Kept so a stale consumer resolves |

`color-scheme: light` is forced on the root so an OS dark mode cannot pull
the reader's dark tokens in through a native control. `--adm-ink-3` is
`#726D64` rather than the spec's `#8F8A80` because it is used as text at 11
to 12px in a hundred places and the spec value reads 3.15:1 on the cream.

## Type

DM Sans everywhere, with `font-variant-numeric: tabular-nums` on the whole
surface. The serif (`.adm-serif`, Lora) appears in exactly two places: the
wordmark in the rail and the page title.

| Role | Size | Weight | Colour |
|---|---|---|---|
| KPI value | 28 to 32px | 500 | `--adm-ink` |
| Chart value | 24px | 500 | `--adm-ink` |
| Section heading (`.adm-heading`) | 15px | 500 | `--adm-ink` |
| Label | 12 to 13px | 400 | `--adm-ink-2` |
| Delta | 12px | 400 | by direction |
| Tick, hint | 11px | 400 | `--adm-ink-3` |

Never bold above 500. Never tracked uppercase.

## Must not

Shadows, gradients, glass, coloured card grounds, area fills, pie or donut
charts, filled pills or badges, emoji, illustrations, green. The audit
test checks the first three and the last one; the rest are a review
question.

Empty states are one muted sentence and a link where a setup exists.

## Motion

Numbers count up once on first paint over `--adm-count-ms`, ease-out. Lines
draw left to right once over `--adm-draw-ms`. Nothing else moves on its
own. Reduced motion renders the final state, decided per surface in
`lib/ui/motionPreference.ts` and overridden by the Reduced motion control
in the rail; there is no `prefers-reduced-motion` media query in the admin
CSS, for the reason recorded there.

## Components, `components/admin/ledger/`

Import from `components/admin/ledger` (the index) or the file.

### `KpiTile`

```tsx
<KpiTile
  label="Visitors 30d"
  info="Unique visitors over the last 30 UTC days."   // (i) tooltip
  value="12,480"            // string | number | null; a number formats en-US
  delta={{ value: 4.2 }}    // DeltaSpec: value, suffix ("%"), invert, decimals
  caption="vs prior 30 days"
  trend={series}            // number[]; 36px sparkline
  sensitive                 // money: masked under streamer mode
  loading / error="..." / empty="..." emptyHref={{ href, label }}
  pinned onPin={() => ...}  // pin control on hover and focus
  action={<MetricToggle .../>}
/>
```

### `TrendChart`

```tsx
<TrendChart
  title="Daily active users"
  value={842} delta={{ value: -1.2 }}
  points={series} labels={dates}        // labels: one per point
  compare={prior} compareLabel="prior"  // muted, 1px, dashed
  format={(v) => v.toLocaleString()}
  loading / error / empty / emptyHref / sensitive
  action={<MetricToggle value={m} onChange={setM} />}
/>
```

220px on desktop, 160 below md. Two ticks on the short one, three on the
tall. Hover is a hairline and an ink-on-cream tooltip.

### `Sparkline`

`<Sparkline data={series} width={px} height={36} />`. A polyline whose
length is computed before render (`lib/admin/ledger/sparkline.ts`) so the
draw-once animation has an exact dash. `dashed` and `color="var(--adm-ink-2)"`
for a compare line. Width is pixels: measure the box with `useWidth`.

### `CountUp`

`<CountUp value="$1,204.50" />`. Counts the number inside a formatted
string once per mount. The true value is written by a timeout as well as
by the last frame, so a throttled tab can only make it late, never wrong.
`Odometer` is a wrapper that adds the streamer mask for money.

### `PeriodBar`

`period`, `onPeriod` (`"7d" | "30d" | "90d" | "ytd" | "custom"`),
`allowCustom`, `compare`, `onCompare`, and the freshness line
(`lastSynced`, `failing`, `onRefresh`). Segments from md up, a native
select below.

### `StatList`

`rows: StatRow[]` (`id`, `label`, `value`, `delta`, `trend`, `sensitive`,
`onClick`), plus `loading`, `error`, `empty`, `emptyHref`, and `onPin` +
`pinned` for a pin control per row. 44px rows on hairlines. The phone's
Summary, and any breakdown by source: `SegmentList` in `charts.tsx` wraps
it for a share of a whole.

### `Rail`

`groups: RailGroup[]` (`group`, `tabs: { id, label, eyebrow, badge }`),
`active`, `onSelect`, `workspace` ("Production"), `roleLabel`, and three
slots: `top` (the Operations | Owner switch), `live` (the rail's live
rows), `footer`. Draws the Getting started card until its five items are
ticked (`lib/admin/ledger/pins.ts`, localStorage).

### Primitives that were re-skinned in place

`Card` (white on a hairline; `accent` only colours the title), `Pill`
(hairline outline in its tone; `"up"` and `"down"` are the names, `"emerald"`
and `"rose"` still map), `DataTable` (cream sticky header, 44px rows,
`align: "right"` columns are tabular), `LineChart` (ink, then dashed muted,
then small multiples), `BarChart`, `CalendarHeatmap`.

## Adding a KPI tile to the Summary

Every tile the Summary can draw is one entry in the `tiles` array in
`components/admin/Summary.tsx`. Add one there and it appears in the More
list, pinnable, with no other change:

```ts
{
  id: "refunds-30d",                     // stable: it is what pins store
  label: "Refunds 30d",
  info: "Refunded orders over the last 30 UTC days.",
  value: data ? money(data.refundedCents) : null,
  delta: { value: pct, invert: true },   // down is good here
  trend: series,
  sensitive: true,
  loading: loading && !data,
  empty: "Not measured.",
  tab: "revenue",                        // where the row opens
}
```

To make it a default pin, add its id to `DEFAULT_PINS` in
`lib/admin/ledger/pins.ts`.
