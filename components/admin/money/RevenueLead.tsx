"use client";

/**
 * Revenue's lead: what Purify has actually been paid, all time, and one plain
 * line under it (Plus a month and a year, the shop, donations). Every figure
 * the page used to open with is in its "Every figure" fold, unchanged.
 * docs/plans/admin-levels-rework.md, the page-by-page step, his yes of
 * 2026-11-24 ("yes start with revenue"). A figure not read is said in words,
 * never a 0.
 */

import { formatPrice } from "@/lib/shop/format";
import { SENSITIVE } from "@/lib/admin/streamer";

import { Est, Figure } from "../daily/parts";

export type RevenueLeadData = {
  realizedCents: number;
  realizedComplete: boolean;
  plusMonthCents: number;
  plusYearCents: number;
  plusEstimated: boolean;
  shopNetCents: number;
  donationsRecorded: boolean;
  donationsCents: number;
};

const usd = (c: number) => formatPrice(c, "usd");

export function revenueLine(d: RevenueLeadData): string {
  const plus = `Plus ${usd(d.plusMonthCents)} a month${d.plusEstimated ? " (est.)" : ""}, ${usd(d.plusYearCents)} a year`;
  const shop = `the shop ${usd(d.shopNetCents)} net`;
  const gifts = d.donationsRecorded ? `donations ${usd(d.donationsCents)}` : "donations not recorded";
  return `${plus}; ${shop}; ${gifts}.`;
}

export function RevenueLead({ data }: { data: RevenueLeadData | null }) {
  return (
    <div
      className="rounded-[8px] border px-4 pb-3 pt-3.5"
      style={{ background: "var(--adm-panel)", borderColor: "var(--adm-line)" }}
    >
      <p className="font-sans text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
        Paid to Purify, all time
      </p>
      <p className="mt-1 flex items-baseline gap-2">
        <Figure size={34} lit sensitive>
          {data ? data.realizedComplete ? usd(data.realizedCents) : <Est>{usd(data.realizedCents)}</Est> : "?"}
        </Figure>
        <span className="font-sans text-[13px]" style={{ color: "var(--adm-ink-2)" }}>
          {data ? (data.realizedComplete ? "before fees" : "partial, before fees") : "not read"}
        </span>
      </p>
      <p className={"mt-2 font-sans text-[12.5px] " + SENSITIVE} style={{ color: "var(--adm-ink-3)" }}>
        {data ? revenueLine(data) : "Revenue could not be read just now."}
      </p>
    </div>
  );
}
