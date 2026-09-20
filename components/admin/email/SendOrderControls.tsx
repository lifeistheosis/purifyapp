"use client";

// Who a send reaches first, and how many a day. Shared by the terms notice and
// the list sends, because both became jobs that can outlast a day's budget
// (lib/email/audienceOrder.ts).

import {
  JOB_ORDER_LABEL,
  JOB_ORDERS,
  type JobOrder,
} from "@/lib/email/audienceOrder";

import { Select } from "../Select";

const ink3 = { color: "var(--adm-ink-3)" } as const;

/** Who goes first, and how many a day. Shared by the two send cards. */
export function SendOrderControls({
  order,
  onOrder,
  perDay,
  onPerDay,
}: {
  order: JobOrder;
  onOrder: (o: JobOrder) => void;
  perDay: number | null;
  onPerDay: (n: number | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-sans text-[12px]" style={ink3}>
        Who goes first
      </span>
      <Select<JobOrder>
        value={order}
        onChange={onOrder}
        options={JOB_ORDERS.map((o) => ({
          value: o,
          label: JOB_ORDER_LABEL[o],
        }))}
        ariaLabel="Who gets it first"
        size="sm"
        className="w-auto"
      />
      <label
        className="flex items-center gap-1.5 font-sans text-[12px]"
        style={ink3}
      >
        <span>Most a day</span>
        <input
          type="number"
          min={1}
          max={1000}
          value={perDay ?? ""}
          placeholder="all the day allows"
          onChange={(e) => {
            const raw = e.target.value.trim();
            onPerDay(
              raw === "" ? null : Math.max(1, Math.min(1000, Number(raw) || 1))
            );
          }}
          className="w-32 rounded-[var(--adm-radius-sm)] border px-2 py-1 font-sans text-[12px] tabular-nums outline-none"
          style={{
            borderColor: "var(--adm-line-strong)",
            background: "var(--adm-control)",
            color: "var(--adm-ink)",
          }}
        />
      </label>
    </div>
  );
}
