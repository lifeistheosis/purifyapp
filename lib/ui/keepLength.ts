/**
 * What closes does not pull the page out from under the finger (1.9, the
 * pre-build gate's first rule: "a page that jumps under the finger").
 *
 * The owner's note 16 on build 93 was the first of its kind: on Your rule,
 * Evening tapped with the page scrolled down, and the switch he had just
 * touched was 133px away, because Morning was shorter and the page had grown
 * too short for where he stood. Then the gate's tap walk found it wherever a
 * page ends in something that closes (scripts/tap-walk.mjs, 2026-11-11: an
 * old year's box on What's new shut again, and its own title pulled 204px),
 * and a fresh reader's walk had found it on Chants, a filter chosen near the
 * foot of the list and the row of filters 137px lower.
 *
 * It is one fault. A browser does not let a page stand scrolled past its own
 * end. When the page grows shorter than where the reader is looking, the
 * browser takes the page back up to its new end, and everything on the
 * screen goes down by that much, the thing under the finger included.
 *
 * The rule: after a reader's tap, the page keeps at least the length they
 * are looking at. Whatever grew shorter below their finger has still grown
 * shorter; what is left where it was is plain ground at the foot of the
 * page, and the thing they touched has not moved. The ground is given back
 * as they scroll up, a piece at a time and only the piece that is already
 * below the screen, so giving it back is never seen either. It is let go at
 * once when the page is long enough of itself again (what closed was opened
 * again), and when the page changes.
 *
 * Nothing here moves in time, so there is nothing for reduced motion to
 * still: it is the same with Purify's motion off.
 *
 * How. The length is kept BEFORE anything changes, not after. As a tap
 * lands (noteTap, from the capturing click the opening helper already
 * listens with), the part of the page that holds the route
 * (`data-route-content`) is told to stay at least as long as reaches the
 * foot of the screen (`min-height`). It is that long or longer already, so
 * telling it changes nothing; but whatever the tap then does, the page
 * cannot end above the foot of the screen, and the browser has nothing to
 * pull. A moment later (KEEP_WATCH_MS) the tap is over: if the page is still
 * longer than it was told to be, the telling did nothing and is taken away.
 *
 * (It was first made the other way round: watch the page's length, and when
 * the browser has pulled the page, lengthen it and put it back, all inside
 * one frame and before it is painted. No reader would have seen the pull.
 * But anything that read the page's layout in that frame did, the gate's
 * own walk among them: it measured the title 233px down for an instant.
 * A fault nobody can see but everything can measure is not a mend.)
 *
 * What it leaves alone, each on purpose:
 *
 *  - A thing that rides the screen (a bar of filters stuck under the top
 *    bar, anything in a sheet). It will not move, and the list under it has
 *    every right to end sooner: kept long, the reader would be left looking
 *    at bare ground.
 *  - A page that changed ABOVE the finger. The thing tapped has moved in the
 *    page, so keeping the page's length keeps nothing under the finger: it
 *    is let go the moment that is seen (the watching, below), in the same
 *    frame, and the page does what it would have. That is another fault
 *    with another mend (the page has to go with the thing, not stay), and
 *    the prayer book makes its own.
 *  - The reader's own scroll, and a change of page.
 *
 * The watching is a ResizeObserver on the holder and on what stands in it,
 * for the moment after a tap and no longer: it is told when what is in the
 * page changes size, after the page has been laid out and before it is
 * painted, which is when to look whether the thing tapped is still where it
 * was.
 *
 * NOTHING IS WRITTEN ON THE PAGE AT A TAP. The length is said in a rule of
 * its own, in a stylesheet made once as the app starts (readyKeepLength),
 * and a tap only changes what that rule says. It could have been a style on
 * the holder, and at first it was. But this runs at every tap, and the
 * gate's tap walk tells a control that does nothing by the page not having
 * changed after it (scripts/tap-walk.mjs counts every change to the page's
 * elements). A style written at every tap would have made every dead
 * control in the app look alive to it. A rule's own words are not part of
 * the page's elements, and are seen by nothing but the layout.
 *
 * Nothing calls this by hand: components/nav/OpenedBridge.tsx is the one
 * mount, beside the opening helper's. No React here, so it can be tested
 * with a stubbed window; lib/ui/__tests__/keepLength.test.ts holds the rule,
 * and scripts/closing-walk.mjs watches it on the export at three sizes.
 */

/** How long after a tap a page that grows shorter is taken to be answering it. As long as an opening is watched (lib/ui/showOpened.ts). */
export const KEEP_WATCH_MS = 1400;

/** The part of the page that holds the route, and so the part whose length is kept (components/layout/AppFrame.tsx, app/page.tsx). */
export const HOLDER = "[data-route-content]";

/** The thing under the finger: what answers a tap, or failing that whatever was touched. */
const CONTROL = "summary, button, a, label, input, select, [role], [tabindex]";

/** Nearer than this, a thing is where it was. */
const SAME_PX = 2;

type Tap = { control: Element; inPage: number; path: string };

let lastTap: Tap | null = null;
let held: { holder: HTMLElement; min: number } | null = null;
let watcher: ResizeObserver | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let frame = 0;
/** The two rules the length is said in: the holder's, and the body's for a page with no holder. */
let rules: { holder: CSSStyleDeclaration; body: CSSStyleDeclaration } | null = null;

/**
 * Call once as the app starts, before any tap. Makes the stylesheet the
 * length is said in: two rules that say nothing yet. This is the only thing
 * here that is ever added to the page.
 */
export function readyKeepLength(): void {
  if (rules || typeof document === "undefined") return;
  try {
    const style = document.createElement("style");
    style.setAttribute("data-kept-length", "");
    style.textContent = `${HOLDER}{}body{}`;
    document.head.appendChild(style);
    const made = style.sheet?.cssRules;
    if (!made || made.length < 2) return;
    rules = { holder: (made[0] as CSSStyleRule).style, body: (made[1] as CSSStyleRule).style };
  } catch {
    // No stylesheet to say it in: nothing is kept, and the page is as it was before this.
    rules = null;
  }
}

/** Says how long `holder` must stay, or with null that it need not. */
function say(holder: HTMLElement, min: number | null): void {
  const rule = holder === document.body ? rules?.body : rules?.holder;
  if (!rule) return;
  if (min === null) rule.removeProperty("min-height");
  else rule.setProperty("min-height", `${min}px`);
}

function holderOf(control: Element): HTMLElement {
  return (control.closest(HOLDER) as HTMLElement | null) ?? document.body;
}

/** Held to the screen, so that scrolling the page takes it nowhere: in something fixed or stuck. */
function ridesTheScreen(el: Element): boolean {
  for (let node: Element | null = el; node && node !== document.body && node !== document.documentElement; node = node.parentElement) {
    const position = window.getComputedStyle(node).position;
    if (position === "fixed" || position === "sticky") return true;
  }
  return false;
}

/**
 * How tall `min-height` has to say for the holder's box to be `box` tall:
 * the box itself where its size is counted to the border (the house's rule,
 * from Tailwind), less its padding and border where it is not.
 */
function lengthFor(holder: HTMLElement, box: number): number {
  const style = window.getComputedStyle(holder);
  if (style.boxSizing !== "content-box") return box;
  const px = (value: string) => Number.parseFloat(value) || 0;
  return box - px(style.paddingTop) - px(style.paddingBottom) - px(style.borderTopWidth) - px(style.borderBottomWidth);
}

/** Whether the length kept is doing anything: the holder is no longer than it was told to be. */
function binds(): boolean {
  if (!held || !held.holder.isConnected) return false;
  return lengthFor(held.holder, held.holder.getBoundingClientRect().height) <= held.min + 1;
}

function onScroll(): void {
  if (frame) return;
  frame = window.requestAnimationFrame(() => {
    frame = 0;
    giveBack();
  });
}

function letGo(): void {
  if (!held) return;
  say(held.holder, null);
  held = null;
  if (frame) window.cancelAnimationFrame(frame);
  frame = 0;
  window.removeEventListener("scroll", onScroll);
  window.removeEventListener("resize", onScroll);
}

function keep(holder: HTMLElement, min: number): void {
  if (held && held.holder !== holder) letGo();
  if (!held) {
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
  }
  held = { holder, min };
  say(holder, min);
}

/** The moment after a tap is over: it is forgotten, and a length that was kept for nothing is taken away. */
function settle(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  watcher?.disconnect();
  lastTap = null;
  if (held && !binds()) letGo();
}

/**
 * What is in the page has changed size since the tap. If the thing tapped is
 * no longer where it was in the page (or is gone), what changed is above the
 * finger, and the length is let go here, before the page is painted.
 */
function look(): void {
  const tap = lastTap;
  if (!tap) return;
  if (window.location.pathname !== tap.path) {
    endKeepLength();
    return;
  }
  const { control } = tap;
  if (control.isConnected && Math.abs(control.getBoundingClientRect().top + window.scrollY - tap.inPage) <= SAME_PX) return;
  if (timer) clearTimeout(timer);
  timer = null;
  watcher?.disconnect();
  lastTap = null;
  letGo();
}

/**
 * Call from a capturing `click` listener on the document, so that it runs
 * before anything the tap does. The page is told to keep the length the
 * reader is looking at, and what is in it is watched for a moment.
 */
export function noteTap(event: { target: EventTarget | null }): void {
  if (typeof window === "undefined" || typeof document === "undefined" || !rules) return;
  // The last tap's moment is over, whatever was left of it.
  settle();
  const target = event.target as Element | null;
  if (!target || typeof target.closest !== "function") return;
  const control = target.closest(CONTROL) ?? target;
  if (!control.isConnected || ridesTheScreen(control)) return;
  const holder = holderOf(control);
  // What is below the screen is what the page may lose and still reach the screen's foot.
  const below = Math.max(0, document.documentElement.scrollHeight - (window.scrollY + window.innerHeight));
  const min = lengthFor(holder, holder.getBoundingClientRect().height - below);
  if (!(min > 0)) return;
  lastTap = { control, inPage: control.getBoundingClientRect().top + window.scrollY, path: window.location.pathname };
  keep(holder, min);
  if (typeof ResizeObserver !== "undefined") {
    watcher ??= new ResizeObserver(look);
    watcher.observe(holder);
    for (const child of Array.from(holder.children)) watcher.observe(child);
  }
  timer = setTimeout(settle, KEEP_WATCH_MS);
}

/**
 * Call when the reader moves the page with their own hand (a drag, a wheel).
 * The tap before it is over; a length that is doing something stays, to be
 * given back as they go up.
 */
export function noteReaderMovedPage(): void {
  if (typeof window === "undefined") return;
  if (lastTap) settle();
}

/**
 * Call when the page has scrolled or the window has changed size. Lets a
 * kept length go when the page is long enough of itself again, and gives
 * back whatever of it is below the screen, where it is not seen going.
 * While a tap's moment lasts nothing is given back: the page that tap is
 * about to shorten has not shortened yet.
 */
export function giveBack(): void {
  if (typeof window === "undefined" || !held || lastTap) return;
  if (!binds()) {
    letGo();
    return;
  }
  const below = held.holder.getBoundingClientRect().bottom - window.innerHeight;
  if (below < 0.5) return;
  held.min = Math.max(0, held.min - below);
  say(held.holder, held.min);
  // That may have been the last of it (a reader who went up the page in one
  // go): then nothing is kept, and nothing is left written on the page.
  if (!binds()) letGo();
}

/** How long the page is being kept, in px; 0 when it is not. */
export function keptLength(): number {
  return held ? held.min : 0;
}

/** Whether a length is being kept. */
export function isKeepingLength(): boolean {
  return held !== null;
}

/** The page changed, or the bridge is going: nothing is kept and no tap is remembered. */
export function endKeepLength(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  watcher?.disconnect();
  lastTap = null;
  if (typeof window !== "undefined") letGo();
}

/** Test seam. */
export function resetKeepLengthForTests(): void {
  if (timer) clearTimeout(timer);
  timer = null;
  lastTap = null;
  held = null;
  watcher = null;
  frame = 0;
  rules = null;
}
