"use client";

// The strategic view. Three questions, in order: where are we, what is the
// model, and how far apart are those two.
//
// THE RULE THIS SCREEN IS BUILT AROUND. No projected number appears without
// the assumptions that produced it visible on the same screen. Not in a
// tooltip, not behind a disclosure: on the screen. A projection whose inputs
// are hidden is indistinguishable from a measurement, and the moment those
// two look alike the dashboard starts lying politely.
//
// So everything here is tagged one of two ways, and the tag is never
// decorative: MEASURED means something was counted, MODELLED means something
// was assumed. Where an input could be measured but is not yet, it says which
// and why rather than quietly defaulting.

import { useEffect, useMemo, useState } from "react";
import { adminJson } from "@/lib/admin/fetchJson";
import { Card, StatCard, SubTabs } from "@/components/admin/primitives";
import { MARKETS, COMPARABLE } from "@/data/market/markets";
import {
  SCENARIOS,
  project,
  localizationLift,
  rampToProjection,
  type Assumptions,
} from "@/lib/owner/projection";
import { calibrate, calibrated, type Actuals } from "@/lib/owner/actuals";
import { ProjectionChart } from "./ProjectionChart";

const usd = (n: number) =>
  "$" + Math.round(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
const pct = (n: number, dp = 2) => (n * 100).toFixed(dp) + "%";
const num = (n: number) => Math.round(n).toLocaleString("en-US");

type Panel = "today" | "model" | "markets";

/** A label that says which kind of number sits next to it. */
function Tag({ kind }: { kind: "measured" | "modelled" | "unavailable" }) {
  const map = {
    measured: { text: "Measured", fg: "var(--adm-good)" },
    modelled: { text: "Modelled", fg: "var(--adm-warn)" },
    unavailable: { text: "Not measurable yet", fg: "var(--adm-ink-3)" },
  } as const;
  const t = map[kind];
  return (
    <span
      className="ml-2 rounded-[var(--adm-radius-pill)] px-2 py-0.5 font-sans text-[10.5px] font-medium align-middle"
      style={{
        color: t.fg,
        background: `color-mix(in oklab, ${t.fg}, transparent 88%)`,
      }}
    >
      {t.text}
    </span>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (n: number) => string;
  onChange: (n: number) => void;
}) {
  // htmlFor rather than a wrapping label: the value read-out lives in the same
  // row as the name, so the label element holds two spans and the a11y rule
  // cannot tell which one names the control. An explicit id settles it.
  const id = "slider-" + label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <div className="block">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <label
          htmlFor={id}
          className="font-sans text-caption font-medium"
          style={{ color: "var(--adm-ink-2)" }}
        >
          {label}
        </label>
        <span
          className="font-mono text-[12.5px] tabular-nums"
          style={{ color: "var(--adm-ink)" }}
        >
          {format(value)}
        </span>
      </div>
      {/* --_pct is what paints the filled half of the track on WebKit, which
          has no ::-moz-range-progress equivalent. Computed here rather than
          in CSS because CSS cannot read an input's value. Guarded against a
          zero range, which would divide by zero and put the fill at NaN. */}
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="adm-range"
        style={
          {
            "--_pct": `${max > min ? ((value - min) / (max - min)) * 100 : 0}%`,
          } as React.CSSProperties
        }
      />
    </div>
  );
}

/**
 * Standalone at /owner until v4; now also the body of three tabs inside the
 * admin shell.
 *
 * `embedded` drops the chrome the shell already provides: its own ground, its
 * width cap, the header and the SubTabs row. `panel` then comes from the
 * shell's nav instead of local state. Standalone rendering is unchanged, so
 * app/owner/preview still works and the decomposition cost no behaviour.
 *
 * The gate banner is NOT dropped when embedded. It reports that OWNER_EMAILS
 * is unset, which is exactly the condition under which this content is
 * reachable by someone who should not see it, so hiding it inside the merged
 * shell would remove the warning from the only place it now matters.
 */
export function OwnerDashboard({
  ownerEmail,
  panel: panelProp,
  embedded = false,
  initial,
}: {
  ownerEmail: string;
  panel?: Panel;
  embedded?: boolean;
  /** Already-fetched /api/owner/actuals payload. When the shell gates this
      section on that request succeeding, it has the answer in hand, and
      re-requesting it here would double every load for nothing. */
  initial?: { actuals: Actuals; ownerListIsExplicit: boolean } | null;
}) {
  const [localPanel, setLocalPanel] = useState<Panel>("today");
  const panel = panelProp ?? localPanel;
  const [actuals, setActuals] = useState<Actuals | null>(initial?.actuals ?? null);
  const [gateIsExplicit, setGateIsExplicit] = useState(initial?.ownerListIsExplicit ?? true);
  const [failed, setFailed] = useState(false);
  const [a, setA] = useState<Assumptions>(SCENARIOS.moderate);
  const [useMeasuredPayRate, setUseMeasuredPayRate] = useState(false);

  useEffect(() => {
    if (initial) return;
    let alive = true;
    adminJson<{ actuals: Actuals; ownerListIsExplicit: boolean }>("/api/owner/actuals").then(
      (d) => {
        if (!alive) return;
        if (!d) {
          setFailed(true);
          return;
        }
        setActuals(d.actuals);
        setGateIsExplicit(d.ownerListIsExplicit);
      },
    );
    return () => {
      alive = false;
    };
  }, [initial]);

  const cal = useMemo(() => (actuals ? calibrate(actuals) : null), [actuals]);
  const effective = useMemo(
    () => (useMeasuredPayRate && cal ? calibrated(a, cal) : a),
    [a, cal, useMeasuredPayRate],
  );
  const p = useMemo(() => project(effective), [effective]);

  // Two series on one scale: where the business is, and where the assumptions
  // say it goes. 24 months, because a shorter window hides the shape and a
  // longer one implies a confidence this model does not have.
  const chart = useMemo(() => {
    const today = cal?.actuals.paidSubscribers ?? 0;
    const target = p.totals.subscribers;
    const ramp = rampToProjection(today, target, 24);
    return [
      {
        label: "Today, held flat",
        points: ramp.map(() => today),
        color: "var(--adm-s2)",
      },
      {
        label: "Projected",
        points: ramp.map((r) => r.subscribers),
        color: "var(--adm-s1)",
        dashed: true,
      },
    ];
  }, [cal, p.totals.subscribers]);

  const lifts = useMemo(
    () =>
      MARKETS.filter((m) => m.localeNeeded && m.communion === "eastern-orthodox")
        .map((m) => ({ market: m, ...localizationLift(m.id, effective) }))
        .sort((x, y) => y.deltaAnnualRevenueUsd - x.deltaAnnualRevenueUsd),
    [effective],
  );

  const body = (
    <>
        {!gateIsExplicit && (
          <div
            className="mb-5 rounded-[var(--adm-radius)] border p-3 font-sans text-[12.5px]"
            style={{
              borderColor: "color-mix(in oklab, var(--adm-warn), transparent 60%)",
              background: "color-mix(in oklab, var(--adm-warn), transparent 92%)",
              color: "var(--adm-ink-2)",
            }}
          >
            OWNER_EMAILS is unset, so this dashboard is currently open to
            everyone on ADMIN_EMAILS. Set it before a second admin address
            exists, or revenue and strategy come with the operational panel.
          </div>
        )}

        {panel === "today" && (
          <div className="space-y-6">
            <div>
              <h2
                className="mb-3 font-sans text-[13px] font-medium"
                style={{ color: "var(--adm-ink-3)" }}
              >
                Counted, not assumed
              </h2>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <StatCard label="Accounts" value={actuals ? num(actuals.totalUsers) : failed ? "Unavailable" : "…"} accent />
                <StatCard
                  label="Paying subscribers"
                  value={actuals ? num(actuals.paidSubscribers) : "…"}
                  hint={actuals ? `${num(actuals.comped)} comped, excluded` : undefined}
                />
                <StatCard
                  label="New accounts, 30d"
                  value={actuals ? num(actuals.newUsers30) : "…"}
                />
                <StatCard
                  label="Web sessions, 30d"
                  value={actuals ? num(actuals.visitors30) : "…"}
                  hint="not installs"
                />
              </div>
            </div>

            {cal && (
              <>
                <Card
                  title="Conversion, measured"
                  subtitle="Paying subscribers over accounts. Two counts, one division, no assumption anywhere in it."
                >
                  <p
                    className="font-mono text-[28px] font-semibold tabular-nums"
                    style={{ color: "var(--adm-ink)" }}
                  >
                    {pct(cal.observed.payRate)}
                    <Tag kind="measured" />
                  </p>
                  <p className="mt-2 font-sans text-caption" style={{ color: "var(--adm-ink-3)" }}>
                    The moderate scenario assumes {pct(SCENARIOS.moderate.payRate, 0)}. Where those
                    two disagree, this one is the fact.
                  </p>
                </Card>

                <Card
                  title="Where the traffic actually is"
                  subtitle="Countries mapped onto modelled markets. The United States is held out on purpose."
                >
                  {cal.observed.byMarket.length === 0 ? (
                    <p className="font-sans text-detail" style={{ color: "var(--adm-ink-3)" }}>
                      No attributable traffic in the window yet.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {cal.observed.byMarket.map((m) => (
                        <li key={m.market.id} className="flex items-center gap-3">
                          <span
                            className="w-48 shrink-0 truncate font-sans text-detail"
                            style={{ color: "var(--adm-ink-2)" }}
                          >
                            {m.market.name}
                          </span>
                          <span
                            className="h-2 flex-1 overflow-hidden rounded-[var(--adm-radius-pill)]"
                            style={{ background: "var(--adm-panel-2)" }}
                          >
                            <span
                              className="block h-full"
                              style={{
                                width: `${Math.max(2, m.shareOfTraffic * 100)}%`,
                                background: "var(--adm-accent)",
                              }}
                            />
                          </span>
                          <span
                            className="w-24 shrink-0 text-right font-mono text-[12px] tabular-nums"
                            style={{ color: "var(--adm-ink-3)" }}
                          >
                            {num(m.sessions30)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-4 font-sans text-caption" style={{ color: "var(--adm-ink-3)" }}>
                    {num(cal.observed.usSessions)} sessions from the United States are not shown
                    above. They could be Orthodox, Roman Catholic, or someone who found a saint
                    through TikTok, and nothing in the data tells them apart until a tradition
                    attribute exists. Assigning them would inflate the market this app most wants
                    to believe in.
                  </p>
                </Card>

                <Card
                  title="What the model still has to guess"
                  subtitle="Every input here could be measured. None of them can be today, and each says why."
                >
                  <ul className="space-y-3">
                    {cal.notObservable.map((n) => (
                      <li key={n.input}>
                        <p
                          className="font-sans text-detail font-medium"
                          style={{ color: "var(--adm-ink-2)" }}
                        >
                          {n.input}
                          <Tag kind="unavailable" />
                        </p>
                        <p
                          className="mt-0.5 max-w-[70ch] font-sans text-caption leading-snug"
                          style={{ color: "var(--adm-ink-3)" }}
                        >
                          {n.reason}
                        </p>
                      </li>
                    ))}
                  </ul>
                </Card>
              </>
            )}
          </div>
        )}

        {panel === "model" && (
          <div className="space-y-6">
            {/* One panel, in the shape the reference uses for its detail
                view: what this is and when, then the number, then the
                controls that move it, then the curve, then the breakdown.
                It was four stacked cards, which made the assumptions read as
                a separate screen from the result they produce. */}
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-sans text-caption" style={{ color: "var(--adm-ink-3)" }}>
                    {actuals
                      ? "Measured inputs as of " + new Date(actuals.asOf).toLocaleDateString()
                      : "Waiting on measured inputs"}
                  </p>
                  <h2
                    className="mt-0.5 font-sans text-[22px] font-semibold tracking-[-0.02em]"
                    style={{ color: "var(--adm-ink)" }}
                  >
                    Projection
                    <Tag kind="modelled" />
                  </h2>
                </div>
                {/* Scenario chips live in the header rather than above a
                    separate card: they are the coarsest control on the panel
                    and the reference puts its coarsest control here too. */}
                <div className="flex flex-wrap gap-1.5">
                  {(["conservative", "moderate", "aggressive"] as const).map((k) => {
                    const on =
                      a.installRate === SCENARIOS[k].installRate &&
                      a.payRate === SCENARIOS[k].payRate &&
                      a.annualRevenuePerSubscriber === SCENARIOS[k].annualRevenuePerSubscriber;
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => {
                          setA(SCENARIOS[k]);
                          setUseMeasuredPayRate(false);
                        }}
                        aria-pressed={on}
                        className="adm-control h-11 rounded-[var(--adm-radius-sm)] border px-3 font-sans text-[12.5px] font-medium capitalize"
                        style={
                          on
                            ? ({
                                ["--_bg"]:
                                  "linear-gradient(135deg, var(--adm-grad-from) 0%, var(--adm-grad-to) 100%)",
                                ["--_bg-hover"]:
                                  "linear-gradient(135deg, var(--adm-grad-to) 0%, var(--adm-grad-from) 100%)",
                                borderColor: "transparent",
                                color: "var(--adm-on-accent)",
                              } as React.CSSProperties)
                            : ({
                                ["--_bg"]: "var(--adm-control)",
                                ["--_bg-hover"]: "var(--adm-hover)",
                                borderColor: "var(--adm-line-strong)",
                                color: "var(--adm-ink-2)",
                              } as React.CSSProperties)
                        }
                      >
                        {k}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.85fr)]">
                {/* The hero value. Oversized because it is the one number the
                    whole panel exists to produce. Tagged modelled, and the
                    line under it names the measured quantity it is set
                    against, so the size cannot be mistaken for certainty. */}
                <div>
                  <p className="font-sans text-caption" style={{ color: "var(--adm-ink-3)" }}>
                    Annual revenue at these assumptions
                  </p>
                  <p
                    className="mt-1 font-sans text-[52px] font-bold leading-none tracking-[-0.03em] tabular-nums"
                    style={{ color: "var(--adm-ink)" }}
                  >
                    {usd(p.totals.annualRevenueUsd)}
                  </p>
                  <p className="mt-3 font-sans text-detail" style={{ color: "var(--adm-ink-2)" }}>
                    {num(p.totals.subscribers)} subscribers from {num(p.totals.installs)} installs,
                    against {cal ? num(cal.actuals.paidSubscribers) : "an unknown number of"} paying
                    today.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setA(SCENARIOS.moderate);
                        setUseMeasuredPayRate(false);
                      }}
                      className="adm-control h-11 rounded-[var(--adm-radius-sm)] border px-4 font-sans text-[12.5px] font-medium"
                      style={
                        {
                          ["--_bg"]: "var(--adm-control)",
                          ["--_bg-hover"]: "var(--adm-hover)",
                          borderColor: "var(--adm-line-strong)",
                          color: "var(--adm-ink-2)",
                        } as React.CSSProperties
                      }
                    >
                      Reset to moderate
                    </button>
                    <button
                      type="button"
                      disabled={!cal}
                      onClick={() => setUseMeasuredPayRate((v) => !v)}
                      aria-pressed={useMeasuredPayRate}
                      title={
                        cal
                          ? "Replace the pay-rate slider with the rate actually measured"
                          : "No measured actuals available"
                      }
                      className="adm-control h-11 rounded-[var(--adm-radius-sm)] border px-4 font-sans text-[12.5px] font-medium disabled:cursor-not-allowed disabled:opacity-45"
                      style={
                        useMeasuredPayRate
                          ? ({
                              ["--_bg"]: "var(--adm-control)",
                              ["--_bg-hover"]: "var(--adm-hover)",
                              borderColor: "var(--adm-good)",
                              color: "var(--adm-good)",
                            } as React.CSSProperties)
                          : ({
                              ["--_bg"]: "var(--adm-control)",
                              ["--_bg-hover"]: "var(--adm-hover)",
                              borderColor: "var(--adm-line-strong)",
                              color: "var(--adm-ink-2)",
                            } as React.CSSProperties)
                      }
                    >
                      {useMeasuredPayRate ? "Using measured pay rate" : "Use measured pay rate"}
                    </button>
                  </div>
                </div>

                {/* The control suite in a recessed well, the way the
                    reference groups its period controls: this reads as
                    "these are the knobs" rather than as more data. */}
                <div
                  className="rounded-[var(--adm-radius)] border p-4"
                  style={{ background: "var(--adm-panel-2)", borderColor: "var(--adm-line)" }}
                >
                  <p
                    className="mb-3 font-sans text-caption font-medium"
                    style={{ color: "var(--adm-ink-2)" }}
                  >
                    Assumptions
                  </p>
                  <div className="space-y-3">
                    <Slider
                      label="Install rate, of addressable"
                      value={a.installRate}
                      min={0.005}
                      max={0.25}
                      step={0.005}
                      format={(v) => pct(v, 1)}
                      onChange={(v) => setA({ ...a, installRate: v })}
                    />
                    <Slider
                      label="Pay rate, of installs"
                      value={effective.payRate}
                      min={0.005}
                      max={0.25}
                      step={0.005}
                      format={(v) => pct(v, 1)}
                      onChange={(v) => {
                        setUseMeasuredPayRate(false);
                        setA({ ...a, payRate: v });
                      }}
                    />
                    <Slider
                      label="Annual revenue per subscriber"
                      value={a.annualRevenuePerSubscriber}
                      min={10}
                      max={150}
                      step={5}
                      format={(v) => "$" + v}
                      onChange={(v) => setA({ ...a, annualRevenuePerSubscriber: v })}
                    />
                  </div>

                  <div
                    className="mt-4 space-y-2 border-t pt-3"
                    style={{ borderColor: "var(--adm-line)" }}
                  >
                    <label
                      className="flex items-center gap-2 font-sans text-caption"
                      style={{ color: "var(--adm-ink-2)" }}
                    >
                      <input
                        type="checkbox"
                        checked={a.includeCatholicSpillover}
                        onChange={(e) => setA({ ...a, includeCatholicSpillover: e.target.checked })}
                        style={{ accentColor: "var(--adm-accent)" }}
                      />
                      Count US Catholic spillover
                    </label>
                    <label
                      className="flex items-center gap-2 font-sans text-caption"
                      style={{ color: "var(--adm-ink-2)" }}
                    >
                      <input
                        type="checkbox"
                        checked={a.includeOrientalOrthodox}
                        onChange={(e) => setA({ ...a, includeOrientalOrthodox: e.target.checked })}
                        style={{ accentColor: "var(--adm-accent)" }}
                      />
                      Count Oriental Orthodox (different communion)
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t pt-5" style={{ borderColor: "var(--adm-line)" }}>
                <p className="mb-3 font-sans text-caption" style={{ color: "var(--adm-ink-3)" }}>
                  Solid is today held flat. Dashed is where the assumptions lead. Drag a slider and
                  watch the curve bend: the size of that bend is the sensitivity of the input.
                </p>
                <ProjectionChart
                  series={chart}
                  xLabel={(i, n) => (i === 0 ? "now" : "+" + (n - 1) + "mo")}
                  yFormat={(v) => num(v)}
                  caption="Projected subscriber growth against today's figure held flat."
                />
              </div>

              {/* The granular strip: four facets of one model, in the order
                  the maths runs. Pool, installs, subscribers, share. */}
              <div
                className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t pt-5 md:grid-cols-4"
                style={{ borderColor: "var(--adm-line)" }}
              >
                {[
                  { k: "Addressable", v: num(p.totals.addressable), h: "after reach and practice" },
                  { k: "Installs", v: num(p.totals.installs), h: "of the addressable pool" },
                  { k: "Subscribers", v: num(p.totals.subscribers), h: "of those installs" },
                  {
                    k: "Share vs " + COMPARABLE.name,
                    v: p.penetration.ratio.toFixed(2) + "x",
                    h: "of its own pool, measured the same way",
                  },
                ].map((m) => (
                  <div key={m.k}>
                    <p className="font-sans text-caption" style={{ color: "var(--adm-ink-3)" }}>
                      {m.k}
                    </p>
                    <p
                      className="mt-0.5 font-sans text-[24px] font-semibold leading-none tabular-nums"
                      style={{ color: "var(--adm-ink)" }}
                    >
                      {m.v}
                    </p>
                    <p className="mt-1 font-sans text-eyebrow" style={{ color: "var(--adm-ink-3)" }}>
                      {m.h}
                    </p>
                  </div>
                ))}
              </div>
            </Card>

            <Card
              title={`Penetration against ${COMPARABLE.name}`}
              subtitle="Share of its own addressable pool, both sides measured the same way. The comparison that matters, in whichever direction it actually falls."
            >
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                <div>
                  <p className="font-sans text-caption" style={{ color: "var(--adm-ink-3)" }}>
                    Purify
                  </p>
                  <p className="font-mono text-[24px] font-semibold tabular-nums" style={{ color: "var(--adm-ink)" }}>
                    {pct(p.penetration.purify)}
                  </p>
                </div>
                <div>
                  <p className="font-sans text-caption" style={{ color: "var(--adm-ink-3)" }}>
                    {COMPARABLE.name}
                  </p>
                  <p className="font-mono text-[24px] font-semibold tabular-nums" style={{ color: "var(--adm-ink)" }}>
                    {pct(p.penetration.comparable)}
                  </p>
                </div>
                <div>
                  <p className="font-sans text-caption" style={{ color: "var(--adm-ink-3)" }}>
                    Ratio
                  </p>
                  <p
                    className="font-mono text-[24px] font-semibold tabular-nums"
                    style={{
                      color: p.penetration.ratio >= 1 ? "var(--adm-good)" : "var(--adm-warn)",
                    }}
                  >
                    {p.penetration.ratio.toFixed(2)}x
                  </p>
                </div>
              </div>
              <p className="mt-3 max-w-[75ch] font-sans text-caption leading-snug" style={{ color: "var(--adm-ink-3)" }}>
                {p.penetration.ratio >= 1
                  ? `Deeper into a smaller pool, which is the shape a niche product should have. ${COMPARABLE.name} sells into a market roughly thirty times larger, so a smaller absolute revenue is not the same as a weaker business.`
                  : `Shallower, not deeper. On these assumptions Purify reaches a smaller share of its own pool than ${COMPARABLE.name} does of its much larger one, which is the expected shape for a young app and the honest read until the install and pay rates move.`}
              </p>
              <p className="mt-2 max-w-[75ch] font-sans text-caption leading-snug" style={{ color: "var(--adm-ink-3)" }}>
                {COMPARABLE.note}
              </p>
            </Card>

            <Card title="The assumptions behind every number above" accent>
              <ul className="grid gap-1 font-mono text-[12px] tabular-nums md:grid-cols-2" style={{ color: "var(--adm-ink-2)" }}>
                <li>install rate: {pct(effective.installRate, 1)} <Tag kind="modelled" /></li>
                <li>
                  pay rate: {pct(effective.payRate, 2)}
                  <Tag kind={useMeasuredPayRate ? "measured" : "modelled"} />
                </li>
                <li>revenue per subscriber: ${effective.annualRevenuePerSubscriber} <Tag kind="modelled" /></li>
                <li>
                  localized: {effective.localizedMarketIds.length ? effective.localizedMarketIds.join(", ") : "none"}
                </li>
                <li>oriental orthodox: {effective.includeOrientalOrthodox ? "included" : "excluded"}</li>
                <li>catholic spillover: {effective.includeCatholicSpillover ? "included" : "excluded"}</li>
              </ul>
            </Card>
          </div>
        )}

        {panel === "markets" && (
          <div className="space-y-6">
            <Card
              title="What each localization is worth"
              subtitle="The same engine, run twice per market: once with the language shipped and once without. The difference is the lift."
            >
              <ul className="space-y-2">
                {lifts.map((l) => (
                  <li key={l.market.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="w-40 shrink-0 font-sans text-detail" style={{ color: "var(--adm-ink-2)" }}>
                      {l.market.name}
                    </span>
                    <span className="font-mono text-[13px] tabular-nums" style={{ color: "var(--adm-ink)" }}>
                      {usd(l.deltaAnnualRevenueUsd)}
                    </span>
                    <span className="font-sans text-caption" style={{ color: "var(--adm-ink-3)" }}>
                      +{num(l.deltaSubscribers)} subscribers · needs {l.market.localeNeeded}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setA({
                          ...a,
                          localizedMarketIds: a.localizedMarketIds.includes(l.market.id)
                            ? a.localizedMarketIds.filter((x) => x !== l.market.id)
                            : [...a.localizedMarketIds, l.market.id],
                        })
                      }
                      className="ml-auto font-sans text-[12px] font-medium underline-offset-4 hover:underline"
                      style={{ color: "var(--adm-ink-3)" }}
                    >
                      {a.localizedMarketIds.includes(l.market.id) ? "Assume shipped ✓" : "Assume shipped"}
                    </button>
                  </li>
                ))}
              </ul>
            </Card>

            <Card
              title="The table everything rests on"
              subtitle="Every figure here is a judgement someone can overrule. Edit data/market/markets.ts and the whole dashboard moves."
            >
              <div className="overflow-x-auto">
                <table className="w-full font-sans text-caption">
                  <thead>
                    <tr style={{ color: "var(--adm-ink-3)" }}>
                      <th className="p-2 text-left font-medium">Market</th>
                      <th className="p-2 text-right font-medium">Population</th>
                      <th className="p-2 text-right font-medium">English reach</th>
                      <th className="p-2 text-right font-medium">Practising</th>
                      <th className="p-2 text-left font-medium">Source</th>
                      <th className="p-2 text-left font-medium">Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MARKETS.map((m) => (
                      <tr key={m.id} style={{ borderTop: "1px solid var(--adm-line)" }}>
                        <td className="p-2" style={{ color: "var(--adm-ink-2)" }}>
                          {m.name}
                          {m.communion === "oriental-orthodox" && (
                            <span className="ml-2" style={{ color: "var(--adm-warn)" }}>
                              different communion
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-right font-mono tabular-nums" style={{ color: "var(--adm-ink)" }}>
                          {num(m.population)}
                        </td>
                        <td className="p-2 text-right font-mono tabular-nums" style={{ color: "var(--adm-ink-3)" }}>
                          {pct(m.englishReach, 0)}
                        </td>
                        <td className="p-2 text-right font-mono tabular-nums" style={{ color: "var(--adm-ink-3)" }}>
                          {pct(m.practisingRate, 0)}
                        </td>
                        <td className="p-2" style={{ color: "var(--adm-ink-3)" }}>
                          {m.source} ({m.year})
                        </td>
                        <td
                          className="p-2"
                          style={{
                            color:
                              m.confidence === "high"
                                ? "var(--adm-good)"
                                : m.confidence === "medium"
                                  ? "var(--adm-warn)"
                                  : "var(--adm-critical)",
                          }}
                        >
                          {m.confidence}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
    </>
  );

  if (embedded) return body;

  return (
    <div className="adm min-h-[100dvh]">
      <div className="mx-auto w-full max-w-[1200px] px-4 py-6 md:px-6">
        <header className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <h1
              className="font-sans text-[20px] font-semibold tracking-[-0.01em]"
              style={{ color: "var(--adm-ink)" }}
            >
              Owner
            </h1>
            <p className="mt-0.5 font-sans text-caption" style={{ color: "var(--adm-ink-3)" }}>
              {ownerEmail}
              {actuals ? ` · data as of ${new Date(actuals.asOf).toLocaleString()}` : ""}
            </p>
          </div>
          <a
            href="/admin"
            className="adm-control inline-flex h-11 items-center gap-2 rounded-[var(--adm-radius-sm)] border px-4 font-sans text-[12.5px] font-medium"
            style={{
              ["--_bg" as string]: "var(--adm-control)",
              ["--_bg-hover" as string]: "var(--adm-hover)",
              borderColor: "var(--adm-line-strong)",
              color: "var(--adm-ink-2)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
              <path d="M12 5l-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Operational panel
          </a>
        </header>

        <div className="mb-5">
          <SubTabs
            tabs={
              [
                ["today", "Where we are"],
                ["model", "Projection"],
                ["markets", "Markets"],
              ] as const
            }
            active={panel}
            onChange={setLocalPanel}
          />
        </div>

        {body}
      </div>
    </div>
  );
}
