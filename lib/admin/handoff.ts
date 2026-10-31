/**
 * Carrying one thing from page to page in the admin, and a deep link's extra
 * part past the shell.
 *
 * The shell owns the address: it writes `#tab=<id>` every time the open view
 * changes (components/admin/AdminShell.tsx), so `#tab=orders&order=EIK-...`
 * has lost its second half before the Orders page mounts. The When needed
 * pages (the owner's picks of 2026-10-30) open on one order, one request,
 * one piece, so they need that half. Two ways to keep it, neither touching
 * the shell:
 *
 *   1. The address as it was when the admin loaded, read ONCE at module load,
 *      which is before React has run a single effect. takeInitial() hands a
 *      page its parameter once, and only when the address named that page.
 *   2. A hand-off: handTo("messages", { order }) leaves a note for the
 *      Messages page and opens it through the hash, the way a bookmark would.
 *      take("messages") reads the note.
 *
 * A note is read rather than consumed on the spot, and dropped a tick later:
 * React's development mode runs an initialiser twice, and the second run must
 * see what the first saw.
 *
 * Client only. On the server every read is empty.
 */

export type HashParams = Record<string, string>;

/** `#tab=orders&order=EIK-1` as its parts. Pure. */
export function parseHash(hash: string): { tab: string | null; params: HashParams } {
  const sp = new URLSearchParams(hash.replace(/^#/, ""));
  const params: HashParams = {};
  for (const [k, v] of sp) if (k !== "tab" && v) params[k] = v;
  return { tab: sp.get("tab"), params };
}

/** The address a page writes so a reload or a bookmark lands where it is. Pure. */
export function hashFor(tab: string, params: HashParams = {}): string {
  const sp = new URLSearchParams({ tab });
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  return `#${sp.toString()}`;
}

const initial: { tab: string | null; params: HashParams } | null =
  typeof window === "undefined" ? null : parseHash(window.location.hash);
const usedInitial = new Set<string>();
const notes = new Map<string, HashParams>();

function later(fn: () => void) {
  if (typeof window !== "undefined") window.setTimeout(fn, 0);
}

/**
 * The tab the admin was opened on, when it is one of `tabs`, once. Lets a
 * retired view's bookmark (#tab=sourcing) open the part of its new page it
 * used to be.
 */
export function takeInitialTab(tabs: readonly string[]): string | null {
  if (!initial?.tab || !tabs.includes(initial.tab)) return null;
  const key = `tab:${initial.tab}`;
  if (usedInitial.has(key)) return null;
  later(() => usedInitial.add(key));
  return initial.tab;
}

/** A parameter of the address the admin was opened on, for one of `tabs`, once. */
export function takeInitial(tabs: readonly string[], name: string): string | null {
  if (!initial?.tab || !tabs.includes(initial.tab)) return null;
  const value = initial.params[name];
  if (!value) return null;
  const key = `${initial.tab}:${name}`;
  if (usedInitial.has(key)) return null;
  later(() => usedInitial.add(key));
  return value;
}

/** Leave a note for a page and open it. */
export function handTo(tab: string, params: HashParams): void {
  if (typeof window === "undefined") return;
  notes.set(tab, params);
  window.location.hash = hashFor(tab).slice(1);
}

/** The note left for this page, if any. */
export function take(tab: string): HashParams | null {
  const note = notes.get(tab) ?? null;
  if (note) later(() => notes.delete(tab));
  return note;
}

/**
 * Name what is open in the address without a navigation: replaceState fires
 * no hashchange, so the shell does not re-read it, and the shell only writes
 * the hash when the open view changes, so it does not undo this.
 */
export function writeParams(tab: string, params: HashParams): void {
  if (typeof window === "undefined") return;
  const next = hashFor(tab, params);
  if (window.location.hash !== next) window.history.replaceState(null, "", next);
}
