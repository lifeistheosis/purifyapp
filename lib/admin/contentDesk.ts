/**
 * Content, his pick A on r3-17 (2026-10-30): the editors' desk.
 *
 * "The only thing here that changes what readers see from week to week is
 * which saint is finished next; the rest is a number to update now and
 * then." So the page is one list, the saints readers asked for, most asked
 * first, each with its own icon and Mark complete beside it; the front
 * page's ratings as one card; and the catechism as one line until its bank
 * is in.
 *
 * Pure: the rows /api/admin/content already returns, ordered and worded.
 */

export type DeskSaint = {
  slug: string;
  name: string;
  /** How many times readers pressed Ask for this saint (saint_bump_counts). */
  bumps: number;
  views30d: number;
  /** Whether the saint is complete, the override where there is one. */
  complete: boolean;
  /** True when the panel set it, not the registry. */
  overridden: boolean;
  /** The saint's own icon, from the registry. */
  icon?: string | null;
};

export type DeskFilter = "open" | "complete" | "all";

/**
 * The list under the switch. Most asked first, then most read, then by name,
 * so two saints asked for equally keep a steady order.
 */
export function askedList(rows: readonly DeskSaint[], filter: DeskFilter): DeskSaint[] {
  const keep = (r: DeskSaint) => (filter === "open" ? !r.complete : filter === "complete" ? r.complete : true);
  return rows
    .filter(keep)
    .sort((a, b) => b.bumps - a.bumps || b.views30d - a.views30d || a.name.localeCompare(b.name));
}

const n = (x: number) => x.toLocaleString("en-US");

/** "88 asked · 2,310 views in 30 days". `viewsKnown` false when the page views could not be read. */
export function askedLine(r: DeskSaint, viewsKnown = true): string {
  const asked = r.bumps === 0 ? "not asked for yet" : `${n(r.bumps)} asked`;
  return viewsKnown ? `${asked} · ${n(r.views30d)} ${r.views30d === 1 ? "view" : "views"} in 30 days` : asked;
}

/**
 * What Undo writes after Mark complete: the saint exactly as it was. A saint
 * the registry called open goes back to the registry (null clears the
 * override); one the panel had set goes back to that setting.
 */
export function undoValue(before: Pick<DeskSaint, "complete" | "overridden">): boolean | null {
  return before.overridden ? before.complete : null;
}

/** The share of the most asked saint's count a row's bar shows, 0 to 1. */
export function askedShare(r: DeskSaint, rows: readonly DeskSaint[]): number {
  const top = rows.reduce((m, x) => Math.max(m, x.bumps), 0);
  return top > 0 ? r.bumps / top : 0;
}

/**
 * The catechism as one line. While the bank is empty the line says where the
 * bank goes and what happens then, truthfully: the file is
 * data/catechism/questions.json, its format is docs/CATECHISM.md, and the
 * bank test reads it on every run. (It named an import script,
 * scripts/quiz-import.ts, which this branch does not have: it left with the
 * revert of the 1.4 merge, so the line named a command that could not run.)
 */
export function catechismLine(bankSize: number): string {
  if (bankSize <= 0) {
    return "No questions in the bank yet. Readers see none until the reviewed bank is committed as data/catechism/questions.json (its format is in docs/CATECHISM.md). Then today's five show here.";
  }
  return `${n(bankSize)} ${bankSize === 1 ? "question" : "questions"} in the bank. Today's five for each calendar, and how each question lands, open below.`;
}
