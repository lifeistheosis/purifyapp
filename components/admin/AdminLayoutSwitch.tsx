"use client";

import { setLayout, useLayout, type Layout, type LayoutKey } from "@/lib/admin/layoutPreference";

import { Segmented } from "./daily/parts";

/**
 * His own A and B, in Settings (lib/admin/layoutPreference.ts): which Home he
 * sees, and how Traffic's chart shows the day still running.
 */
const ROWS: { key: LayoutKey; label: string; options: readonly (readonly [Layout, string])[] }[] = [
  { key: "home", label: "Home", options: [["a", "A, numbers"], ["b", "B, money"]] },
  { key: "today", label: "Today on the chart", options: [["a", "A, counting"], ["b", "B, apart"]] },
];

function Row({ k, label, options }: { k: LayoutKey; label: string; options: readonly (readonly [Layout, string])[] }) {
  const value = useLayout(k);
  return (
    <div className="flex flex-col gap-1 px-2 py-1">
      <span className="font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
        {label}
      </span>
      <Segmented<Layout> label={label} options={options} value={value} onChange={(v) => setLayout(k, v)} stretch />
    </div>
  );
}

export function AdminLayoutSwitch() {
  return (
    <div className="flex flex-col gap-0.5">
      {ROWS.map((r) => (
        <Row key={r.key} k={r.key} label={r.label} options={r.options} />
      ))}
    </div>
  );
}
