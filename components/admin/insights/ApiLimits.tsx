"use client";

import { useEffect, useState } from "react";
import { Card, Pill, Skeleton } from "../primitives";
import { adminJson } from "@/lib/admin/fetchJson";
import {
  API_BIBLE_LIMITS,
  API_BIBLE_SUPPORT_EMAIL,
  STATUS_LABEL,
  enterpriseAdvice,
  needsEnterprise,
  readMonetization,
  readUsageLimit,
  worstStatus,
  type LimitReading,
  type LimitStatus,
} from "@/lib/admin/insights/apiLimits";

/**
 * API.Bible licence standing.
 *
 * Purify serves NIV, NKJV and NLT under the American Bible Society and Biblica
 * agreements. Three ceilings, and this panel exists because the third one is
 * not a meter: monetization is a yes or no, and a page that drew only the two
 * usage bars would show comfortable green beside a breach.
 */

export type ApiLimitsPayload = {
  monthlyCalls: number | null;
  callsInstrumented: boolean;
  mau: { ceiling: number | null; floor: number | null };
  monetized: boolean;
  monetization: {
    paidEntitlements: number;
    activePlus: number;
    activePro: number;
    paidOrders: number;
  };
  licensedConfigured: string[];
  apiBibleLive: boolean;
};

const TONE: Record<LimitStatus, string> = {
  ok: "var(--adm-good)",
  unmeasured: "var(--adm-ink-3)",
  approaching: "var(--adm-warn)",
  urgent: "var(--adm-warn)",
  breached: "var(--adm-critical)",
};

export function useApiLimits() {
  const [data, setData] = useState<ApiLimitsPayload | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    adminJson<ApiLimitsPayload>("/api/admin/api-limits").then((r) => {
      if (!alive) return;
      if (r) setData(r);
      else setFailed(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  return { data, failed };
}

export function readingsFrom(d: ApiLimitsPayload): LimitReading[] {
  return [
    readUsageLimit("calls", "Monthly API calls", d.monthlyCalls, API_BIBLE_LIMITS.monthlyCalls),
    // The CEILING is used, not the floor. Where a figure is a range, a limit
    // check has to take the pessimistic end: being under the limit on your
    // most generous count is not being under the limit.
    readUsageLimit("mau", "Monthly active users", d.mau.ceiling, API_BIBLE_LIMITS.monthlyActiveUsers),
    readMonetization(d.monetized),
  ];
}

/**
 * The banner. Rendered high on the dashboard, not filed away in settings.
 *
 * Returns null when there is nothing to say, so a healthy panel is not carrying
 * a permanent yellow strip that everyone learns to scroll past.
 */
export function ApiLimitBanner() {
  const { data } = useApiLimits();
  if (!data) return null;

  const readings = readingsFrom(data);
  if (!needsEnterprise(readings)) return null;

  const advice = enterpriseAdvice(readings);
  const worst = worstStatus(readings);
  const tone = TONE[worst];

  return (
    <div
      role="status"
      className="adm-panel-enter mb-5 rounded-[var(--adm-radius)] border p-4"
      style={{
        borderColor: `color-mix(in oklab, ${tone}, transparent 55%)`,
        background: `color-mix(in oklab, ${tone}, transparent 92%)`,
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-sans text-[13px] font-semibold" style={{ color: tone }}>
            API.Bible licence: {STATUS_LABEL[worst]}
          </p>
          <p className="mt-1 font-sans text-[12px]" style={{ color: "var(--adm-ink-2)" }}>
            {advice}
          </p>
        </div>
        <a
          href={`mailto:${API_BIBLE_SUPPORT_EMAIL}?subject=Enterprise%20licence%20enquiry%20for%20Purify`}
          className="adm-control shrink-0 rounded-[var(--adm-radius-sm)] border px-3 py-2 font-sans text-[12px] font-medium"
          style={
            {
              borderColor: "var(--adm-line-strong)",
              color: "var(--adm-ink)",
              "--_bg": "var(--adm-control)",
              "--_bg-hover": "var(--adm-hover)",
            } as React.CSSProperties
          }
        >
          Email {API_BIBLE_SUPPORT_EMAIL}
        </a>
      </div>
    </div>
  );
}

/** The full panel, for the Goals page. */
export function ApiLimitsPanel() {
  const { data, failed } = useApiLimits();

  if (failed) {
    return (
      <Card title="API.Bible licence" subtitle="Could not be read.">
        <p className="font-sans text-[12px]" style={{ color: "var(--adm-warn)" }}>
          The licence standing could not be checked, so nothing here should be
          read as compliance. That is different from being within the limits.
        </p>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card title="API.Bible licence" subtitle="Checking standing.">
        <div className="space-y-3">
          <Skeleton h={54} />
          <Skeleton h={54} />
          <Skeleton h={54} />
        </div>
      </Card>
    );
  }

  const readings = readingsFrom(data);

  return (
    <Card
      title="API.Bible licence"
      subtitle={
        data.apiBibleLive
          ? `Serving ${data.licensedConfigured.map((t) => t.toUpperCase()).join(", ")} under the American Bible Society and Biblica agreements.`
          : "No licensed translation is configured in this environment, so no call is being made."
      }
      action={
        <Pill tone={needsEnterprise(readings) ? "rose" : "emerald"}>
          {STATUS_LABEL[worstStatus(readings)]}
        </Pill>
      }
    >
      <div className="space-y-3">
        {readings.map((r) => (
          <LimitRow key={r.id} reading={r} />
        ))}
      </div>

      {data.monetized ? (
        <p className="mt-4 font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
          Monetization is judged on evidence rather than on a setting:{" "}
          {data.monetization.paidEntitlements > 0
            ? `${data.monetization.paidEntitlements} store purchase${data.monetization.paidEntitlements === 1 ? "" : "s"}`
            : ""}
          {data.monetization.paidEntitlements > 0 && data.monetization.paidOrders > 0 ? " and " : ""}
          {data.monetization.paidOrders > 0
            ? `${data.monetization.paidOrders} paid shop order${data.monetization.paidOrders === 1 ? "" : "s"}`
            : ""}
          . Comped entitlements are excluded, because a gift is not commerce.
        </p>
      ) : null}

      {!data.callsInstrumented ? (
        <p
          className="mt-4 rounded-[var(--adm-radius-sm)] border px-3 py-2 font-sans text-[11.5px]"
          style={{
            borderColor: "var(--adm-line)",
            background: "var(--adm-panel-2)",
            color: "var(--adm-ink-3)",
          }}
        >
          Call volume is not counted anywhere in this codebase. Nothing
          increments on a licensed chapter fetch, so the 150,000 ceiling cannot
          be reported against and is shown as unmeasured rather than as zero.
          Counting it needs a small table and one write in
          lib/bible/api-bible.ts, which is a schema change and is being left for
          you to approve.
        </p>
      ) : null}
    </Card>
  );
}

function LimitRow({ reading }: { reading: LimitReading }) {
  const tone = TONE[reading.status];
  const pct = reading.ratio === null ? null : Math.max(0, Math.min(1, reading.ratio));

  return (
    <div
      className="rounded-[var(--adm-radius-sm)] border p-3"
      style={{ borderColor: "var(--adm-line)", background: "var(--adm-panel-2)" }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-sans text-[12.5px] font-medium" style={{ color: "var(--adm-ink)" }}>
          {reading.label}
        </p>
        <p className="font-sans text-[12px] tabular-nums" style={{ color: tone }}>
          {reading.used === null
            ? STATUS_LABEL[reading.status]
            : `${reading.used.toLocaleString("en-US")}${reading.limit ? ` / ${reading.limit.toLocaleString("en-US")}` : ""}`}
        </p>
      </div>

      {pct !== null ? (
        <div
          className="relative mt-2 overflow-hidden rounded-[var(--adm-radius-pill)]"
          style={{ height: 6, background: "var(--adm-panel)" }}
          role="img"
          aria-label={`${Math.round((reading.ratio ?? 0) * 100)} percent of the limit`}
        >
          <div
            className="h-full rounded-[var(--adm-radius-pill)]"
            style={{ width: `${pct * 100}%`, background: tone, transition: "width 320ms var(--adm-ease)" }}
          />
        </div>
      ) : null}

      <p className="mt-1.5 font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
        {reading.detail}
      </p>
    </div>
  );
}
