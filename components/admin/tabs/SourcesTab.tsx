"use client";

// Sources: where visits came from, and what they were read on.
//
// The owner, 2026-10-06: "I kind of want to start tracking where my traffic is
// coming from and what platform they're using to view Purify, so we can gain
// a little more clarity on where they're coming from." Both were already kept
// on every visit and shown nowhere. This is where they are shown, counted over
// a window; the Live panel says the same two things about each reader on the
// site right now.
//
// Read once when the panel opens or the range changes, never on a timer: a
// window of days is thousands of rows (app/api/admin/sources/route.ts).

import { useEffect, useState } from "react";

import { adminJson } from "@/lib/admin/fetchJson";

import { BarChart, Donut, SERIES_COLORS } from "../charts";
import { Card, DataTable, StatCard, Toolbar, ToolbarButton } from "../primitives";

type Tally = { key: string; label: string; count: number };

type Sources = {
  range: Range;
  windowDays: number;
  total: number;
  sources: Tally[];
  /** The same for the website alone. Absent from an answer cached before it existed. */
  websiteSources?: Tally[];
  places: (Tally & { kind: string })[];
  platforms: Tally[];
  appSessions: number;
  websiteSessions: number;
  /** Set when the window held more sessions than one answer reads. */
  partial?: { rows: number } | null;
  /** Set instead of everything above when the read failed. */
  unavailable?: string;
};

type Range = "1d" | "7d" | "30d";

const RANGES: readonly (readonly [Range, string])[] = [
  ["1d", "Today"],
  ["7d", "7 days"],
  ["30d", "30 days"],
];

const KIND_WORD: Record<string, string> = {
  search: "Search",
  social: "Social",
  email: "Email",
  assistant: "AI assistant",
  site: "Another site",
};

/** A share of the whole. A place that sent a few visits is "under 1%", never a flat zero. */
function share(part: number, whole: number): string {
  if (whole <= 0 || part <= 0) return "0%";
  const pct = Math.round((part / whole) * 100);
  return pct < 1 ? "under 1%" : `${pct}%`;
}

export function SourcesTab() {
  const [range, setRange] = useState<Range>("7d");
  // Kept with the range it was read for, so a slow answer for the range the
  // owner has already left never draws under the new one's name.
  const [got, setGot] = useState<{ range: Range; data: Sources } | null>(null);

  useEffect(() => {
    let alive = true;
    adminJson<Sources>(`/api/admin/sources?range=${range}`).then((j) => {
      if (alive && j) setGot({ range, data: j });
    });
    return () => {
      alive = false;
    };
  }, [range]);

  const data = got?.range === range ? got.data : null;
  const span = RANGES.find(([r]) => r === range)?.[1] ?? "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-sans text-caption text-paper/55">
          Where each visit came from and what it was read on. Counted from visits, not people.
        </p>
        <Toolbar>
          {RANGES.map(([r, label]) => (
            <ToolbarButton key={r} variant={range === r ? "primary" : "default"} onClick={() => setRange(r)}>
              {label}
            </ToolbarButton>
          ))}
        </Toolbar>
      </div>

      {!data ? (
        <p className="font-sans text-detail text-paper/40 py-8 text-center">Loading…</p>
      ) : data.unavailable ? (
        <p className="font-sans text-detail text-paper/60 py-8 text-center">{data.unavailable}</p>
      ) : (
        <>
          {data.partial ? (
            <p className="font-sans text-caption text-paper/60">
              Counted from the first {data.partial.rows.toLocaleString()} visits only, so every figure below is short.
              Pick a shorter range for a whole count.
            </p>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard label={`Visits · ${span}`} value={data.total.toLocaleString()} accent hint="every visit started in the window" />
            <StatCard
              label="In the apps"
              value={data.appSessions.toLocaleString()}
              hint={`${share(data.appSessions, data.total)} of visits: Android, iPhone and Windows together`}
            />
            <StatCard
              label="On the website"
              value={data.websiteSessions.toLocaleString()}
              hint={`${share(data.websiteSessions, data.total)} of visits, in a browser`}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card
              title={`Where website visits came from · ${span}`}
              subtitle="The apps are left out here: an app is opened, not arrived at. Direct is a typed address, a bookmark, or a link from somewhere that does not say where it was (most mail and chat apps)."
            >
              <BarChart rows={(data.websiteSources ?? data.sources).map((s) => ({ label: s.label, value: s.count }))} />
            </Card>
            <Card title={`What they read on · ${span}`}>
              <Donut
                segments={data.platforms
                  .filter((p) => p.count > 0)
                  .map((p, i) => ({ name: p.label, value: p.count, color: SERIES_COLORS[i % SERIES_COLORS.length] }))}
                label={span}
                showValues
              />
            </Card>
          </div>

          <Card title={`The places by name · ${span}`} subtitle="Every place that sent at least one visit, most first. Direct visits have no place to name.">
            <DataTable
              rows={data.places}
              rowKey={(p) => p.key}
              csvFilename={`sources-${range}.csv`}
              columns={[
                { key: "place", label: "Place", render: (p) => p.label, csv: (p) => p.label },
                { key: "kind", label: "Kind", render: (p) => KIND_WORD[p.kind] ?? p.kind, csv: (p) => KIND_WORD[p.kind] ?? p.kind },
                { key: "count", label: "Visits", align: "right", render: (p) => p.count.toLocaleString(), csv: (p) => p.count },
                {
                  key: "share",
                  label: "Of website visits",
                  align: "right",
                  render: (p) => share(p.count, data.websiteSessions),
                  csv: (p) => share(p.count, data.websiteSessions),
                },
              ]}
            />
          </Card>

          <p className="font-sans text-caption text-paper/45">
            Since October 6, 2026 the links in our own emails end in a short tag, so a visit from one is named here as
            &ldquo;Our email&rdquo; whatever the mail app hides. Emails sent before that day have none, and their readers
            still arrive as Direct. To name a link you post yourself, end it with <code>?via=tiktok-bio</code> or{" "}
            <code>?via=discord-news</code>: the first word is the place, the rest is yours.
          </p>
        </>
      )}
    </div>
  );
}
