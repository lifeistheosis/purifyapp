"use client";

// Engagement tab — which pages and sections people return to, and how many
// visitors come back. Reads /api/admin/engagement (range-aware).

import { useEffect, useState } from "react";
import { Card, StatCard, DataTable, ToolbarButton, Toolbar } from "../primitives";
import { BarChart, SERIES_COLORS } from "../charts";

type Range = "7d" | "30d" | "90d";

type Totals = {
  totalViews: number;
  visitors: number;
  avgPagesPerVisitor: number;
  returningSessions: number;
  returnRate: number;
  signedInUsers: number;
  recurringUsers: number;
  recurringRate: number;
};
type Section = {
  section: string;
  views: number;
  visitors: number;
  viewsPerVisitor: number;
};
type PageRow = {
  path: string;
  views: number;
  visitors: number;
  viewsPerVisitor: number;
};
type Payload = {
  range: Range;
  days: number;
  totals: Totals;
  sections: Section[];
  topPages: PageRow[];
  revisited: PageRow[];
};

export function EngagementTab() {
  const [range, setRange] = useState<Range>("30d");
  const [data, setData] = useState<Payload | null>(null);
  const [fetchedRange, setFetchedRange] = useState<Range | null>(null);
  const loading = fetchedRange !== range;

  useEffect(() => {
    let alive = true;
    fetch(`/api/admin/engagement?range=${range}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        setData(j);
        setFetchedRange(range);
      })
      .catch(() => {
        if (alive) setFetchedRange(range);
      });
    return () => {
      alive = false;
    };
  }, [range]);

  const rangeButtons = (
    <Toolbar>
      {(["7d", "30d", "90d"] as const).map((r) => (
        <ToolbarButton
          key={r}
          variant={range === r ? "primary" : "default"}
          onClick={() => setRange(r)}
        >
          {r}
        </ToolbarButton>
      ))}
    </Toolbar>
  );

  if (!data || loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-end">{rangeButtons}</div>
        <p className="font-sans text-detail text-paper/40 py-8 text-center">
          Loading…
        </p>
      </div>
    );
  }

  const t = data.totals;

  const pathCol = {
    key: "path",
    label: "Path",
    render: (r: PageRow) => (
      <a
        href={r.path}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-caption hover:text-gold"
      >
        {r.path}
      </a>
    ),
    csv: (r: PageRow) => r.path,
  };
  const visitorsCol = {
    key: "visitors",
    label: "Visitors",
    align: "right" as const,
    render: (r: PageRow) => r.visitors,
    csv: (r: PageRow) => r.visitors,
  };
  const viewsCol = {
    key: "views",
    label: "Views",
    align: "right" as const,
    render: (r: PageRow) => r.views,
    csv: (r: PageRow) => r.views,
  };
  const vpvCol = {
    key: "vpv",
    label: "Views / visitor",
    align: "right" as const,
    render: (r: PageRow) => r.viewsPerVisitor.toFixed(2),
    csv: (r: PageRow) => r.viewsPerVisitor,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="font-sans text-caption text-paper/45">
          Who comes back, and what they come back to · {range}
        </p>
        {rangeButtons}
      </div>

      {/* Recurrence KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Recurring users"
          value={t.recurringUsers}
          accent
          hint={`${t.recurringRate}% of ${t.signedInUsers} signed-in · ≥2 sessions`}
        />
        <StatCard
          label="Returning visits"
          value={`${t.returnRate}%`}
          hint={`${t.returningSessions} sessions seen across >1 day`}
        />
        <StatCard
          label="Pages / visitor"
          value={t.avgPagesPerVisitor}
          hint={`${t.totalViews.toLocaleString()} views`}
        />
        <StatCard
          label="Visitors"
          value={t.visitors}
          hint="distinct sessions in range"
        />
      </div>

      {/* Sections by reach */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="Sections by visitors"
          subtitle="How many distinct sessions opened each section of the site."
        >
          <BarChart
            rows={data.sections
              .slice(0, 12)
              .map((s) => ({ label: s.section, value: s.visitors }))}
          />
        </Card>
        <Card
          title="Sections by stickiness"
          subtitle="Views per visitor — higher means the section is revisited within a session."
        >
          <BarChart
            rows={[...data.sections]
              .filter((s) => s.visitors >= 5)
              .sort((a, b) => b.viewsPerVisitor - a.viewsPerVisitor)
              .slice(0, 12)
              .map((s) => ({ label: s.section, value: s.viewsPerVisitor }))}
            accent={SERIES_COLORS[1]}
          />
        </Card>
      </div>

      {/* Most revisited pages */}
      <Card
        title="Most revisited pages"
        subtitle="Highest views-per-visitor among pages reached by at least 5 visitors — the pages people return to."
      >
        <DataTable
          rows={data.revisited}
          rowKey={(r) => r.path}
          csvFilename={`revisited-${range}.csv`}
          columns={[pathCol, visitorsCol, viewsCol, vpvCol]}
        />
      </Card>

      {/* Top pages everyone visits */}
      <Card
        title="Most-visited pages"
        subtitle="Ranked by distinct visitors (unique sessions), not raw views."
      >
        <DataTable
          rows={data.topPages}
          rowKey={(r) => r.path}
          csvFilename={`top-pages-${range}.csv`}
          columns={[pathCol, visitorsCol, viewsCol, vpvCol]}
        />
      </Card>

      {/* Full section table */}
      <Card title="All sections">
        <DataTable
          rows={data.sections}
          rowKey={(r) => r.section}
          csvFilename={`sections-${range}.csv`}
          columns={[
            {
              key: "section",
              label: "Section",
              render: (r) => r.section,
              csv: (r) => r.section,
            },
            {
              key: "visitors",
              label: "Visitors",
              align: "right",
              render: (r) => r.visitors,
              csv: (r) => r.visitors,
            },
            {
              key: "views",
              label: "Views",
              align: "right",
              render: (r) => r.views,
              csv: (r) => r.views,
            },
            {
              key: "vpv",
              label: "Views / visitor",
              align: "right",
              render: (r) => r.viewsPerVisitor.toFixed(2),
              csv: (r) => r.viewsPerVisitor,
            },
          ]}
        />
      </Card>
    </div>
  );
}
