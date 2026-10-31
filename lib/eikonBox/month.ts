/**
 * A drop as a month: the owner's EIKON Box pick (r3-16, 2026-10-30, "a mix
 * of A and C on the icon box"). A's month on top: the drop's five steps on
 * one line with the one it is on lit, the one move now with its counts, and
 * next month's draft and the readiness checks beside it. C's shelf of drops
 * as photo cards below, one card per month.
 *
 * The moves themselves are DROP_TRANSITIONS (./status.ts), which the admin
 * route already enforces with a 409, so nothing here can open a door the
 * route keeps shut. This file names the steps and picks which move to offer.
 *
 * Pure: the clock is handed in.
 */

import { toCsv } from "@/lib/admin/csv";
import type { ClaimStatus, DropStatus, ShippingAddress } from "./types";

/** The five steps a drop walks, as he names them. */
export const MONTH_STEPS = ["Draft", "Open", "Closed", "Gathering", "Shipped"] as const;
export type MonthStep = (typeof MONTH_STEPS)[number];

const STEP_OF: Record<DropStatus, number> = {
  draft: 0,
  open: 1,
  closed: 2,
  fulfilling: 3,
  shipped: 4,
  cancelled: -1,
};

/** The step a status is on: "fulfilling" is Gathering, the units being got in. */
export function monthStep(status: DropStatus): MonthStep | null {
  const i = STEP_OF[status];
  return i >= 0 ? MONTH_STEPS[i] : null;
}

export type MonthDrop = {
  id: string;
  title: string;
  period_month: string;
  status: DropStatus;
  created_at?: string | null;
  claims_open_at: string | null;
  claims_close_at: string | null;
  sourcing_notes?: string | null;
};

const fmtDay = (iso: string | null | undefined) =>
  iso
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(iso))
    : null;

/**
 * The five steps with what goes under each: when it was drafted, the claim
 * window, the day claims closed, and "now" under the one it is on. A shipped
 * drop is done all the way along; a cancelled one lights nothing.
 */
export function monthSteps(
  d: MonthDrop,
): { step: MonthStep; state: "done" | "now" | "todo"; note: string | null }[] {
  const cur = STEP_OF[d.status];
  const opened = d.claims_open_at ?? `${d.period_month}T00:00:00Z`;
  const notes: (string | null)[] = [
    fmtDay(d.created_at),
    windowText(opened, d.claims_close_at),
    fmtDay(d.claims_close_at),
    null,
    null,
  ];
  return MONTH_STEPS.map((step, i) => {
    const state: "done" | "now" | "todo" =
      cur < 0 ? "todo" : i < cur ? "done" : i === cur ? (step === "Shipped" ? "done" : "now") : "todo";
    return { step, state, note: state === "now" && i >= 3 ? "now" : notes[i] };
  });
}

/** "Oct 1 to 10", or "Oct 28 to Nov 3" across a month. */
function windowText(openIso: string, closeIso: string | null): string | null {
  const open = fmtDay(openIso);
  if (!open || !closeIso) return open;
  const o = new Date(openIso);
  const c = new Date(closeIso);
  const sameMonth = o.getUTCFullYear() === c.getUTCFullYear() && o.getUTCMonth() === c.getUTCMonth();
  return sameMonth ? `${open} to ${c.getUTCDate()}` : `${open} to ${fmtDay(closeIso)}`;
}

export type ClaimCounts = {
  /** Claimed and not yet here: still to come from Temu. */
  waiting: number;
  /** Here and packed, to post. */
  packed: number;
  /** Shipped or delivered. */
  posted: number;
  /** Pro ended after claiming, among the live claims. */
  lapsed: number;
  /** Every claim that is not cancelled. */
  total: number;
};

export function claimCounts(
  claims: readonly { status: ClaimStatus; lapsed?: boolean }[],
): ClaimCounts {
  const c: ClaimCounts = { waiting: 0, packed: 0, posted: 0, lapsed: 0, total: 0 };
  for (const cl of claims) {
    if (cl.status === "cancelled") continue;
    c.total += 1;
    if (cl.status === "claimed") c.waiting += 1;
    else if (cl.status === "packed") c.packed += 1;
    else c.posted += 1;
    if (cl.lapsed) c.lapsed += 1;
  }
  return c;
}

/**
 * The month in hand and the next one. The month in hand is the latest drop
 * that is open, closed or gathering; failing that the latest draft; failing
 * that the latest shipped one. The next is a draft for a later month than
 * the one in hand.
 */
export function pickMonths<T extends MonthDrop>(drops: readonly T[]): { current: T | null; next: T | null } {
  const byMonth = [...drops].sort((a, b) => b.period_month.localeCompare(a.period_month));
  const live = byMonth.find((d) => d.status === "open" || d.status === "closed" || d.status === "fulfilling");
  const current =
    live ??
    [...byMonth].reverse().find((d) => d.status === "draft") ??
    byMonth.find((d) => d.status === "shipped") ??
    null;
  const next =
    current && current.status !== "draft"
      ? ([...byMonth].reverse().find((d) => d.status === "draft" && d.period_month > current.period_month) ?? null)
      : null;
  return { current, next };
}

/** The first web address in the sourcing notes, which is where the Temu link is kept. */
export function supplierLink(notes: string | null | undefined): string | null {
  const m = /https?:\/\/[^\s<>"')]+/i.exec(notes ?? "");
  return m ? m[0].replace(/[.,;:]+$/, "") : null;
}

export type OneMove = {
  /** The sentence that says where the month stands. */
  line: string;
  /** The move to make now, by the status it moves to, or a non-status action. */
  primary:
    | { kind: "status"; to: DropStatus; label: string }
    | { kind: "temu"; url: string | null; label: string }
    | { kind: "edit"; label: string }
    | null;
  /** The other moves that belong to this step. */
  also: ("label-file" | "trackings" | "announce" | "mark-packed" | "start-gathering" | "ship")[];
};

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * The one move now, and the sentence above it. Draft: open the claims, once
 * a deadline in the future is set. Open: the count so far and when it
 * closes. Closed: order what was claimed. Gathering: order what is still to
 * come, file the labels for what is packed, paste the trackings. Shipped:
 * nothing left.
 */
export function oneMove(d: MonthDrop, c: ClaimCounts, now: Date): OneMove {
  const link = supplierLink(d.sourcing_notes);
  const closes = fmtDay(d.claims_close_at);
  switch (d.status) {
    case "draft": {
      const future = d.claims_close_at ? Date.parse(d.claims_close_at) > now.getTime() : false;
      return future
        ? {
            line: `A draft. Once it is open, claims close ${closes} (UTC).`,
            primary: { kind: "status", to: "open", label: "Open claims" },
            also: ["announce"],
          }
        : {
            line: "A draft with no deadline in the future. Set one before it opens: an unclaimed box is not carried over.",
            primary: { kind: "edit", label: "Set the deadline" },
            also: [],
          };
    }
    case "open":
      return {
        line: `${plural(c.total, "claim")} so far.${closes ? ` Claims close ${closes}.` : ""}`,
        primary: { kind: "status", to: "closed", label: "Close claims" },
        also: ["announce"],
      };
    case "closed":
      return {
        line: `${plural(c.total, "claim")}. Order ${c.waiting} on Temu, then start gathering.`,
        primary: { kind: "temu", url: link, label: `Order ${c.waiting} on Temu` },
        also: ["start-gathering"],
      };
    case "fulfilling": {
      if (c.waiting === 0 && c.packed === 0) {
        return {
          line: c.total === 0 ? "Nobody claimed this month." : `All ${c.total} posted.`,
          primary: { kind: "status", to: "shipped", label: "Mark the month shipped" },
          also: [],
        };
      }
      const here = c.packed === 1 ? "1 is here and packed" : `${c.packed} are here and packed`;
      const toCome = c.waiting === 1 ? "1 is still to come from Temu" : `${c.waiting} are still to come from Temu`;
      return {
        line: `${plural(c.total, "claim")}. ${here}; ${toCome}.`,
        primary: c.waiting > 0 ? { kind: "temu", url: link, label: `Order ${c.waiting} on Temu` } : null,
        also: [
          ...(c.waiting > 0 ? (["mark-packed"] as const) : []),
          ...(c.packed > 0 ? (["label-file", "trackings"] as const) : []),
        ],
      };
    }
    case "shipped":
      return { line: `Shipped. ${plural(c.posted, "box", "boxes")} posted.`, primary: null, also: [] };
    default:
      return { line: "Cancelled. Every box not already sent was cancelled with it.", primary: null, also: [] };
  }
}

/** "Of 61 Pro members, 47 did not claim." */
export function takeUpLine(activePro: number, claims: number, lapsed: number): string {
  const missed = Math.max(0, activePro - claims);
  const head = lapsed > 0 ? `Lapsed: Pro ended after claiming. ` : "";
  return `${head}Of ${plural(activePro, "Pro member")}, ${missed} did not claim.`;
}

/** The label file for the packed boxes, in the same columns as an order's. */
export function claimLabelCsv(
  claims: readonly { id: string; email: string | null; status: ClaimStatus; address: ShippingAddress | null }[],
): string {
  return toCsv(
    ["Claim", "Name", "Street1", "Street2", "City", "State", "Zip", "Country", "Email", "Weight (lb)"],
    claims
      .filter((c) => c.status === "packed")
      .map((c) => [
        `BOX-${c.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`,
        c.address?.name ?? "",
        c.address?.address.line1 ?? "",
        c.address?.address.line2 ?? "",
        c.address?.address.city ?? "",
        c.address?.address.state ?? "",
        c.address?.address.postal_code ?? "",
        c.address?.address.country ?? "",
        c.email ?? "",
        "",
      ]),
  );
}

/** One line per packed claim for the trackings dialog: who and where. */
export function packedLines(
  claims: readonly { id: string; status: ClaimStatus; address: ShippingAddress | null }[],
): { id: string; who: string; where: string }[] {
  return claims
    .filter((c) => c.status === "packed")
    .map((c) => ({
      id: c.id,
      who: c.address?.name ?? "No name on file",
      where: c.address ? `${c.address.address.city}, ${c.address.address.state}` : "No address on file",
    }));
}

/** The month's name from its first day: "October". */
export function monthName(periodMonth: string, withYear = false): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(new Date(`${periodMonth}T12:00:00Z`));
}

/** The first of the month after the latest drop, for the shelf's "make the drop" card. */
export function monthAfter(periodMonth: string | null, now: Date): string {
  const base = periodMonth ? new Date(`${periodMonth}T12:00:00Z`) : now;
  const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 1));
  return d.toISOString().slice(0, 10);
}
