"use client";

import Link from "next/link";
import { useState } from "react";

import { Card, DataTable, Pill } from "../primitives";
import { CountUp } from "./CountUp";
import { KpiTile } from "./KpiTile";
import { MetricToggle } from "./MetricToggle";
import { PeriodBar, type PeriodId } from "./PeriodBar";
import { Rail } from "./Rail";
import { Sparkline } from "./Sparkline";
import { StatList } from "./StatList";
import { TrendChart } from "./TrendChart";

/**
 * /admin/styleguide. Every ledger component in loading, empty, error,
 * populated and pinned states, plus the re-skinned primitives, on the
 * real tokens. Sample numbers are obviously samples: round, and labelled
 * as such in the page title.
 */

const SERIES = [12, 14, 13, 17, 19, 18, 22, 21, 24, 27, 26, 30, 29, 33];
const COMPARE = [10, 11, 12, 12, 14, 15, 15, 17, 18, 18, 20, 21, 23, 22];
const LABELS = SERIES.map((_, i) => `Aug ${i + 18}`);
const FALLING = [30, 28, 29, 26, 24, 25, 22, 21, 19, 20, 17, 16, 15, 14];

const RAIL_GROUPS = [
  { group: "Overview", tabs: [{ id: "overview", label: "Summary", eyebrow: "The pinned numbers" }] },
  {
    group: "Growth",
    tabs: [
      { id: "traffic", label: "Traffic" },
      { id: "growth", label: "Growth" },
      { id: "goals", label: "Goals" },
    ],
  },
  {
    group: "Revenue",
    tabs: [
      { id: "revenue", label: "Revenue" },
      { id: "orders", label: "Orders", badge: { count: 3, title: "3 awaiting payment" } },
    ],
  },
];

type Row = { id: string; source: string; gross: number; refunds: number; net: number };
const ROWS: Row[] = [
  { id: "shop", source: "Shop", gross: 1840.5, refunds: 120, net: 1720.5 },
  { id: "plus", source: "Purify Plus", gross: 964, refunds: 0, net: 964 },
  { id: "gifts", source: "Gifts", gross: 210, refunds: 30, net: 180 },
];

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 first:mt-0">
      <h2 className="adm-heading">{title}</h2>
      {note ? (
        <p className="mt-1 font-sans text-[12.5px]" style={{ color: "var(--adm-ink-2)" }}>
          {note}
        </p>
      ) : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function StateLabel({ children }: { children: string }) {
  return (
    <p className="mb-1.5 font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
      {children}
    </p>
  );
}

export function Styleguide() {
  const [period, setPeriod] = useState<PeriodId>("30d");
  const [compare, setCompare] = useState(true);
  const [pinned, setPinned] = useState(true);
  const [metric, setMetric] = useState<"mrr" | "dau">("mrr");
  const money = (v: number) => `$${v.toLocaleString("en-US")}`;

  return (
    <div className="adm min-h-[100dvh]" style={{ background: "var(--adm-bg)", color: "var(--adm-ink)" }}>
      <div className="mx-auto w-full max-w-[var(--adm-content-max)] px-4 py-6 md:px-8">
        <Link href="/admin" className="inline-flex min-h-[44px] items-center font-sans text-[12.5px]" style={{ color: "var(--adm-ink-2)" }}>
          <span aria-hidden>←</span>&nbsp;Admin
        </Link>
        <h1 className="adm-serif text-[26px] leading-tight" style={{ color: "var(--adm-ink)" }}>
          Ledger styleguide
        </h1>
        <p className="mt-1 font-sans text-[13px]" style={{ color: "var(--adm-ink-2)" }}>
          Every component in every state, on sample numbers. See docs/ADMIN-STYLE.md for the rules.
        </p>

        <Section title="Tokens" note="Two grounds, three inks, two accents. Nothing else has a hue.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {[
              ["--adm-canvas", "Canvas"],
              ["--adm-card", "Card"],
              ["--adm-line", "Hairline"],
              ["--adm-line-strong", "Outline"],
              ["--adm-ink", "Ink"],
              ["--adm-ink-2", "Muted"],
              ["--adm-up", "Up, gold"],
              ["--adm-down", "Down, red"],
            ].map(([token, name]) => (
              <div key={token} className="rounded-[var(--adm-radius)] border p-2" style={{ borderColor: "var(--adm-line)", background: "var(--adm-card)" }}>
                <div className="h-8 rounded-[var(--adm-radius-sm)] border" style={{ background: `var(${token})`, borderColor: "var(--adm-line)" }} />
                <p className="mt-1.5 font-sans text-[12px]">{name}</p>
                <p className="font-sans text-[11px]" style={{ color: "var(--adm-ink-3)" }}>
                  {token}
                </p>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Type" note="Serif in the wordmark and the page title only. Figures are tabular.">
          <div className="flex flex-wrap items-baseline gap-x-8 gap-y-3">
            <span className="adm-serif text-[26px]">Page title</span>
            <span className="adm-heading">Section heading, 15px medium</span>
            <span className="font-sans text-[30px] font-medium leading-none" style={{ fontVariantNumeric: "tabular-nums" }}>
              <CountUp value="12,480" />
            </span>
            <span className="font-sans text-[12.5px]" style={{ color: "var(--adm-ink-2)" }}>
              Label, 12.5px muted
            </span>
            <span className="font-sans text-[12px]" style={{ color: "var(--adm-up)" }}>
              +4.2%
            </span>
            <span className="font-sans text-[12px]" style={{ color: "var(--adm-down)" }}>
              −1.8%
            </span>
          </div>
        </Section>

        <Section title="PeriodBar">
          <PeriodBar
            period={period}
            onPeriod={setPeriod}
            allowCustom
            compare={compare}
            onCompare={setCompare}
            lastSynced={new Date()}
            failing={false}
            onRefresh={() => {}}
          />
        </Section>

        <Section title="KpiTile" note="Hover a tile for the pin. The pinned tile keeps its mark.">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <StateLabel>Populated, pinned</StateLabel>
              <KpiTile
                label="Paid subscribers"
                info="Active Plus and Pro entitlements at the last poll."
                value={1248}
                delta={{ value: 4.2 }}
                caption="vs prior 30 days"
                trend={SERIES}
                pinned={pinned}
                onPin={() => setPinned((p) => !p)}
              />
            </div>
            <div>
              <StateLabel>Populated, falling, money</StateLabel>
              <KpiTile label="Shop revenue 90d" value="$2,864.50" delta={{ value: -6.1 }} caption="vs prior 90 days" trend={FALLING} sensitive onPin={() => {}} />
            </div>
            <div>
              <StateLabel>Down is good</StateLabel>
              <KpiTile label="Churn" value="1.4%" delta={{ value: -0.3, invert: true, suffix: " pts" }} trend={FALLING} onPin={() => {}} />
            </div>
            <div>
              <StateLabel>Loading</StateLabel>
              <KpiTile label="Visitors 30d" loading onPin={() => {}} />
            </div>
            <div>
              <StateLabel>Empty</StateLabel>
              <KpiTile
                label="Catechism completions today"
                empty="No completions recorded yet."
                emptyHref={{ href: "/admin#tab=catechism", label: "Open Catechism" }}
                onPin={() => {}}
              />
            </div>
            <div>
              <StateLabel>Error</StateLabel>
              <KpiTile label="New users 30d" error="Could not read profiles." onPin={() => {}} />
            </div>
          </div>
        </Section>

        <Section title="TrendChart" note="One ink line, a dashed compare, two or three ticks, a hairline cursor.">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div>
              <StateLabel>Populated, with compare and a toggle</StateLabel>
              <TrendChart
                title={metric === "mrr" ? "MRR" : "Daily active users"}
                value={metric === "mrr" ? "$3,312" : 842}
                delta={{ value: metric === "mrr" ? 3.4 : -1.2 }}
                points={metric === "mrr" ? SERIES.map((v) => v * 100) : FALLING.map((v) => v * 30)}
                compare={compare ? (metric === "mrr" ? COMPARE.map((v) => v * 100) : COMPARE.map((v) => v * 30)) : undefined}
                compareLabel="prior"
                labels={LABELS}
                format={metric === "mrr" ? money : (v) => v.toLocaleString("en-US")}
                sensitive={metric === "mrr"}
                action={<MetricToggle value={metric} onChange={setMetric} />}
              />
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <StateLabel>Loading</StateLabel>
                <TrendChart title="Visitors" points={[]} loading />
              </div>
            </div>
            <div>
              <StateLabel>Empty</StateLabel>
              <TrendChart title="Catechism completions" points={[]} empty="No completions yet." emptyHref={{ href: "/admin#tab=catechism", label: "Open Catechism" }} />
            </div>
            <div>
              <StateLabel>Error</StateLabel>
              <TrendChart title="Revenue" points={[]} error="The revenue feed did not answer." />
            </div>
          </div>
        </Section>

        <Section title="StatList" note="The phone's Summary, and any breakdown by source.">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Card title="Populated">
              <StatList
                rows={[
                  { id: "shop", label: "Shop", value: "$1,720", delta: { value: 8.2 }, trend: SERIES, sensitive: true },
                  { id: "plus", label: "Purify Plus", value: "$964", delta: { value: -2.1 }, trend: FALLING, sensitive: true },
                  { id: "gifts", label: "Gifts", value: "$180", delta: { value: 0 }, trend: COMPARE, sensitive: true },
                  { id: "none", label: "Donations", value: null },
                ]}
              />
            </Card>
            <div className="grid grid-cols-1 gap-3">
              <Card title="Loading">
                <StatList rows={[]} loading />
              </Card>
              <Card title="Empty">
                <StatList rows={[]} empty="No sources yet." emptyHref={{ href: "/admin#tab=revenue", label: "Open Revenue" }} />
              </Card>
              <Card title="Error">
                <StatList rows={[]} error="The ledger did not answer." />
              </Card>
            </div>
          </div>
        </Section>

        <Section title="Sparkline" note="36px in a tile, 24px in a list. Ink, and a dashed muted compare.">
          <div className="flex flex-wrap items-end gap-6 rounded-[var(--adm-radius)] border p-4" style={{ background: "var(--adm-card)", borderColor: "var(--adm-line)" }}>
            <Sparkline data={SERIES} width={160} height={36} />
            <Sparkline data={FALLING} width={160} height={36} />
            <Sparkline data={COMPARE} width={160} height={36} dashed color="var(--adm-ink-2)" />
            <Sparkline data={SERIES} width={64} height={24} />
            <Sparkline data={[5, 5, 5, 5, 5]} width={64} height={24} />
          </div>
        </Section>

        <Section title="Pill" note="Hairline outline in its tone. Never a fill.">
          <div className="flex flex-wrap gap-2">
            <Pill>Neutral</Pill>
            <Pill tone="gold">Gold</Pill>
            <Pill tone="up">Up</Pill>
            <Pill tone="down">Down</Pill>
          </div>
        </Section>

        <Section title="DataTable" note="Cream header, hairlines, 44px rows, numerics right-aligned and tabular.">
          <DataTable<Row>
            columns={[
              { key: "source", label: "Source", render: (r) => r.source },
              { key: "gross", label: "Gross", align: "right", render: (r) => money(r.gross) },
              { key: "refunds", label: "Refunds", align: "right", render: (r) => money(r.refunds) },
              { key: "net", label: "Net", align: "right", render: (r) => money(r.net) },
            ]}
            rows={ROWS}
            rowKey={(r) => r.id}
          />
          <div className="mt-3">
            <StateLabel>Empty</StateLabel>
            <DataTable<Row> columns={[{ key: "source", label: "Source", render: (r) => r.source }]} rows={[]} rowKey={(r) => r.id} empty="No rows in this range." />
          </div>
        </Section>

        <Section title="Rail" note="232px, serif wordmark, gold text and a 2px bar on the active item, the Getting started card.">
          <div className="h-[560px] w-[232px] overflow-hidden border-r p-3" style={{ background: "var(--adm-rail)", borderColor: "var(--adm-line)" }}>
            <Rail groups={RAIL_GROUPS} active="revenue" onSelect={() => {}} roleLabel="Admin" />
          </div>
        </Section>
      </div>
    </div>
  );
}
