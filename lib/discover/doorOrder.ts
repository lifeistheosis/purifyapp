/**
 * Discover's doors in the reader's own order (1.9, build 95 note 9).
 *
 * His word, 2026-11-13, on the test build: "allow the user to hold down each
 * section and the haptic feedback hits and they can move each section
 * according to their wants (and every time it switches a section a haptic
 * feedback hits)". So a door of Discover's library is held and moved, and the
 * order it is left in is kept on this device. The app is local-first: no
 * account, no server and no migration hold it, and a reader who never moves a
 * door keeps nothing at all.
 *
 * This module is the order and the arithmetic of a move, with no React and no
 * DOM beyond the window's storage, so it is tested in plain node
 * (lib/discover/__tests__/doorOrder.test.ts). The gesture is ./holdToMove.ts;
 * the list that wears both is components/discover/DoorOrder.tsx.
 *
 * A door is named by its address ("/saints"): it is what the door opens, it
 * is the same in every language, and it does not change when the door's
 * picture or line does.
 */

/** Where the reader's order is kept, on this device only. */
export const ORDER_KEY = "purify:discover-order";

/** Said on this window when the order changes here; another tab hears `storage`. */
export const ORDER_EVENT = "purify:discover-order:change";

/** The pre-paint's style element (see `orderPrepaint`), taken out once the list itself is in order. */
export const PREPAINT_ID = "door-order-prepaint";

/** The order as kept: a list of addresses, or null when nothing (or nothing readable) is kept. */
export function parseOrder(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return null;
    return value.filter((id): id is string => typeof id === "string");
  } catch {
    return null;
  }
}

/**
 * The doors in the reader's order: the kept order, for every door that is
 * still on Discover, and each door it does not name (a door added after the
 * order was kept, or the Shop when it opens) in its own place in the first
 * order. A door that has gone is simply left out.
 *
 * `orderPrepaint` below does this same walk in a string, before the page is
 * drawn; the test holds the two together, case by case.
 */
export function mergeOrder(first: readonly string[], kept: readonly string[] | null): string[] {
  if (!kept) return [...first];
  const known = new Set(first);
  const seen = new Set<string>();
  const order: string[] = [];
  for (const id of kept) {
    if (known.has(id) && !seen.has(id)) {
      seen.add(id);
      order.push(id);
    }
  }
  first.forEach((id, j) => {
    if (!seen.has(id)) order.splice(Math.min(j, order.length), 0, id);
  });
  return order;
}

/** True when the two orders are one. */
export function sameOrder(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

/** The order with the door at `from` moved to `to`. */
export function moveDoor(order: readonly string[], from: number, to: number): string[] {
  const next = [...order];
  if (from < 0 || from >= next.length) return next;
  const [door] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(to, next.length)), 0, door);
  return next;
}

// ── On this device ──────────────────────────────────────────────────────

/** The order kept for this visit when storage cannot be written (a private window). */
let held: string[] | null = null;

/** The reader's order, read now: the first order when nothing is kept. */
export function readOrder(first: readonly string[]): string[] {
  if (typeof window === "undefined") return [...first];
  let kept: string[] | null;
  try {
    kept = parseOrder(window.localStorage.getItem(ORDER_KEY));
  } catch {
    kept = held;
  }
  return mergeOrder(first, kept);
}

/**
 * Keep this order, and tell the list. The first order is kept as nothing:
 * the key goes, so a reader who puts the doors back holds no order at all,
 * and a door added in a later release takes its place without a question.
 */
export function keepOrder(order: readonly string[], first: readonly string[]): void {
  if (typeof window === "undefined") return;
  const back = sameOrder(order, first);
  held = back ? null : [...order];
  try {
    if (back) window.localStorage.removeItem(ORDER_KEY);
    else window.localStorage.setItem(ORDER_KEY, JSON.stringify(order));
  } catch {
    /* storage shut: the order holds for this visit */
  }
  window.dispatchEvent(new Event(ORDER_EVENT));
}

/** For useSyncExternalStore: this window's changes, and another tab's. */
export function subscribeOrder(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === ORDER_KEY || e.key === null) onChange();
  };
  window.addEventListener(ORDER_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(ORDER_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

// ── Before the first paint ──────────────────────────────────────────────

/**
 * The reader's order before React has run, for a page loaded whole (the
 * website opened at /discover, or the app's page reloaded).
 *
 * The page is drawn by the server in the first order, which is all a server
 * can know: the order is kept on the device. Left to React, Discover would
 * be drawn in the first order and then rearranged once the app had started,
 * which on a phone is a jump in the middle of the screen. So this runs where
 * the page is parsed, before the list, and lays the reader's order on the
 * doors with CSS `order` from a style element of its own in <head> (React
 * leaves an element it did not draw there alone). The list then draws the
 * same order in its own markup and takes the style element out
 * (components/discover/DoorOrder.tsx), so nothing moves between the two.
 *
 * Only the addresses the server lists are written into the style: a kept
 * order is read, never trusted. A page the app reaches by its router never
 * runs it (React draws a <script> that does not run), and does not need it:
 * the list reads the order itself before it is drawn.
 *
 * ES5 and no imports, as lib/ui/motionPrepaint.ts and
 * lib/platform/storePrepaint.ts are.
 */
export function orderPrepaint(first: readonly string[]): string {
  const doors = JSON.stringify(first).replace(/</g, "\\u003c");
  return [
    "(function(){try{",
    `var f=${doors},r=localStorage.getItem(${JSON.stringify(ORDER_KEY)});`,
    "if(!r)return;var s=JSON.parse(r);if(!Array.isArray(s)||!s.length)return;",
    "var seen={},o=[],i,id;",
    "for(i=0;i<s.length;i++){id=s[i];if(typeof id==='string'&&f.indexOf(id)>-1&&!seen[id]){seen[id]=1;o.push(id);}}",
    "for(i=0;i<f.length;i++){if(!seen[f[i]])o.splice(Math.min(i,o.length),0,f[i]);}",
    "var css='';for(i=0;i<o.length;i++)css+='[data-door-list]>[data-door=\"'+o[i]+'\"]{order:'+i+'}';",
    `var el=document.createElement('style');el.id=${JSON.stringify(PREPAINT_ID)};el.textContent=css;document.head.appendChild(el);`,
    "}catch(e){}})();",
  ].join("");
}

/** Take the pre-paint's style out: the list draws the order in its own markup now. */
export function dropPrepaint(): void {
  if (typeof document === "undefined") return;
  document.getElementById(PREPAINT_ID)?.remove();
}
