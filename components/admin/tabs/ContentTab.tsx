"use client";

// Content tab — top bumped saints, top profile views, top councils / bible /
// topics, plus the editorial saint-grid with inline mark-complete toggles.

import { useEffect, useState, useTransition } from "react";
import { adminJson } from "@/lib/admin/fetchJson";
import { Card, DataTable, Pill, ToolbarButton, Toolbar } from "../primitives";
import { BarChart, SERIES_COLORS } from "../charts";

type Bump = {
  slug: string;
  name: string;
  complete: boolean;
  overridden: boolean;
  bumps: number;
  lastBumpedAt: string;
  views30d: number;
};
type SaintView = { slug: string; name: string; views: number; complete: boolean };
type CouncilView = { slug: string; count: number };
type BibleView = { book: string; count: number };
type TopicView = { slug: string; count: number };
type PageView = { path: string; count: number };
type GridRow = {
  slug: string;
  name: string;
  worksCount: number;
  bumps: number;
  views30d: number;
  complete: boolean;
  overridden: boolean;
};

type Payload = {
  topBumps: Bump[];
  totalBumps: number;
  topSaintsByViews: SaintView[];
  topCouncils: CouncilView[];
  topBibleBooks: BibleView[];
  topTopics: TopicView[];
  topPages: PageView[];
  saintGrid: GridRow[];
};

export function ContentTab() {
  const [data, setData] = useState<Payload | null>(null);
  const [filter, setFilter] = useState<"all" | "incomplete" | "complete">("all");
  const [search, setSearch] = useState("");
  const [, startTransition] = useTransition();

  async function reload() {
    const r = await fetch("/api/admin/content", { cache: "no-store" });
    if (r.ok) setData(await r.json());
  }

  useEffect(() => {
    let alive = true;
    adminJson<Payload>("/api/admin/content").then((j) => {
      if (alive && j) setData(j);
    });
    return () => {
      alive = false;
    };
  }, []);

  async function toggleComplete(slug: string, next: boolean | null) {
    const r = await fetch("/api/admin/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "saint-complete", slug, complete: next }),
    });
    if (r.ok) startTransition(() => reload());
  }

  if (!data) {
    return <p className="font-sans text-detail text-paper/40 py-8 text-center">Loading…</p>;
  }

  const grid = data.saintGrid
    .filter((g) =>
      filter === "all"
        ? true
        : filter === "complete"
        ? g.complete
        : !g.complete,
    )
    .filter(
      (g) =>
        !search ||
        g.name.toLowerCase().includes(search.toLowerCase()) ||
        g.slug.toLowerCase().includes(search.toLowerCase()),
    );

  return (
    <div className="space-y-6">
      {/* Top bumps + top views side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title={`Top bumped saints · ${data.totalBumps} total`}
          subtitle="Editorial queue, most-requested first."
          accent
        >
          <BarChart
            rows={data.topBumps.slice(0, 10).map((b) => ({
              label: b.name + (b.complete ? "  ✓" : ""),
              value: b.bumps,
            }))}
          />
        </Card>
        <Card title="Top-viewed saint profiles · 30d">
          <BarChart
            rows={data.topSaintsByViews
              .slice(0, 10)
              .map((s) => ({ label: s.name, value: s.views }))}
            accent={SERIES_COLORS[1]}
          />
        </Card>
      </div>

      {/* Bumps table with manage controls */}
      <Card
        title="Bump leaderboard"
        subtitle="Per-saint detail. Click ✓ to mark a saint's corpus fully shipped (retires the public bump button), ✕ to clear an override and fall back to the registry value."
      >
        <DataTable
          rows={data.topBumps}
          rowKey={(r) => r.slug}
          csvFilename="bumps.csv"
          columns={[
            {
              key: "name",
              label: "Saint",
              render: (r) => (
                <a
                  href={`/saints/${r.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-gold transition-colors"
                >
                  {r.name}
                </a>
              ),
              csv: (r) => r.name,
            },
            {
              key: "bumps",
              label: "Bumps",
              align: "right",
              render: (r) => r.bumps,
              csv: (r) => r.bumps,
            },
            {
              key: "views",
              label: "Views 30d",
              align: "right",
              render: (r) => r.views30d,
              csv: (r) => r.views30d,
            },
            {
              key: "status",
              label: "Status",
              render: (r) => (
                <div className="flex items-center gap-2">
                  {r.complete && <Pill tone="gold">Complete</Pill>}
                  {r.overridden && <Pill tone="neutral">Override</Pill>}
                </div>
              ),
              csv: (r) => (r.complete ? "complete" : "open"),
            },
            {
              key: "actions",
              label: "",
              render: (r) => (
                <div className="flex gap-1">
                  {!r.complete && (
                    <ToolbarButton
                      variant="primary"
                      onClick={() => toggleComplete(r.slug, true)}
                      title="Mark fully published"
                    >
                      ✓ Complete
                    </ToolbarButton>
                  )}
                  {r.complete && (
                    <ToolbarButton
                      variant="default"
                      onClick={() => toggleComplete(r.slug, false)}
                      title="Reopen the bump button"
                    >
                      Reopen
                    </ToolbarButton>
                  )}
                  {r.overridden && (
                    <ToolbarButton
                      variant="danger"
                      onClick={() => toggleComplete(r.slug, null)}
                      title="Clear override, use registry value"
                    >
                      Clear
                    </ToolbarButton>
                  )}
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Top X charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Top councils · 30d">
          <BarChart
            rows={data.topCouncils.map((c) => ({
              label: c.slug.replace(/-/g, " "),
              value: c.count,
            }))}
          />
        </Card>
        <Card title="Top Bible books · 30d">
          <BarChart
            rows={data.topBibleBooks.map((b) => ({ label: b.book, value: b.count }))}
            accent={SERIES_COLORS[2]}
          />
        </Card>
        <Card title="Top topics · 30d">
          <BarChart
            rows={data.topTopics.map((t) => ({
              label: t.slug.replace(/-/g, " "),
              value: t.count,
            }))}
            accent={SERIES_COLORS[3]}
          />
        </Card>
      </div>

      <Card title="Top pages · 30d">
        <DataTable
          rows={data.topPages}
          rowKey={(r) => r.path}
          csvFilename="pages-30d.csv"
          columns={[
            {
              key: "path",
              label: "Path",
              render: (r) => (
                <a
                  href={r.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-caption hover:text-gold"
                >
                  {r.path}
                </a>
              ),
              csv: (r) => r.path,
            },
            {
              key: "count",
              label: "Views",
              align: "right",
              render: (r) => r.count,
              csv: (r) => r.count,
            },
          ]}
        />
      </Card>

      {/* Editorial saint grid */}
      <Card
        title={`Saint registry grid · ${data.saintGrid.length} entries`}
        subtitle="Every saint in the registry with bumps, views, and the effective complete flag. Filter + search to find what to translate next."
        action={
          <Toolbar>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="rounded-[var(--adm-radius-sm)] border border-paper/20 bg-paper/[0.04] px-2 py-1 font-sans text-caption text-paper placeholder:text-paper/40 focus:outline-none focus:border-gold/60"
            />
            <ToolbarButton
              variant={filter === "all" ? "primary" : "default"}
              onClick={() => setFilter("all")}
            >
              All
            </ToolbarButton>
            <ToolbarButton
              variant={filter === "incomplete" ? "primary" : "default"}
              onClick={() => setFilter("incomplete")}
            >
              Open
            </ToolbarButton>
            <ToolbarButton
              variant={filter === "complete" ? "primary" : "default"}
              onClick={() => setFilter("complete")}
            >
              Complete
            </ToolbarButton>
          </Toolbar>
        }
      >
        <DataTable
          rows={grid}
          rowKey={(r) => r.slug}
          csvFilename="saint-grid.csv"
          columns={[
            {
              key: "name",
              label: "Saint",
              render: (r) => (
                <a
                  href={`/saints/${r.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-gold"
                >
                  {r.name}
                </a>
              ),
              csv: (r) => r.name,
            },
            {
              key: "works",
              label: "Works",
              align: "right",
              render: (r) => r.worksCount,
              csv: (r) => r.worksCount,
            },
            {
              key: "bumps",
              label: "Bumps",
              align: "right",
              render: (r) => r.bumps,
              csv: (r) => r.bumps,
            },
            {
              key: "views",
              label: "Views 30d",
              align: "right",
              render: (r) => r.views30d,
              csv: (r) => r.views30d,
            },
            {
              key: "status",
              label: "Status",
              render: (r) => (
                <div className="flex items-center gap-2">
                  {r.complete ? (
                    <Pill tone="gold">Complete</Pill>
                  ) : (
                    <Pill tone="neutral">Open</Pill>
                  )}
                  {r.overridden && <Pill tone="emerald">Override</Pill>}
                </div>
              ),
              csv: (r) => (r.complete ? "complete" : "open"),
            },
            {
              key: "actions",
              label: "",
              render: (r) => (
                <div className="flex gap-1">
                  {!r.complete ? (
                    <ToolbarButton
                      variant="primary"
                      onClick={() => toggleComplete(r.slug, true)}
                    >
                      ✓
                    </ToolbarButton>
                  ) : (
                    <ToolbarButton
                      variant="default"
                      onClick={() => toggleComplete(r.slug, false)}
                    >
                      Reopen
                    </ToolbarButton>
                  )}
                  {r.overridden && (
                    <ToolbarButton
                      variant="danger"
                      onClick={() => toggleComplete(r.slug, null)}
                    >
                      Clear
                    </ToolbarButton>
                  )}
                </div>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
