/**
 * A change inside a page moves as a page switch does (1.9; the owner's ruling
 * of 2026-11-13, relayed by Arbiter 2: "in-page changes that move content (a
 * tab, a pager's Next, a question opening, a card dismissed) move as page
 * switches do; a filter or a count may change at once").
 *
 * What a reader sees. A question opens and its answer is let down under it,
 * while what stood below glides down to make room; a card dismissed folds
 * away and the verse under it glides up into its place; a day chosen on the
 * calendar, a tab, a pager's Next cross-fade as a tab does between pages.
 * Nothing is cut and nothing below jumps. It is the same means as a page
 * switch (lib/ui/routeMotion.ts): the browser pictures the screen as it
 * stands, the page changes under that picture, and the two are moved into
 * each other on the house curve, inside a third of a second
 * (app/globals.css, "A change inside a page moves").
 *
 * Which parts travel. The part that changes size (an answer, a card, a
 * section) is named as `grows`: it is pictured on its own and clipped to its
 * box as the box opens or closes, so what it lets down is uncovered, not
 * laid over what is below. Everything that follows it on the screen (its
 * later siblings, and theirs up to the page) is named too, one name each, so
 * each glides to where it now stands instead of fading out at one place and
 * in at another: two lines of words read through each other is the fault the
 * house's page switch is tuned against. The rest of the page cross-fades.
 *
 * Still under reduced motion, as page switches are: the change is made at
 * once (`canMove`), which the ruling allows. While a page switch is still
 * settling, or a step back is held, a change is made at once too: a second
 * transition would cut the first one short.
 *
 * Two ways in:
 *   movePage(update)            the change is made now (flushSync, so the
 *                               browser pictures it whole).
 *   movePageUntil(step, ready)  the change comes later (an address changed,
 *                               a reply fetched): the picture of the screen as
 *                               it stood is held until `ready`, or HOLD_MS at
 *                               the most, and then the two move.
 *
 * lib/ui/__tests__/inPageMove.test.ts holds the rules and the places that
 * use it.
 */

import { flushSync } from "react-dom";

import { canMove, isReturning, untilSettled } from "./routeMotion";

/** On <html> for the length of a change inside a page; app/globals.css times the pictures by it. */
export const IN_PAGE_ATTR = "data-in-page";

/** The names a part that opens or closes wears: pictured alone and clipped to its box. */
export const GROWS = ["in-page-grows-1", "in-page-grows-2"] as const;

/** The name a part that only travels wears, with its number. */
export const GLIDES = "in-page-glides-";

/** At most this many parts travel by name; the rest of the page cross-fades. */
export const GLIDE_MAX = 40;

/** How long a change that comes later may hold the picture, at the most. */
export const HOLD_MS = 320;

type Transition = { finished: Promise<unknown>; ready: Promise<unknown>; skipTransition: () => void };
type MovingDocument = Document & { startViewTransition?: (update: () => unknown) => Transition };

/** What travels: the parts that open or close, and those that glide (by default, what follows the first part that opens). */
export type MoveParts = {
  grows?: (Element | null | undefined)[];
  glides?: Element[];
};

let moving = false;
let worn: HTMLElement[] = [];

/** True while a change inside the page is being moved. */
export function isMovingInPage(): boolean {
  return moving;
}

/** Whether a change inside the page may be pictured now. */
export function canMoveInPage(): boolean {
  return canMove() && !moving && !isReturning() && untilSettled() === 0;
}

/**
 * The parts that follow `from` on the screen: its later siblings, then its
 * parent's, up to the page, each one that is drawn on the screen or within a
 * screen below it. Never an ancestor of `from` (that would picture `from`
 * inside it twice), never what stands fixed (it does not move with the
 * words), never a part already named.
 */
export function partsAfter(from: Element | null | undefined, max = GLIDE_MAX): HTMLElement[] {
  if (!from || typeof window === "undefined") return [];
  const out: HTMLElement[] = [];
  const reach = window.innerHeight * 2;
  for (let at: Element | null = from; at && at !== document.body && at.tagName !== "MAIN"; at = at.parentElement) {
    for (let next = at.nextElementSibling; next && out.length < max; next = next.nextElementSibling) {
      const el = next as HTMLElement;
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.display === "contents" || cs.position === "fixed") continue;
      if (cs.viewTransitionName && cs.viewTransitionName !== "none") continue;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1 || r.bottom < 0 || r.top > reach) continue;
      out.push(el);
    }
    if (out.length >= max) break;
  }
  return out;
}

function wear(parts: MoveParts): void {
  const grows = (parts.grows ?? []).filter((e): e is HTMLElement => !!e).slice(0, GROWS.length);
  const glides = parts.glides ?? partsAfter(grows[0]);
  grows.forEach((el, i) => {
    el.style.viewTransitionName = GROWS[i];
    worn.push(el);
  });
  let n = 0;
  for (const el of glides) {
    if (n >= GLIDE_MAX) break;
    if (worn.includes(el as HTMLElement)) continue;
    (el as HTMLElement).style.viewTransitionName = `${GLIDES}${++n}`;
    worn.push(el as HTMLElement);
  }
}

function undress(): void {
  for (const el of worn) el.style.viewTransitionName = "";
  worn = [];
  document.documentElement.removeAttribute(IN_PAGE_ATTR);
  moving = false;
}

function picture(update: () => unknown, parts: MoveParts, fallback: () => void): void {
  moving = true;
  document.documentElement.setAttribute(IN_PAGE_ATTR, "");
  wear(parts);
  let transition: Transition;
  try {
    transition = (document as MovingDocument).startViewTransition!(update);
  } catch {
    undress();
    fallback();
    return;
  }
  transition.ready.then(undefined, () => {});
  transition.finished.then(undress, undress);
}

/** Make a change inside the page now, moved as a page switch is where motion is on. */
export function movePage(update: () => void, parts: MoveParts = {}): void {
  if (!canMoveInPage()) {
    update();
    return;
  }
  let done = false;
  const once = () => {
    if (done) return;
    done = true;
    update();
  };
  picture(() => flushSync(once), parts, once);
}

/**
 * Take a step whose change comes later (an address changed, a fetch), moved
 * as a page switch is: the screen as it stood is held until `ready`, or
 * HOLD_MS at the most, then the two move into each other. The step is taken
 * exactly once, inside the transition where there can be one.
 */
export function movePageUntil(step: () => void, ready: Promise<unknown>, parts: MoveParts = {}): void {
  let taken = false;
  const take = () => {
    if (taken) return;
    taken = true;
    step();
  };
  if (!canMoveInPage()) {
    take();
    return;
  }
  picture(
    () => {
      take();
      return Promise.race([ready.catch(() => {}), new Promise((resolve) => setTimeout(resolve, HOLD_MS))]);
    },
    parts,
    take,
  );
}

/**
 * A promise for a change that comes later, kept by its key until the screen
 * that draws it says it has come (`arrive`, from a layout effect, where the
 * new state is in the page and not yet painted).
 */
const waiting = new Map<string, () => void>();

export function awaitArrival(key: string): Promise<void> {
  waiting.get(key)?.();
  return new Promise<void>((resolve) => {
    waiting.set(key, resolve);
    setTimeout(() => {
      if (waiting.get(key) === resolve) waiting.delete(key);
      resolve();
    }, HOLD_MS);
  });
}

export function arrive(key: string): void {
  const resolve = waiting.get(key);
  if (!resolve) return;
  waiting.delete(key);
  resolve();
}

/** A part marked so keeps its own way of opening: its questions open at once, as before. */
export const STILL_ATTR = "data-in-page-still";

/**
 * Every question that opens in place (a <details> and its <summary>: the
 * FAQ's questions, a chapter's "Before you read", What's new's months) opens
 * and closes as a change inside the page, wherever it is: one listener for
 * the document, so a question added later needs nothing of its own. A click
 * a page has handled already, a modified click, a click on a link or a
 * button inside the summary, and a part marked STILL_ATTR are left alone.
 * Returns the way to stop.
 */
export function moveQuestions(doc: Document = document): () => void {
  const onClick = (e: Event) => {
    const m = e as MouseEvent;
    if (m.defaultPrevented || m.button > 0 || m.metaKey || m.ctrlKey || m.shiftKey || m.altKey) return;
    const target = m.target as Element | null;
    const summary = target?.closest?.("summary");
    if (!summary) return;
    const inner = target!.closest("a, button, input, select, textarea, label");
    if (inner && inner !== summary && summary.contains(inner)) return;
    const details = summary.parentElement;
    if (!details || details.tagName !== "DETAILS" || details.querySelector(":scope > summary") !== summary) return;
    if (details.closest(`[${STILL_ATTR}]`)) return;
    if (!canMoveInPage()) return;
    m.preventDefault();
    const d = details as HTMLDetailsElement;
    movePage(() => {
      d.open = !d.open;
    }, { grows: [d] });
  };
  doc.addEventListener("click", onClick);
  return () => doc.removeEventListener("click", onClick);
}

/** For tests only. */
export function resetInPageMoveForTests(): void {
  worn = [];
  moving = false;
  waiting.clear();
}
