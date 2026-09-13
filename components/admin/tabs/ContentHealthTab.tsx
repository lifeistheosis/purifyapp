"use client";

// Content Health tab — read-only inventory of the data/ tree and the
// saints registry. Each row carries a file path the operator opens in
// the editor to fix the gap. No edits from this tab; authoring stays
// JSON-in-git.

import { useEffect, useState } from "react";
import { adminJson } from "@/lib/admin/fetchJson";
import { Card, DataTable, Pill, StatCard } from "../primitives";

type SaintRow = {
  slug: string;
  name: string;
  worksCount: number;
  complete: boolean;
  iconUrl: string | null;
  iconOk: boolean;
  hasDeI18n: boolean;
  hasLicensedWorks: boolean;
  filePath: string;
};

type Payload = {
  saints: {
    total: number;
    incomplete: number;
    missingIcons: number;
    noIconAtAll: number;
    missingDe: number;
    missingLicensedWorks: number;
    rows: SaintRow[];
  };
  calendar: { days: number; missingExamples: string[]; expectedDays: number };
  bible: { books: { book: string; chapters: number }[] };
};

type Filter = "all" | "incomplete" | "missingIcon" | "missingDe" | "missingAsin";

export function ContentHealthTab() {
  const [data, setData] = useState<Payload | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    let alive = true;
    adminJson<Payload>("/api/admin/content-health").then((j) => {
      if (alive && j) setData(j);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!data) {
    return <p className="font-sans text-detail text-paper/40 py-8 text-center">Loading…</p>;
  }

  const filtered = data.saints.rows.filter((r) => {
    switch (filter) {
      case "incomplete":
        return !r.complete;
      case "missingIcon":
        return !r.iconUrl || !r.iconOk;
      case "missingDe":
        return !r.hasDeI18n;
      case "missingAsin":
        return !r.hasLicensedWorks;
      default:
        return true;
    }
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <StatCard label="Saints" value={data.saints.total} />
        <StatCard
          label="Incomplete"
          value={data.saints.incomplete}
          accent={data.saints.incomplete > 0}
        />
        <StatCard
          label="Missing icon file"
          value={data.saints.missingIcons}
          accent={data.saints.missingIcons > 0}
        />
        <StatCard label="No icon URL set" value={data.saints.noIconAtAll} />
        <StatCard label="No de.json" value={data.saints.missingDe} />
        <StatCard label="No licensed-works" value={data.saints.missingLicensedWorks} />
      </div>

      <Card title="Calendar coverage">
        <p className="font-sans text-ui text-paper/85">
          <span className="tabular-nums font-semibold text-paper">
            {data.calendar.days}
          </span>{" "}
          / {data.calendar.expectedDays} days have entries in{" "}
          <span className="font-mono text-eyebrow">
            data/calendar/daily-saints.json
          </span>
          .
        </p>
        {data.calendar.missingExamples.length > 0 && (
          <p className="mt-2 font-sans text-caption text-paper/55">
            First gaps:{" "}
            <span className="font-mono">
              {data.calendar.missingExamples.join(", ")}
            </span>
          </p>
        )}
      </Card>

      <Card title="Bible book coverage" subtitle="Chapters per book directory under data/bible/.">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-1 font-sans text-caption">
          {data.bible.books.map((b) => (
            <div key={b.book} className="flex justify-between border-b border-paper/[0.06] py-1">
              <span className="text-paper/75">{b.book}</span>
              <span className="tabular-nums text-paper/55">{b.chapters}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card
        title={`Saints inventory · ${filtered.length} / ${data.saints.total}`}
        subtitle="Filter the list to find gaps. Each row links to the file you’d open to fix it."
        action={
          <div className="inline-flex items-center gap-2 flex-wrap">
            <FilterChip current={filter} value="all" set={setFilter}>
              All
            </FilterChip>
            <FilterChip current={filter} value="incomplete" set={setFilter}>
              Incomplete
            </FilterChip>
            <FilterChip current={filter} value="missingIcon" set={setFilter}>
              Missing icon
            </FilterChip>
            <FilterChip current={filter} value="missingDe" set={setFilter}>
              No de.json
            </FilterChip>
            <FilterChip current={filter} value="missingAsin" set={setFilter}>
              No licensed-works
            </FilterChip>
          </div>
        }
      >
        <DataTable
          rows={filtered}
          rowKey={(r) => r.slug}
          csvFilename="saints-inventory.csv"
          columns={[
            {
              key: "name",
              label: "Saint",
              render: (r) => (
                <div>
                  <p className="font-semibold text-paper">{r.name}</p>
                  <p className="font-mono text-eyebrow text-paper/45">{r.slug}</p>
                </div>
              ),
              csv: (r) => r.name,
            },
            {
              key: "complete",
              label: "Status",
              render: (r) =>
                r.complete ? (
                  <Pill tone="emerald">Complete</Pill>
                ) : (
                  <Pill tone="gold">Incomplete</Pill>
                ),
              csv: (r) => (r.complete ? "complete" : "incomplete"),
            },
            {
              key: "works",
              label: "Works",
              align: "right",
              render: (r) => r.worksCount,
              csv: (r) => r.worksCount,
            },
            {
              key: "icon",
              label: "Icon",
              render: (r) =>
                !r.iconUrl ? (
                  <Pill tone="neutral">Placeholder</Pill>
                ) : r.iconOk ? (
                  <Pill tone="emerald">OK</Pill>
                ) : (
                  <Pill tone="rose">Missing</Pill>
                ),
              csv: (r) =>
                !r.iconUrl ? "placeholder" : r.iconOk ? "ok" : "missing",
            },
            {
              key: "de",
              label: "de.json",
              render: (r) =>
                r.hasDeI18n ? (
                  <Pill tone="emerald">Yes</Pill>
                ) : (
                  <Pill tone="neutral">No</Pill>
                ),
              csv: (r) => (r.hasDeI18n ? "yes" : "no"),
            },
            {
              key: "licensed",
              label: "licensed-works",
              render: (r) =>
                r.hasLicensedWorks ? (
                  <Pill tone="emerald">Yes</Pill>
                ) : (
                  <Pill tone="neutral">No</Pill>
                ),
              csv: (r) => (r.hasLicensedWorks ? "yes" : "no"),
            },
          ]}
        />
      </Card>
    </div>
  );
}

function FilterChip({
  current,
  value,
  set,
  children,
}: {
  current: Filter;
  value: Filter;
  set: (f: Filter) => void;
  children: React.ReactNode;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => set(value)}
      className={
        "rounded-[var(--adm-radius-sm)] border px-2.5 py-1 font-sans text-eyebrow font-semibold transition-colors " +
        (active
          ? "border-gold/40 bg-gold/[0.08] text-gold-pale"
          : "border-paper/20 bg-paper/[0.04] text-paper/65 hover:text-paper")
      }
    >
      {children}
    </button>
  );
}
