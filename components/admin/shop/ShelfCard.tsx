"use client";

// One piece on the Catalogue's shelf (the owner's pick A, r3-16,
// 2026-10-30): its photo with its state by shape in the corner (Live solid,
// Draft a ring, Paused grey, Hidden dashed), its price and what it keeps
// after Temu and the card fee as one bar, its stock, and a dashed card with
// the reason when Temu's price moved, the listing is gone, or the price
// loses money. The card opens its editor.

import type { ReactNode } from "react";

import { KeepBar, LateBox, Mark, Thumb, dashedClass } from "../needed/parts";
import {
  STATE_MARK,
  STATE_WORD,
  keepBar,
  stockLine,
  type ShelfState,
  type ShelfWarning,
} from "@/lib/admin/catalogue";

const dollars = (c: number) => `$${(c / 100).toFixed(2)}`;

export function ShelfCard({
  title,
  priceCents,
  costCents,
  quantity,
  photo,
  state,
  warning,
  onOpen,
  action,
}: {
  title: string;
  priceCents: number;
  costCents: number | null | undefined;
  quantity: number | null | undefined;
  photo: string | null | undefined;
  state: ShelfState;
  warning: ShelfWarning;
  onOpen?: () => void;
  /** In place of opening it, for a deleted piece: Restore. */
  action?: ReactNode;
}) {
  const bar = keepBar(priceCents, costCents);
  const stock = stockLine(quantity);
  const body = (
    <>
      <span className="relative block">
        <Thumb src={photo} height={118} rounded={false} />
        <span
          className="absolute left-[7px] top-[7px] inline-flex items-center gap-1.5 rounded-[var(--adm-radius-xs)] border px-1.5 py-px font-sans text-[11px]"
          style={{
            background: "color-mix(in oklab, var(--adm-bg), transparent 14%)",
            borderColor: "var(--adm-line-strong)",
            color: "var(--adm-ink)",
          }}
        >
          <Mark kind={STATE_MARK[state]} />
          {STATE_WORD[state]}
        </span>
      </span>
      <span className="block px-2.5 pb-2.5 pt-2">
        <span className="block truncate font-sans text-[12.5px] font-medium" style={{ color: "var(--adm-ink)" }}>
          {title}
        </span>
        <span className="mt-1 flex items-baseline justify-between gap-2 font-sans text-[11.5px]">
          <span className="font-mono" style={{ color: "var(--adm-ink)" }}>
            {dollars(priceCents)}
          </span>
          <span style={{ color: "var(--adm-ink-3)" }}>{bar.keeps === null ? "no cost on file" : `keeps ${bar.keeps}%`}</span>
        </span>
        <span className="mt-1.5 block">
          <KeepBar costPct={bar.costPct} feePct={bar.feePct} keepPct={bar.keepPct} />
        </span>
        <span className="mt-2 flex items-center gap-1.5 font-sans text-[11.5px]" style={{ color: "var(--adm-ink-3)" }}>
          <Mark kind={stock.count ? "done" : "idle"} />
          {stock.count === null ? (
            "stock not counted"
          ) : (
            <>
              <span className="font-mono" style={{ color: "var(--adm-ink)" }}>
                {stock.count}
              </span>
              {stock.word}
            </>
          )}
        </span>
        {warning ? (
          <span className="mt-1.5 block">
            <LateBox>{warning.text}</LateBox>
          </span>
        ) : null}
        {action ? <span className="mt-2 block">{action}</span> : null}
      </span>
    </>
  );
  const cls = `block w-full overflow-hidden rounded-[var(--adm-radius)] border text-left ${warning ? dashedClass : ""}`;
  const style = {
    borderColor: "var(--adm-line)",
    background: "var(--adm-panel)",
    opacity: state === "paused" || state === "archived" ? 0.62 : 1,
  };
  if (!onOpen) {
    return (
      <div className={cls} style={style}>
        {body}
      </div>
    );
  }
  return (
    <button type="button" onClick={onOpen} className={`${cls} hover:border-[color:var(--adm-line-strong)]`} style={style} aria-label={`${title}, ${STATE_WORD[state]}. Open its editor.`}>
      {body}
    </button>
  );
}
