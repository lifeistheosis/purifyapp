"use client";

// Traffic tab — full time-series with range picker and toggleable series.

import { useEffect, useState } from "react";
import { adminJson } from "@/lib/admin/fetchJson";
import { Card, ToolbarButton, Toolbar, DataTable } from "../primitives";
import { LineChart, SERIES_COLORS } from "../charts";

type Point = { date: string; visitors: number; views: number; signups: number };
type Range = "7d" | "30d" | "90d";

export function TrafficTab() {
  const [range, setRange] = useState<Range>("30d");
  const [points, setPoints] = useState<Point[]>([]);
  const [fetchedRange, setFetchedRange] = useState<Range | null>(null);
  const [show, setShow] = useState({ visitors: true, views: true, signups: true });
  // Loading is derived state: we're loading whenever the active range hasn't
  // been fetched yet. This avoids a synchronous setState() inside the effect.
  const loading = fetchedRange !== range;

  useEffect(() => {
    let alive = true;
    adminJson<{ points?: Point[] }>(`/api/admin/traffic?range=${range}`)
      .then((j) => {
        if (!alive) return;
        if (j) setPoints(j.points ?? []);
        setFetchedRange(range);
      })
      .catch(() => {
        if (alive) setFetchedRange(range);
      });
    return () => {
      alive = false;
    };
  }, [range]);

  const series = [
    { key: "visitors" as const, name: "Visitors", color: SERIES_COLORS[0] },
    { key: "views" as const, name: "Pageviews", color: SERIES_COLORS[1] },
    { key: "signups" as const, name: "Signups", color: SERIES_COLORS[3] },
  ]
    .filter((s) => show[s.key])
    .map((s) => ({ name: s.name, color: s.color, data: points.map((p) => p[s.key]) }));

  return (
    <div className="space-y-6">
      <Card
        title={`Traffic · ${range}`}
        action={
          <Toolbar>
            <ToolbarButton
              variant={range === "7d" ? "primary" : "default"}
              onClick={() => setRange("7d")}
            >
              7d
            </ToolbarButton>
            <ToolbarButton
              variant={range === "30d" ? "primary" : "default"}
              onClick={() => setRange("30d")}
            >
              30d
            </ToolbarButton>
            <ToolbarButton
              variant={range === "90d" ? "primary" : "default"}
              onClick={() => setRange("90d")}
            >
              90d
            </ToolbarButton>
          </Toolbar>
        }
      >
        <div className="flex flex-wrap items-center gap-3 mb-3">
          {(["visitors", "views", "signups"] as const).map((k, i) => (
            <label key={k} className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={show[k]}
                onChange={(e) => setShow({ ...show, [k]: e.target.checked })}
                className="accent-gold"
              />
              <span
                className="inline-block h-[3px] w-4 rounded-full"
                style={{ background: SERIES_COLORS[i === 2 ? 3 : i] }}
              />
              <span className="font-sans text-caption text-paper/70 capitalize">{k}</span>
            </label>
          ))}
        </div>
        {loading ? (
          <p className="font-sans text-detail text-paper/40 py-8 text-center">Loading…</p>
        ) : (
          <LineChart
            labels={points.map((p) => p.date.slice(5))}
            series={series}
            height={280}
          />
        )}
      </Card>

      <Card title="Daily breakdown">
        <DataTable
          rows={points.slice().reverse()}
          rowKey={(r) => r.date}
          csvFilename={`traffic-${range}.csv`}
          columns={[
            { key: "date", label: "Date", render: (r) => r.date, csv: (r) => r.date },
            {
              key: "visitors",
              label: "Visitors",
              align: "right",
              render: (r) => r.visitors,
              csv: (r) => r.visitors,
            },
            {
              key: "views",
              label: "Pageviews",
              align: "right",
              render: (r) => r.views,
              csv: (r) => r.views,
            },
            {
              key: "signups",
              label: "Signups",
              align: "right",
              render: (r) => r.signups,
              csv: (r) => r.signups,
            },
          ]}
        />
      </Card>
    </div>
  );
}
