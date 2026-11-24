"use client";

/**
 * Subscriptions' Summary, its counts: one lead figure, paying members, and one
 * plain line that says who else holds Plus, with every count it used to show
 * as nine cards folded under it. docs/plans/admin-levels-rework.md, step 2,
 * his yes of 2026-11-24 ("too much info ... minimal"; "don't touch the amount
 * of data shown on the live section and the charts. Everything else, sure").
 *
 * Nothing is gone: the nine cards are the same cards, in the fold. Paying
 * still leads, for the reason the old row gave: "Active Plus" alone reads as
 * a subscriber base several times the one that pays. A count not read is a
 * question mark, never a 0.
 */

import { Disclosure, StatCard } from "../primitives";
import { Figure } from "../daily/parts";

export type MemberCountsData = {
  activePlus: number;
  activePro: number;
  plusOnly: number;
  supporters: number;
  paidPlus: number;
  compedPlus: number;
  legacyPlus: number;
  giftedPlus: number;
  trialPlus?: number;
  trialsKnown?: boolean;
};

const n = new Intl.NumberFormat("en-US");

/** "14 comped, 3 gifted and 5 in a free trial": the ones that are not zero. */
export function othersLine(d: MemberCountsData): string {
  const parts = [
    [d.compedPlus, "comped"],
    [d.giftedPlus, "gifted"],
    [d.legacyPlus, "grandfathered"],
    [d.trialsKnown ? (d.trialPlus ?? 0) : 0, "in a free trial"],
  ]
    .filter(([v]) => (v as number) > 0)
    .map(([v, w]) => `${n.format(v as number)} ${w}`);
  if (parts.length === 0) return "No one else holds Plus.";
  const list = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
  return `${n.format(d.activePlus)} hold Plus: besides those paying, ${list}.`;
}

export function MemberCounts({ data }: { data: MemberCountsData | null }) {
  return (
    <div className="space-y-3">
      <div
        className="rounded-[8px] border px-4 pb-3 pt-3.5"
        style={{ background: "var(--adm-panel)", borderColor: "var(--adm-line)" }}
      >
        <p className="font-sans text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
          Paying members
        </p>
        <p className="mt-1 flex items-baseline gap-2">
          <Figure size={34} lit>
            {data ? n.format(data.paidPlus) : "?"}
          </Figure>
          <span className="font-sans text-[13px]" style={{ color: "var(--adm-ink-2)" }}>
            {data ? (data.activePro > 0 ? `billed, ${n.format(data.activePro)} of them Pro` : "billed") : "not read"}
          </span>
        </p>
        <p className="mt-2 font-sans text-[12.5px]" style={{ color: "var(--adm-ink-3)" }}>
          {data ? othersLine(data) : "The counts could not be read."}
        </p>
      </div>

      <Disclosure title="Every count" hint="The nine counts, one card each">
        <div className="space-y-4 px-3 pb-3 md:px-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <StatCard label="Paying" value={data?.paidPlus ?? "?"} accent hint="billed, incl. Pro" />
            <StatCard label="Comped" value={data?.compedPlus ?? "?"} hint="admin grants" />
            <StatCard label="Gifted" value={data?.giftedPlus ?? "?"} hint="redeemed gifts" />
            <StatCard label="Grandfathered" value={data?.legacyPlus ?? "?"} hint="kept at the paywall launch" />
            <StatCard label="Active Plus" value={data?.activePlus ?? "?"} hint="everyone with Plus" />
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {data?.trialsKnown ? (
              <StatCard label="In a free trial" value={data.trialPlus ?? 0} hint="Plus, nothing paid yet" />
            ) : null}
            <StatCard label="Active Pro" value={data?.activePro ?? "?"} hint="members" />
            <StatCard label="Plus only" value={data?.plusOnly ?? "?"} />
            <StatCard label="Supporters" value={data?.supporters ?? "?"} hint="lifetime sync" />
          </div>
        </div>
      </Disclosure>
    </div>
  );
}
