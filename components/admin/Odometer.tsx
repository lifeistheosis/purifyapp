"use client";

// A figure on the panel. Since the Ledger pass this is a thin wrapper over
// components/admin/ledger/CountUp.tsx: the value counts up once on first
// paint over --adm-count-ms, later changes swap in, reduced motion renders
// the final state. There is no sound and no reel.
//
// What it still owns is the streamer-mode mask. Every revenue, payout and
// MRR figure in the panel renders through this component, so marking money
// here reaches all of them; marking cards by hand would be one missed card
// away from a real number on a stream. Kept under the old name so the
// forty call sites did not have to change.

import { SENSITIVE } from "@/lib/admin/streamer";
import { CountUp } from "./ledger/CountUp";

/** A currency mark anywhere in the text. */
export function isMoneyText(text: string): boolean {
  return /[$€£¥]/.test(text);
}

export function Odometer({
  value,
  className,
  /** Force the money mask. Otherwise inferred from a currency mark. */
  money,
}: {
  value: string | number;
  className?: string;
  money?: boolean;
}) {
  const text = typeof value === "number" ? value.toLocaleString("en-US") : value;
  const isMoney = money ?? isMoneyText(text);
  const cls = [className, isMoney ? SENSITIVE : null].filter(Boolean).join(" ") || undefined;
  return <CountUp value={text} className={cls} />;
}
