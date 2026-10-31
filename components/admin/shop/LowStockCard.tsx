"use client";

// EIKON's counted pieces against their restock lines (lib/shop/lowStock.ts).
// The same lines fire the owner's "running low" push after a sale. It lived
// on Fulfillment, and sits folded at the foot of the Catalogue's shelf since
// Fulfillment retired into Orders (the owner's r3-16 picks, 2026-10-30).

import { useCallback, useEffect, useState } from "react";

import { adminJson } from "@/lib/admin/fetchJson";
import type { LowStockRow } from "@/lib/shop/lowStock";

import { DataTable, Pill, ToolbarButton } from "../primitives";

const ink = { color: "var(--adm-ink)" } as const;
const ink3 = { color: "var(--adm-ink-3)" } as const;

export function LowStockCard() {
  const [data, setData] = useState<{ rows: LowStockRow[]; leadDays: number; windowDays: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const d = await adminJson<{ rows: LowStockRow[]; leadDays: number; windowDays: number }>("/api/admin/shop/low-stock");
    setData(d);
    setLoading(false);
  }, []);

  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- the mount
       read shares its path with Refresh; every write is past an await. */
    void load();
  }, [load]);

  const rows = data?.rows ?? [];
  const low = rows.filter((r) => r.low).length;
  return (
    <div>
      <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-sans text-[12px]" style={ink3}>
          {data
            ? `${low === 0 ? "Nothing is low." : `${low} piece${low === 1 ? " is" : "s are"} at or below the restock line.`} The line is what would sell in the ${data.leadDays} days a restock takes, at the last ${data.windowDays} days' pace, and never under two. The count is general stock: the shippable and quality control split is not recorded yet.`
            : "Reading stock…"}
        </p>
        <ToolbarButton onClick={load} loading={loading}>
          Refresh
        </ToolbarButton>
      </div>
      <DataTable<LowStockRow>
        rows={rows}
        rowKey={(r) => r.id}
        empty={loading ? "Reading stock…" : "No ready-to-ship EIKON piece has a stock count yet."}
        csvFilename="eikon-stock.csv"
        columns={[
          {
            key: "piece",
            label: "Piece",
            render: (r) => (
              <span className="inline-flex items-center gap-1.5">
                <span style={ink}>{r.title}</span>
                {r.low && <Pill tone="rose">{r.quantity === 0 ? "sold out" : "low"}</Pill>}
              </span>
            ),
            csv: (r) => r.title,
          },
          { key: "left", label: "General stock", align: "right", render: (r) => r.quantity, csv: (r) => r.quantity },
          { key: "line", label: "Restock line", align: "right", render: (r) => r.threshold, csv: (r) => r.threshold },
          { key: "pace", label: "Sold, last 60 days", align: "right", render: (r) => r.soldInWindow, csv: (r) => r.soldInWindow },
          {
            key: "cover",
            label: "Runs out in",
            align: "right",
            render: (r) => (r.daysOfCover == null ? <span style={ink3}>not selling</span> : `${r.daysOfCover} days`),
            csv: (r) => r.daysOfCover ?? "",
          },
        ]}
      />
    </div>
  );
}
