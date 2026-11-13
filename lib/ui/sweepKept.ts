/**
 * How far a row swept sideways was swept, for the reader who comes back to it
 * (1.9, build 95; the pre-build gate's first rule: Back returns the reader to
 * where they were).
 *
 * Settings' reading modes are one row swept sideways (build 95 note 18), with
 * the two looks earned by reading at its end (note 27). The walk of the two
 * notes, on 2026-11-13 at 390px, swept the row to Councils, tapped its goal,
 * took a door in the sheet that opens and came Back: the page was put back
 * where it had been (632px down) and the row stood at its start, Councils out
 * of sight (it had been swept 339px; in Arabic -338, as a right-to-left row's
 * sweep runs below zero). Back returns a page as the reader left it, and how
 * far a row on it was swept is part of that, as the Father a council's row was
 * showing is (lib/councils/fatherShown.ts).
 *
 * So the sweep is kept, by the page's address and the row's name, in the
 * session's storage (a reload on the website comes back to the page's own
 * place, and the row comes back with it), and given back only to a reader who
 * came back by a step through history (lib/ui/scrollReset.ts, cameBack). A
 * visit that goes forward to the page begins as it always did and lets the
 * kept sweep go, so a later step back to that visit finds what it left.
 *
 * The row that keeps its sweep is components/settings/ReadingModePages.tsx;
 * the test is lib/ui/__tests__/sweepKept.test.ts.
 */

import { cameBack } from "@/lib/ui/scrollReset";

const KEY = "purify.sweep";

/** How many rows' sweeps are kept. A reader's way back is rarely this deep. */
const KEEP = 24;

type Kept = Record<string, number>;

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

function read(store: Storage): Kept {
  try {
    const v: unknown = JSON.parse(store.getItem(KEY) ?? "{}");
    if (!v || typeof v !== "object" || Array.isArray(v)) return {};
    const kept: Kept = {};
    for (const [where, left] of Object.entries(v)) if (typeof left === "number" && Number.isFinite(left)) kept[where] = left;
    return kept;
  } catch {
    return {};
  }
}

function write(store: Storage, kept: Kept): void {
  try {
    store.setItem(KEY, JSON.stringify(kept));
  } catch {
    /* a full or closed storage keeps nothing; the row then opens as on a fresh visit */
  }
}

/** The row named `where` (the page's address and the row's name) stands swept `left` (its scrollLeft). */
export function keepSweep(where: string, left: number): void {
  const store = storage();
  if (!store || !Number.isFinite(left)) return;
  const kept = read(store);
  delete kept[where];
  kept[where] = left;
  const all = Object.keys(kept);
  for (const old of all.slice(0, Math.max(0, all.length - KEEP))) delete kept[old];
  write(store, kept);
}

/** A visit that went forward to the page: the sweep an earlier visit left is let go. */
export function forgetSweep(where: string): void {
  const store = storage();
  if (!store) return;
  const kept = read(store);
  if (!(where in kept)) return;
  delete kept[where];
  write(store, kept);
}

/**
 * How far the row was swept, for a reader who has come back to the page by a
 * step through history; null on a visit that went forward to it, and where
 * nothing was kept. Asked from the row's own layout effect, as cameBack wants.
 */
export function sweepKept(where: string): number | null {
  const store = storage();
  if (!store || !cameBack()) return null;
  return read(store)[where] ?? null;
}
