"use client";

// Every chart this panel ships, on one screen, with deterministic sample data.
//
// WHY THIS EXISTS. Charts are the hardest thing in the admin to look at,
// because every /api/admin route answers 403 without a session and a dev
// machine cannot sign in (the Supabase anon key in .env.local is revoked).
// So the redesign of a chart system could be typechecked, linted and unit
// tested, and still never once be SEEN before it reached production.
//
// This is not the /admin/preview that v5 deleted. That was 826 lines of static
// mockup reproducing a design system the panel had already moved off, drifting
// further from the real components every week. This renders the real exports
// from charts.tsx, so when they change, this changes.
//
// Deterministic data on purpose. Math.random here would produce a different
// series on the server than on the client and hydrate mismatched, and it would
// also make "did that curve change?" unanswerable between reloads.

import {
  AreaChart,
  BarChart,
  CalendarHeatmap,
  Donut,
  LineChart,
  Sparkline,
  SERIES_COLORS,
  chartColors,
} from "./charts";
import { useState } from "react";
import { Card, KpiCard, ChartFrame, Toolbar, ToolbarButton, Pill, SubTabs } from "./primitives";
import { MetricCard, FeatureCard, PeriodChips, type PeriodId } from "./hero";

/** A smooth, repeatable wave. Same shape every render, on both sides. */
function wave(n: number, seed: number, amp = 40, base = 60): number[] {
  return Array.from({ length: n }, (_, i) =>
    Math.round(
      base +
        amp * Math.sin((i + seed) / 3.1) +
        (amp / 2.4) * Math.sin((i + seed) / 1.7) +
        i * 0.9,
    ),
  );
}

const DAYS = Array.from({ length: 30 }, (_, i) => `${30 - i}d`);

export function ChartGallery() {
  const [slider, setSlider] = useState(38);
  const [period, setPeriod] = useState<PeriodId>("30d");
  const [sub, setSub] = useState<"one" | "two">("one");
  const a = wave(30, 0);
  const b = wave(30, 4, 26, 40);
  const c = wave(30, 9, 18, 22);

  return (
    <div className="adm min-h-[100dvh]">
      <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6">
        <header className="mb-6">
          <p className="font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
            Development only. Not reachable in production.
          </p>
          <h1
            className="mt-1 font-sans text-[28px] font-semibold tracking-[-0.02em]"
            style={{ color: "var(--adm-ink)" }}
          >
            Chart gallery
          </h1>
          <p className="mt-1 font-sans text-[13px]" style={{ color: "var(--adm-ink-2)" }}>
            Every chart the admin ships, on sample data. Two AreaCharts sit side
            by side below on purpose: that is the arrangement that used to prove
            the gradient-id collision, where the second one rendered with no fill.
          </p>
        </header>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <MetricCard
            id="gallery-a"
            eyebrow="Sample"
            title="MetricCard"
            label="Hero sparkline, 30 points"
            value="12,480"
            delta={{ value: 8.2, positive: true }}
            points={a}
            color="var(--adm-s1)"
          />
          <MetricCard
            id="gallery-b"
            eyebrow="Sample"
            title="Falling series"
            label="Negative delta"
            value="3,204"
            delta={{ value: -4.6, positive: false }}
            points={[...b].reverse()}
            color="var(--adm-s5)"
          />
          <MetricCard
            id="gallery-c"
            eyebrow="Sample"
            title="Flat series"
            label="Zero span, must not divide by zero"
            value="500"
            points={Array.from({ length: 30 }, () => 500)}
            color="var(--adm-s4)"
          />
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <ChartFrame title="AreaChart" subtitle="One series, gradient to transparent">
            <AreaChart
              series={[{ name: "Net", color: SERIES_COLORS[0], data: a }]}
              labels={DAYS}
            />
          </ChartFrame>
          <ChartFrame title="AreaChart, second instance" subtitle="Must also have a fill">
            <AreaChart
              series={[{ name: "Net", color: SERIES_COLORS[2], data: b }]}
              labels={DAYS}
            />
          </ChartFrame>
        </div>

        <div className="mb-6">
          <ChartFrame title="LineChart" subtitle="Three series, smoothed, no gridlines">
            <LineChart
              series={[
                { name: "Visitors", color: SERIES_COLORS[0], data: a },
                { name: "Pageviews", color: SERIES_COLORS[1], data: b },
                { name: "Signups", color: SERIES_COLORS[3], data: c },
              ]}
              labels={DAYS}
              height={280}
            />
          </ChartFrame>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <Card title="BarChart" subtitle="Horizontal, the only orientation in use">
            <BarChart
              rows={[
                { label: "Greece", value: 412 },
                { label: "Romania", value: 305 },
                { label: "United States", value: 288 },
                { label: "Georgia", value: 140 },
                { label: "Serbia", value: 96 },
              ]}
            />
          </Card>
          <Card title="Donut" subtitle="Six segments, the full series ramp">
            <Donut
              label="Sample"
              segments={SERIES_COLORS.map((color, i) => ({
                name: `Series ${i + 1}`,
                value: 60 - i * 8,
                color,
              }))}
            />
          </Card>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <Card title="Sparkline" subtitle="The small one, inside KpiCard">
            <div className="grid gap-4 sm:grid-cols-2">
              <KpiCard label="Visitors" value="12,480" trend={a} delta={{ value: 8.2, positive: true }} />
              <KpiCard label="Signups" value="284" trend={c} delta={{ value: -2.1, positive: false }} />
            </div>
            <div className="mt-4 flex items-center gap-4">
              <Sparkline data={a} />
              <Sparkline data={b} color={chartColors.info} />
              <Sparkline data={c} color={chartColors.positive} />
            </div>
          </Card>
          <Card title="CalendarHeatmap" subtitle="12 weeks">
            <CalendarHeatmap
              data={Array.from({ length: 84 }, (_, i) => {
                const d = new Date(Date.UTC(2026, 5, 1));
                d.setUTCDate(d.getUTCDate() + i);
                return { date: d.toISOString().slice(0, 10), value: wave(84, 2, 30, 34)[i] };
              })}
            />
          </Card>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-[1fr_minmax(260px,0.8fr)]">
          <Card title="Controls" subtitle="The slider, the buttons, the chips">
            <div className="space-y-5">
              <div>
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <span className="font-sans text-[12px] font-medium" style={{ color: "var(--adm-ink-2)" }}>
                    Range slider
                  </span>
                  <span className="font-sans text-[12.5px] tabular-nums" style={{ color: "var(--adm-ink)" }}>
                    {slider}%
                  </span>
                </div>
                {/* Same markup and the same --_pct mechanism the owner
                    dashboard's assumption sliders use. */}
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={slider}
                  onChange={(e) => setSlider(Number(e.target.value))}
                  aria-label="Sample range"
                  className="adm-range"
                  style={{ ["--_pct" as string]: `${slider}%` }}
                />
              </div>

              <Toolbar>
                <ToolbarButton variant="primary" onClick={() => {}}>Primary</ToolbarButton>
                <ToolbarButton onClick={() => {}}>Default</ToolbarButton>
                <ToolbarButton variant="danger" onClick={() => {}}>Danger</ToolbarButton>
                <ToolbarButton onClick={() => {}} loading>Loading</ToolbarButton>
              </Toolbar>

              <div className="flex flex-wrap items-center gap-3">
                <PeriodChips active={period} onChange={setPeriod} options={["7d", "30d"]} />
                <SubTabs tabs={[["one", "First"], ["two", "Second"]] as const} active={sub} onChange={setSub} />
              </div>

              <div className="flex flex-wrap gap-2">
                <Pill>Neutral</Pill>
                <Pill tone="gold">Accent</Pill>
                <Pill tone="emerald">Good</Pill>
                <Pill tone="rose">Critical</Pill>
              </div>
            </div>
          </Card>

          <FeatureCard
            badge="New"
            title="The one gradient surface"
            body="Base gradient under every piece of text, vivid magenta as a corner bloom capped at 20 percent. Body copy clears 4.63:1 at its worst point."
            primary={{ label: "Primary action", onClick: () => {} }}
            secondary={{ label: "Secondary", onClick: () => {} }}
          />
        </div>

        <Card title="Empty states" subtitle="Every chart with nothing to draw">
          <div className="grid gap-4 md:grid-cols-3">
            <ChartFrame title="LineChart">
              <LineChart series={[{ name: "None", color: SERIES_COLORS[0], data: [] }]} />
            </ChartFrame>
            <ChartFrame title="BarChart">
              <BarChart rows={[]} />
            </ChartFrame>
            <ChartFrame title="Sparkline">
              <Sparkline data={[]} />
            </ChartFrame>
          </div>
        </Card>
      </div>
    </div>
  );
}
