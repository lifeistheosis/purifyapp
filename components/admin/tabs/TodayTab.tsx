"use client";

import { useAttention } from "@/lib/admin/useAttention";
import { useLiveData } from "@/lib/admin/useLiveData";
import type { AttentionItem } from "@/lib/admin/attention";
import { formatPrice } from "@/lib/shop/format";

import { Card, KpiCard, StatusDot } from "../primitives";

/**
 * The admin's first page (1.8 admin silent patch).
 *
 * The owner's choice, 2026-10-20: "To-do + 4 numbers". Only what needs him,
 * then revenue today, paid subscribers, visitors and new readers. Everything
 * else is a click away in the rail. The deeper money view is Money: Overview.
 *
 * The to-do reads the same attention summary as the rail badges and the strip
 * above every page, so they cannot disagree. A queue that did not answer is
 * said plainly, never shown as nothing waiting.
 */

type Overview = { revenueTodayCents: number | null; ordersDegraded: boolean; paidPlus: number; paidPro: number };
type Stats = { today: { visitors: number | null; signups: number | null } };

const DASH = "—";

function open(tab: string) {
  window.location.hash = `tab=${tab}`;
}

export function TodayTab() {
  const { summary, refresh } = useAttention();
  const overview = useLiveData<Overview>("/api/admin/overview", 60_000);
  const stats = useLiveData<Stats>("/api/admin/stats", 20_000);

  const todo: AttentionItem[] = [...summary.faults, ...summary.queues];
  const gaps = summary.unmeasured;
  const checking = summary.state === "checking" && todo.length === 0;

  const t = stats.data?.today;
  const num = (v: number | null | undefined, loading: boolean): string | number =>
    v === null || v === undefined ? (loading ? "…" : DASH) : v;

  const revenue =
    overview.data && !overview.data.ordersDegraded && overview.data.revenueTodayCents !== null
      ? formatPrice(overview.data.revenueTodayCents, "usd")
      : overview.loading
        ? "…"
        : DASH;

  return (
    <div className="space-y-6">
      <Card title="Needs you" subtitle={todo.length > 0 ? `${todo.length} to do` : undefined}>
        {checking ? (
          <p className="font-sans text-[13px]" style={{ color: "var(--adm-ink-3)" }}>
            Checking the queues.
          </p>
        ) : todo.length === 0 && gaps.length === 0 ? (
          <p className="font-sans text-[13px]" style={{ color: "var(--adm-ink-2)" }}>
            Nothing needs you right now.
          </p>
        ) : (
          <ul className="divide-y" style={{ borderColor: "var(--adm-line)" }}>
            {todo.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0">
                <StatusDot tone={item.cls === "fault" ? "bad" : "wait"} />
                <div className="min-w-0 flex-1">
                  <p className="font-sans text-[14px] font-medium" style={{ color: "var(--adm-ink)" }}>
                    {item.title}
                  </p>
                  <p className="mt-0.5 font-sans text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
                    {item.body}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => open(item.go.tab)}
                  className="adm-control h-9 shrink-0 rounded-[var(--adm-radius-sm)] border px-3 font-sans text-[12.5px] font-medium"
                  style={
                    {
                      borderColor: "var(--adm-line-strong)",
                      color: "var(--adm-ink)",
                      "--_bg": "var(--adm-control)",
                      "--_bg-hover": "var(--adm-panel-2)",
                    } as React.CSSProperties
                  }
                >
                  {item.go.label}
                </button>
              </li>
            ))}
            {gaps.length > 0 ? (
              <li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0">
                <StatusDot tone="idle" />
                <p className="min-w-0 flex-1 font-sans text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
                  {gaps.length === 1
                    ? "1 check did not answer, so this list may be missing something."
                    : `${gaps.length} checks did not answer, so this list may be missing something.`}
                </p>
                <button
                  type="button"
                  onClick={() => gaps.forEach((g) => g.retryUrl && refresh(g.retryUrl))}
                  className="adm-control h-9 shrink-0 rounded-[var(--adm-radius-sm)] border px-3 font-sans text-[12.5px]"
                  style={
                    {
                      borderColor: "var(--adm-line-strong)",
                      color: "var(--adm-ink-2)",
                      "--_bg": "transparent",
                      "--_bg-hover": "var(--adm-panel-2)",
                    } as React.CSSProperties
                  }
                >
                  Retry
                </button>
              </li>
            ) : null}
          </ul>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Revenue today" value={revenue} hint="UTC day, net" />
        <KpiCard
          label="Paid subscribers"
          value={overview.data ? overview.data.paidPlus + overview.data.paidPro : overview.loading ? "…" : DASH}
          hint="Plus and Pro"
        />
        <KpiCard label="Visitors today" value={num(t?.visitors, stats.loading)} hint="UTC day" />
        <KpiCard
          label="New readers today"
          value={num(t?.signups, stats.loading)}
          hint="Accounts made. Store installs are not counted live."
        />
      </div>
    </div>
  );
}
