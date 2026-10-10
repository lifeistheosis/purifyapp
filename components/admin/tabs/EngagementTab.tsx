"use client";

// Engagement tab — which pages and sections people return to, and how many
// visitors come back. Reads /api/admin/engagement (range-aware).

import { useEffect, useState } from "react";
import { adminJson } from "@/lib/admin/fetchJson";
import { Card, StatCard, DataTable, ToolbarButton, Toolbar } from "../primitives";
import { BarChart } from "../charts";

// "all" is measured server-side from the oldest record, not from a constant,
// so the window grows with the data instead of stopping at 90 days. See
// daysSince in lib/admin/dayWindow.ts, which also caps it.
type Range = "7d" | "30d" | "90d" | "all";

type Totals = {
  totalViews: number;
  visitors: number;
  avgPagesPerVisitor: number;
  returningSessions: number;
  returnRate: number;
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
  /** Set when only the newest page views could be counted. */
  partial?: { rows: number; needs: string } | null;
  /** Set instead of everything above when the read failed. */
  unavailable?: string;
};

export function EngagementTab() {
  const [range, setRange] = useState<Range>("30d");
  const [data, setData] = useState<Payload | null>(null);
  const [fetchedRange, setFetchedRange] = useState<Range | null>(null);
  const loading = fetchedRange !== range;

  useEffect(() => {
    let alive = true;
    adminJson<Payload>(`/api/admin/engagement?range=${range}`).then((j) => {
      if (!alive) return;
      // Only replace on success. A failed range change leaves the previous
      // range's numbers up rather than blanking the panel, and fetchedRange
      // still advances so the loading state clears either way.
      if (j) setData(j);
      setFetchedRange(range);
    });
    return () => {
      alive = false;
    };
  }, [range]);

  const rangeButtons = (
    <Toolbar>
      {(["7d", "30d", "90d", "all"] as const).map((r) => (
        <ToolbarButton
          key={r}
          variant={range === r ? "chosen" : "default"}
          onClick={() => setRange(r)}
        >
          {r === "all" ? "All" : r}
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

  // The route answers 200 with a reason when it could not read, so that a
  // failed read says so here instead of leaving "Loading" up for ever.
  if (data.unavailable) {
    return (
      <div className="space-y-6">
        <div className="flex justify-end">{rangeButtons}</div>
        <p className="font-sans text-detail text-paper/60 py-8 text-center">{data.unavailable}</p>
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
        className="font-mono text-caption hover:text-gold-pale"
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

      {data.partial ? (
        <p className="font-sans text-caption text-paper/60">
          Counted from the newest {data.partial.rows.toLocaleString()} page views only, so every
          figure below is short. The whole count needs {data.partial.needs}.
        </p>
      ) : null}

      {/* Recurrence KPIs. "Recurring users" stood first here and was always 0:
          it counted signed-in sessions, and a session has never recorded who
          was signed in. See app/api/admin/engagement/route.ts. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Visitors"
          value={t.visitors.toLocaleString()}
          accent
          hint="distinct sessions in range"
        />
        <StatCard
          label="Views"
          value={t.totalViews.toLocaleString()}
          hint="every page opened in range"
        />
        <StatCard
          label="Pages / visitor"
          value={t.avgPagesPerVisitor}
          hint="views divided by visitors"
        />
        <StatCard
          label="Returning visits"
          value={`${t.returnRate}%`}
          hint={`${t.returningSessions.toLocaleString()} sessions seen across >1 day`}
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
          subtitle="Views per visitor. Higher means the section is revisited within a session."
        >
          <BarChart
            rows={[...data.sections]
              .filter((s) => s.visitors >= 5)
              .sort((a, b) => b.viewsPerVisitor - a.viewsPerVisitor)
              .slice(0, 12)
              .map((s) => ({ label: s.section, value: s.viewsPerVisitor }))}
          />
        </Card>
      </div>

      {/* Most revisited pages */}
      <Card
        title="Most revisited pages"
        subtitle="Highest views-per-visitor among pages reached by at least 5 visitors: the pages people return to."
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
