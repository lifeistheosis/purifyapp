/**
 * A page takes its outline's place without a cut (1.9; the standard is in
 * CLAUDE.md, the owner's word of 2026-11-10: "every page switch is a
 * transition").
 *
 * A page that is slow to come shows its outline first (`loading.tsx`), and
 * the outline arrives as a page does (components/nav/RouteTransition.tsx, "A
 * page that is slow to come"). This is the other half: the moment the page
 * itself is ready. React takes the outline out and puts the page in, in one
 * step, and until the week 1.9 was finished that step was all a reader saw:
 * grey boxes, then the page, with nothing between.
 *
 * Now the outline dissolves over the page. As React takes it out, a copy of
 * it as it stood is left over the page for DISSOLVE_MS and fades away, so
 * the page is seen coming through it. The page is not held for this: it is
 * in place and live from the first frame, under what is left of its outline.
 *
 * Why a copy, and not the browser's own picture of the change (a View
 * Transition, as a page switch is). A picture has a price each time:
 *
 *   React holds its next change until a picture it started is over, so
 *   whatever the page does next (a part arriving, a filter answering) would
 *   wait out the dissolve.
 *
 *   The browser keeps one picture at a time. A page that comes back by the
 *   chevron is pictured from lib/ui/routeMotion.ts and not by React; if its
 *   outline came first and the page arrived in mid-flight, a second picture
 *   would end the first, and the page being returned to would snap into
 *   place.
 *
 * A copy is only an element with a fade on it, so it runs under any picture
 * and holds nothing up.
 *
 * Still under reduced motion: no copy is made, and the page is simply there.
 *
 * The wiring is components/ui/AfterAMoment.tsx (an outline says when it is
 * taken out) and components/nav/RouteTransition.tsx (a change of page takes
 * every copy with it: an outline that leaves WITH its page is in the page
 * switch's own picture, and must not be left over the next page). The rules
 * are held by lib/ui/__tests__/outlineLeave.test.ts, and scripts/
 * route-motion.mjs watches a slow page on the export.
 */

/** How long what is left of an outline takes to fade over its page. */
export const DISSOLVE_MS = 180;

/** The house curve (`--ease-house`, app/globals.css). */
export const HOUSE_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

/** The mark on the copy (app/globals.css stops everything inside it from moving). */
export const GHOST_ATTR = "data-outline-ghost";

/**
 * The mark on a route's wrapper whose page came after its outline. A page's
 * rows wait for the wrapper's own fade before they come in (app/globals.css,
 * `.route-fade .cascade > *`), and here there is no fade to wait for: the
 * outline is going, and the rows come in as it goes.
 */
export const AFTER_ATTR = "data-after-outline";

/** How long the wrapper keeps that mark: until the rows have come in (thirteen steps and one fade, at the longest). */
export const AFTER_MS = 1600;

type Box = { top: number; left: number; right: number; bottom: number };

/** The one box that holds them all, or null when there is nothing to hold. */
export function around(boxes: readonly Box[]): (Box & { width: number; height: number }) | null {
  const real = boxes.filter((b) => b.right - b.left > 0 && b.bottom - b.top > 0);
  if (!real.length) return null;
  const top = Math.min(...real.map((b) => b.top));
  const left = Math.min(...real.map((b) => b.left));
  const right = Math.max(...real.map((b) => b.right));
  const bottom = Math.max(...real.map((b) => b.bottom));
  return { top, left, right, bottom, width: right - left, height: bottom - top };
}

/** Whether any of it is on a screen this tall: what is not in sight has nowhere to be seen leaving from. */
export function inSight(box: Box, screen: number): boolean {
  return box.bottom > 0 && (!(screen > 0) || box.top < screen);
}

/**
 * How much of an element shows through everything it stands in: each
 * wrapper's own opacity, multiplied. A copy is made outside those wrappers,
 * and one that began brighter than the outline stood would be seen to jump.
 */
export function showingThrough(opacities: readonly number[]): number {
  let through = 1;
  for (const o of opacities) through *= Number.isFinite(o) ? Math.min(1, Math.max(0, o)) : 1;
  return through;
}

type Copy = { ghost: HTMLElement; from: number };
type Leaving = { outline: HTMLElement; copy: Copy | null; wrapper: HTMLElement | null };

/** Outlines being taken out in the change React is making now. */
let leaving: Leaving[] = [];
/** Copies now fading over their pages. */
let ghosts: HTMLElement[] = [];
/** Wrappers told their page followed an outline, and when each is untold. */
let told = new Map<HTMLElement, ReturnType<typeof setTimeout>>();

function reduced(): boolean {
  return document.documentElement.dataset.motion === "reduce";
}

function untell(wrapper: HTMLElement): void {
  const timer = told.get(wrapper);
  if (timer !== undefined) clearTimeout(timer);
  told.delete(wrapper);
  wrapper.removeAttribute(AFTER_ATTR);
}

/** The route's wrapper is told its page follows an outline, for as long as its rows take to come in. */
function tell(wrapper: HTMLElement): void {
  const before = told.get(wrapper);
  if (before !== undefined) clearTimeout(before);
  wrapper.setAttribute(AFTER_ATTR, "");
  told.set(
    wrapper,
    setTimeout(() => untell(wrapper), AFTER_MS),
  );
}

/**
 * A copy of the outline as it stands now: where it is, and what shows of it.
 * A part still on its way in (the outline's own rows come in one by one) is
 * copied as far in as it has come, and no further.
 */
function copyOf(outline: HTMLElement): Copy | null {
  const parts = [...outline.children] as HTMLElement[];
  const box = around(parts.map((el) => el.getBoundingClientRect()));
  if (!box || !inSight(box, window.innerHeight)) return null;

  const wrappers: number[] = [];
  for (let node = outline.parentElement; node && node !== document.documentElement; node = node.parentElement) {
    wrappers.push(Number(getComputedStyle(node).opacity));
  }
  const from = showingThrough(wrappers);
  if (from < 0.02) return null;

  // What is in motion inside it, and how far each has come.
  const moving: HTMLElement[] = [];
  if (typeof outline.getAnimations === "function") {
    for (const animation of outline.getAnimations({ subtree: true })) {
      const target = ((animation.effect as KeyframeEffect | null)?.target ?? null) as HTMLElement | null;
      if (target && !moving.includes(target)) moving.push(target);
    }
  }
  const stands = moving.map((el) => getComputedStyle(el).opacity);
  moving.forEach((el, i) => el.setAttribute("data-ghost-part", String(i)));

  const ghost = document.createElement("div");
  ghost.setAttribute(GHOST_ATTR, "");
  ghost.setAttribute("aria-hidden", "true");
  ghost.setAttribute("inert", "");
  for (const part of parts) ghost.appendChild(part.cloneNode(true));
  moving.forEach((el) => el.removeAttribute("data-ghost-part"));
  for (const part of ghost.querySelectorAll<HTMLElement>("[data-ghost-part]")) {
    part.style.opacity = stands[Number(part.getAttribute("data-ghost-part"))] ?? "";
    part.removeAttribute("data-ghost-part");
  }
  // Where the outline stood on the screen, and held to the screen. A page
  // may go to the reader's own place as it arrives (a book left in the
  // middle goes down to their paragraph, components/saints/useWorkPlace.ts;
  // a page come back to is put where it was left, lib/ui/returnPlace.ts). A
  // copy that went with the page would be gone from the screen in that same
  // frame, and the reader would be back to a cut.
  Object.assign(ghost.style, {
    position: "fixed",
    top: `${box.top}px`,
    left: `${box.left}px`,
    width: `${box.width}px`,
    height: `${box.height}px`,
    overflow: "clip",
    pointerEvents: "none",
    // Over the page and under the bars (the tab bar, and a page's own top
    // bar, stand far above this).
    zIndex: "1",
    opacity: String(from),
  });
  return { ghost, from };
}

function fade({ ghost, from }: Copy): void {
  document.body.appendChild(ghost);
  ghosts.push(ghost);
  const gone = () => {
    ghost.remove();
    ghosts = ghosts.filter((g) => g !== ghost);
  };
  // Whatever the browser makes of the fade, the copy does not outstay it.
  const timer = setTimeout(gone, DISSOLVE_MS + 120);
  const over = () => {
    clearTimeout(timer);
    gone();
  };
  try {
    ghost.animate([{ opacity: from }, { opacity: 0 }], { duration: DISSOLVE_MS, easing: HOUSE_EASE, fill: "forwards" }).finished.then(over, over);
  } catch {
    over();
  }
}

/**
 * An outline is being taken out. Call from its own layout effect's cleanup,
 * while it still stands in the page: it is copied there and then, and its
 * route's wrapper is told, so the page's rows never begin by waiting.
 *
 * What was copied is left over the page once React has finished the change,
 * and only if the outline really went. In development React takes every
 * effect down once and puts it back, to prove it can; an outline still
 * standing after that has left nothing, and its wrapper is untold.
 */
export function outlineLeft(outline: HTMLElement): void {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  if (!outline.isConnected || reduced()) return;
  let copy: Copy | null = null;
  if (typeof document.body?.animate === "function") {
    try {
      copy = copyOf(outline);
    } catch {
      copy = null;
    }
  }
  const wrapper = outline.closest<HTMLElement>(".route-fade");
  if (wrapper) tell(wrapper);
  const mine: Leaving = { outline, copy, wrapper };
  leaving.push(mine);
  queueMicrotask(() => {
    // Forgotten meanwhile: the page changed, and the outline left with it.
    if (!leaving.includes(mine)) return;
    leaving = leaving.filter((l) => l !== mine);
    if (outline.isConnected) {
      if (wrapper) untell(wrapper);
      return;
    }
    if (copy) fade(copy);
  });
}

/**
 * The page changed. Every copy goes at once, made or about to be, and every
 * wrapper is untold: an outline that left with its page is in the page
 * switch's own picture, and the next page's rows wait for their own page as
 * they always do.
 */
export function outlinesForgotten(): void {
  leaving = [];
  for (const ghost of ghosts) ghost.remove();
  ghosts = [];
  for (const wrapper of [...told.keys()]) untell(wrapper);
}

/** Test seam. */
export function resetOutlineLeaveForTests(): void {
  leaving = [];
  ghosts = [];
  for (const timer of told.values()) clearTimeout(timer);
  told = new Map();
}
