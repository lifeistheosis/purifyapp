"use client";

/**
 * Costs' lead: what Purify spends a month, from the active cost lines below
 * it, and where Level 1 reads its costs. His yes, 2026-11-24, the
 * page-by-page step of docs/plans/admin-levels-rework.md.
 */

import { formatPrice } from "@/lib/shop/format";
import { SENSITIVE } from "@/lib/admin/streamer";

import { Figure } from "../daily/parts";

export function CostsLead({ monthlyCents, activeLines }: { monthlyCents: number; activeLines: number }) {
  return (
    <div className="rounded-[8px] border px-4 pb-3 pt-3.5" style={{ background: "var(--adm-panel)", borderColor: "var(--adm-line)" }}>
      <p className="font-sans text-[12px]" style={{ color: "var(--adm-ink-3)" }}>
        Running costs, a month
      </p>
      <p className="mt-1">
        <Figure size={34} lit sensitive>
          {formatPrice(monthlyCents, "usd")}
        </Figure>
      </p>
      <p className={"mt-2 font-sans text-[12.5px] " + SENSITIVE} style={{ color: "var(--adm-ink-3)" }}>
        {`${activeLines} active line${activeLines === 1 ? "" : "s"} below. Goals and Home measure Level 1 against this until the bank holds a whole month of bills; then the bank takes over.`}
      </p>
    </div>
  );
}
