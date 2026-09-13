"use client";

// Traffic tab — full time-series with range picker and toggleable series.

import { useEffect, useState } from "react";
import { adminJson } from "@/lib/admin/fetchJson";
import { useLatestDay } from "@/lib/admin/latestDayPreference";
import { Card, ToolbarButton, Toolbar, DataTable } from "../primitives";
import { LineChart, SERIES_COLORS } from "../charts";

type Point = { date: string; visitors: number; views: number; signups: number };
// "all" is measured server-side from the oldest record, not from a constant,
// so the window grows with the data instead of stopping at 90 days. See
// daysSince in lib/admin/dayWindow.ts, which also caps it.
type Range = "7d" | "30d" | "90d" | "all";

export function TrafficTab() {
  const [range, setRange] = useState<Range>("30d");
  // Set from the Traffic hub's "Latest day" toggle, so At a glance and this
  // panel always agree about which day the charts end on.
  const latest = useLatestDay();
  // One key for everything that changes the request. Range alone used to be
  // the key; with the toggle, the same range can mean two different windows,
  // and a stored "30d" result must not satisfy a request for 30 finished days.
  const requestKey = `${range}:${latest}`;
  const [points, setPoints] = useState<Point[]>([]);
  const [fetchedKey, setFetchedKey] = useState<string | null>(null);
  // WHICH request failed, not a boolean. A boolean needed clearing at the top
  // of the effect, and a setState in an effect body is a cascading render (the
  // same lint rule the old theme toggle was rewritten for). Keyed by request it
  // clears itself: switching to 7d makes a stored "30d:now" stop matching.
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [show, setShow] = useState({ visitors: true, views: true, signups: true });
  // Loading is derived state: we're loading whenever the active request hasn't
  // been fetched yet. This avoids a synchronous setState() inside the effect.
  const loading = fetchedKey !== requestKey;
  const failed = failedKey === requestKey;

  useEffect(() => {
    let alive = true;
    const key = `${range}:${latest}`;
    adminJson<{ points?: Point[] }>(`/api/admin/traffic?range=${range}&latest=${latest}`)
      .then((j) => {
        if (!alive) return;
        // fetchedKey used to advance on failure with `points` untouched,
        // which cleared `loading` and drew a LineChart over an empty array: a
        // flat line along zero, indistinguishable from ninety days of nobody
        // visiting. The traffic route is one of the few that returns a real
        // 500, so the signal existed and was being thrown away here.
        if (!j) {
          setFailedKey(key);
          setPoints([]);
          setFetchedKey(key);
          return;
        }
        setPoints(j.points ?? []);
        setFetchedKey(key);
      })
      .catch(() => {
        if (!alive) return;
        setFailedKey(key);
        setPoints([]);
        setFetchedKey(key);
      });
    return () => {
      alive = false;
    };
  }, [range, latest]);

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
        title={`Traffic · ${range === "all" ? "all time" : range}`}
        subtitle={
          latest === "complete"
            ? "Through last night. Every day shown is finished; days close at midnight UTC."
            : "Up to now. The last day is still running, so it sits low until it closes."
        }
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
            <ToolbarButton
              variant={range === "all" ? "primary" : "default"}
              onClick={() => setRange("all")}
            >
              All
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
        {failed ? (
          <p
            className="font-sans text-detail py-8 text-center"
            style={{ color: "var(--adm-critical)" }}
          >
            The {range} series could not be read. Nothing is being drawn, because a chart of
            no data and a chart of no visitors look the same.
          </p>
        ) : loading ? (
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
