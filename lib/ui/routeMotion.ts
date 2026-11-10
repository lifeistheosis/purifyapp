/**
 * Every page switch moves (1.9, build 89 note 4; the standard is in CLAUDE.md,
 * the owner's word of 2026-11-10: "it just instantly pulls up the page ... I
 * want that to be the standard too with every single page switch").
 *
 * What a reader sees. Going forward, the page they asked for settles in over
 * the one they were on. Going back, the page they are leaving sinks away and
 * the one behind it returns. Changing tab, or turning to the page beside this
 * one (the next chapter, another of Theology's four ways), the two cross-fade
 * and nothing travels. The tab bar never moves. It is the browser's View
 * Transitions, tuned in app/globals.css ("Every page switch moves"), on the
 * house curve and inside a third of a second; a phone too old to have them
 * (an iPhone before iOS 18) changes pages as it did before.
 *
 * Why there are two ways in, and not one.
 *
 *   FORWARD AND ACROSS go through React. Next 16's own guide
 *   (node_modules/next/dist/docs/01-app/02-guides/view-transitions.md) puts a
 *   <ViewTransition> where a change should be pictured, and React starts the
 *   browser's transition at the moment the new page commits, so the old page
 *   is on screen, live, for exactly as long as the new one takes to be ready.
 *   components/nav/RouteTransition.tsx is that one place, for every route.
 *
 *   BACK cannot. A step through history is rendered by React at once, inside
 *   the browser's popstate, so that the browser can put the scroll back where
 *   it was (lib/ui/scrollReset.ts and returnPlace.ts depend on it), and a
 *   change made at once is never pictured: measured in this app on
 *   2026-11-10, a tap forward started a transition and history.back() started
 *   none. So the app's own ways back (the chevron of a top bar, lib/nav/
 *   goBack.ts; the phone's Back button on Android, components/nav/
 *   RouteTransition.tsx) start the transition themselves, here, BEFORE they
 *   step back: the page being left is held as a picture, the step is taken,
 *   and when the page behind has been put back (and its scroll with it) the
 *   two change places. Nothing about how the step itself is made changes.
 *
 *   The browser's own Back (its button, a swipe from the edge in Safari) is
 *   left alone, as the platform asks: Safari draws its own slide under the
 *   finger, and a second transition on top of it is the fault the
 *   specification's `hasUAVisualTransition` exists to prevent.
 *
 * No React here, so it can be tested with a stubbed document; the mount is
 * components/nav/RouteTransition.tsx. lib/ui/__tests__/routeMotion.test.ts
 * holds the rules below and the wiring that calls them.
 */

/**
 * How a route change moves. "traverse" is a step through history that the
 * app did not start (the browser's Back or Forward): it is told apart only
 * so that it is NOT pictured.
 */
export type NavKind = "forward" | "back" | "swap";
export type NavNote = NavKind | "traverse";

/**
 * A note older than this did not cause the route that follows it. The same
 * length, for the same reason, as lib/ui/scrollReset.ts TRAVERSAL_MS: a
 * popstate for a #hash on the same page commits no route.
 */
export const NOTE_MS = 1500;

/**
 * How long a step back may hold the page as a picture while nothing arrives.
 * A real step fires popstate within a frame or two; at the bottom of the
 * history nothing ever comes (lib/nav/backBar.ts, backOutcome), and the page
 * must not stand frozen for it. Past this the picture is dropped and the
 * step, if it does come, changes the page as it always did.
 */
export const RETURN_HOLD_MS = 200;

/**
 * How long a page takes to arrive, at the longest: the page settling in and
 * a picture travelling to its head (app/globals.css, "Every page switch
 * moves": 340ms), and a frame more.
 */
export const SETTLE_MS = 360;

type Transition = { finished: Promise<unknown>; ready: Promise<unknown>; skipTransition: () => void };
type MovingDocument = Document & { startViewTransition?: (update: () => unknown) => Transition };

let noted: { note: NavNote; at: number } | null = null;
/** When the page now arriving will have arrived. */
let settledAt = 0;

/**
 * The name a travelling picture wears in a transition (below, "A picture that
 * leads to its own page"). One name, worn by one thing at a time on each
 * side: the browser stops a whole transition that is given two things of one
 * name.
 */
export const CARRIED = "carried";

/** How a picture went into a page, kept so that it can come back out the same way. */
type Way = { href: string; key: string; nth: number };

/** How many pages' ways back are kept. The same number as lib/ui/returnPlace.ts keeps places. */
const KEEP_WAYS = 24;

let wearing: HTMLElement[] = [];
/** Cards made to be drawn for the length of a change (see `drawn`). */
let shown: HTMLElement[] = [];
let lifted: (Way & { to: string }) | null = null;
let liftTimer: ReturnType<typeof setTimeout> | null = null;
const ways = new Map<string, Way>();
let returning: { release: () => void; drop: () => void; way: Way | null } | null = null;

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

/** Say what the next route change is, from where it is caused. */
export function noteNav(note: NavNote): void {
  noted = { note, at: now() };
}

function depth(path: string): string[] {
  return path.split("/").filter(Boolean);
}

/**
 * Two pages that stand side by side: under the same page, at the same depth
 * (John 3 and John 4, two saints, two of Theology's ways). Moving between
 * them goes no deeper, so they cross-fade as tabs do. The first level is not
 * counted: Prayers and the Bible are side by side on the tab bar, which says
 * so itself, and a link from one to the other inside a page goes somewhere.
 */
export function standBeside(from: string, to: string): boolean {
  const a = depth(from);
  const b = depth(to);
  if (a.length < 2 || a.length !== b.length) return false;
  return a.slice(0, -1).join("/") === b.slice(0, -1).join("/");
}

/** The same page, whatever the export's trailing slash says ("/saints/" and "/saints"). */
export function samePage(a: string, b: string): boolean {
  return depth(a).join("/") === depth(b).join("/");
}

/**
 * What the route change now committing is: what was said of it, or what its
 * two addresses say. Taken once; the note does not outlive its route.
 */
export function takeNav(from: string, to: string): NavNote {
  const said = noted && now() - noted.at < NOTE_MS ? noted.note : null;
  noted = null;
  if (said) return said;
  return standBeside(from, to) ? "swap" : "forward";
}

/** Whether this screen can picture a page switch, and may: the browser has View Transitions and motion is on. */
export function canMove(): boolean {
  if (typeof document === "undefined") return false;
  if (typeof (document as MovingDocument).startViewTransition !== "function") return false;
  return document.documentElement.dataset.motion !== "reduce";
}

/** True while a step back is held as a picture. */
export function isReturning(): boolean {
  return returning !== null;
}

/**
 * Take a step back as a transition. `step` is the step itself
 * (router.back(), history.back()) and is always taken, exactly once: inside
 * the transition where there can be one, and plainly where there cannot.
 */
export function returnBy(step: () => void): void {
  if (!canMove() || returning) {
    step();
    return;
  }
  const root = document.documentElement;
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let taken = false;
  const take = () => {
    if (taken) return;
    taken = true;
    step();
  };
  // Before the page being left is pictured: the head of a page a picture was
  // carried into goes back into its card.
  const way = liftBack(typeof window === "undefined" ? "" : window.location.pathname);
  let transition: Transition;
  try {
    transition = (document as MovingDocument).startViewTransition!(() => {
      take();
      return held;
    });
  } catch {
    setDown();
    take();
    return;
  }
  dress(root, "back");
  // Nothing behind this page, or a step that is slow to come: let the page
  // go. Skipped first, so the same page is never cross-faded with itself.
  const drop = () => {
    clearTimeout(timer);
    transition.skipTransition();
    release();
  };
  const timer = setTimeout(drop, RETURN_HOLD_MS);
  returning = {
    release: () => {
      clearTimeout(timer);
      release();
    },
    drop,
    way,
  };
  const end = () => {
    clearTimeout(timer);
    returning = null;
    undress(root);
    setDown();
    // The step is taken even if the browser never ran the update at all.
    take();
  };
  transition.finished.then(end, end);
  transition.ready.then(undefined, () => {});
}

/**
 * The step back landed and brought no page (it closed something that had a
 * history entry of its own): drop the picture now, so what closes is seen
 * closing.
 */
export function dropReturn(): void {
  returning?.drop();
}

/**
 * Call when a route has committed. True when it came inside a step back that
 * is being held, which this lets go: the page behind is in place, so the
 * browser may picture it.
 */
export function arrived(): boolean {
  if (!returning) return false;
  if (returning.way) carryBack(returning.way);
  returning.release();
  return true;
}

/**
 * How a change moves is said to the browser as a class on the page itself
 * (`view-transition-class` on <html>), which the browser takes down WITH the
 * picture of the new page and keeps for as long as the transition runs. So
 * it can be taken off again at any time without touching a transition in
 * flight. It was first an attribute the stylesheet matched, taken off in an
 * effect "after the transition": but React runs that effect early whenever
 * anything else on the page updates, the rules then stopped matching in
 * mid-flight, and the browser's own cross-fade started over from nothing
 * (seen in stills, 2026-11-10). app/globals.css matches
 * `::view-transition-old(root.nav-forward)` and its fellows.
 */
function dress(root: HTMLElement, kind: NavKind): void {
  root.style.setProperty("view-transition-class", `nav-${kind}`);
}

function undress(root: HTMLElement): void {
  root.style.removeProperty("view-transition-class");
  root.style.removeProperty("view-transition-name");
}

/**
 * Begin picturing a route change that React is committing now (forward, or
 * across). Says how it moves, and keeps the whole page in the picture: React
 * leaves the page itself out of a transition when all it knows to have
 * changed is inside a <ViewTransition>, unless the page has been named
 * (react-dom, "viewTransitionName" on the document element), and a route
 * change is the page changing.
 */
export function beginNav(kind: NavKind): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("view-transition-name", "root");
  dress(root, kind);
  settledAt = now() + SETTLE_MS;
}

/**
 * How long until the page now arriving has arrived, in milliseconds; 0 when
 * none is on its way, or none was pictured. For what a page does to itself
 * as it opens and should do after it has arrived: a book takes a returning
 * reader down to the paragraph they left (components/saints/useWorkPlace.ts,
 * useLanding), and a page that scrolled while it was still settling in, with
 * the book's cover still travelling to its head, moved the place the cover
 * was travelling to.
 */
export function untilSettled(): number {
  return Math.max(0, Math.ceil(settledAt - now()));
}

/**
 * The page is itself again. Safe at any time, a transition in flight
 * included (see `dress`); a step back that is still being held keeps what it
 * was given until it ends.
 */
export function endNav(): void {
  if (typeof document === "undefined") return;
  if (returning) return;
  undress(document.documentElement);
  // A picture lifted by a tap that is still on its way keeps its name.
  if (!lifted) setDown();
}

/**
 * The entrance of an (app) route is a fade of its own (app/(app)/template.tsx,
 * `.route-fade`), and after it the page's rows come in one by one
 * (`.cascade`). A page that arrives in a transition has already been brought
 * in, and the wrapper's fade on top would bring it in twice, so the wrapper
 * is told how its page arrived, for as long as it lives (never untold:
 * taking the word off would start the fade then). A page that RETURNS is
 * not assembled again row by row either: the reader has seen it, and it is
 * simply there (app/globals.css, `.route-fade[data-carried]`).
 */
export function quietEntrance(kind: NavKind): void {
  if (typeof document === "undefined") return;
  for (const el of document.querySelectorAll<HTMLElement>(".route-fade")) {
    el.dataset.carried = kind;
  }
}

// ── A picture that leads to its own page ─────────────────────────────
//
// "A card that opens its own page carries its picture into it" (CLAUDE.md).
// The card's picture and the picture at the head of its page are given one
// name for the length of the transition, and the browser moves the one into
// the place and shape of the other.
//
// Two attributes say which pictures, and nothing else in a component knows
// of this:
//
//   data-carry="<key>"       on the picture inside a link (the element that
//                            is the picture: its frame, cut to its shape)
//   data-carry-into="<key>"  on the picture it becomes on the page it opens;
//                            with no key, a head that takes whatever comes
//
// A key is how a page with several pictures knows which one (the Hours'
// rows: the tile wears the icon of the Hour it is, and goes into that Hour's
// row). Where nothing on the new page takes the picture, it leaves with its
// page and nothing travels.
//
// Going back, the same two change places the other way: the head goes back
// into the card it came out of, found again as the same link (the nth with
// that address, as lib/ui/returnPlace.ts finds the reader's place).

function pageKey(path: string): string {
  return depth(path.split(/[?#]/)[0]).join("/");
}

/**
 * What kind of picture a key names, where it says: "cover:Confessions" is a
 * cover, "way:creed" one of Theology's ways. A picture known by its own
 * address ("/icons/basil.jpg", "https://...") is of no kind.
 */
export function kindOf(key: string): string | null {
  return /^([a-z]+):(?!\/)/.exec(key)?.[1] ?? null;
}

/**
 * `landing`: the picture the travelling one becomes. It is marked while it
 * wears the name, and the stylesheet shows what is in it at once: a picture
 * that fades in as it loads would fade in under the one arriving on it.
 *
 * A picture of a kind wears its kind too, as a class beside the name
 * (`view-transition-class: carried-cover`), so the stylesheet can move one
 * kind in its own way. A cover has to be: it is the same poster at both ends
 * with its title and author on it, and passed into each other as two
 * pictures are, the words stood twice for the first frames (seen in the
 * film, 2026-11-10; app/globals.css, "A cover is one poster").
 */
function wear(el: HTMLElement, key: string, landing = false): void {
  el.style.setProperty("view-transition-name", CARRIED);
  const kind = kindOf(key);
  if (kind) el.style.setProperty("view-transition-class", `carried-${kind}`);
  if (landing) el.dataset.carriedIn = "";
  wearing.push(el);
}

/**
 * Every picture gives the name back.
 *
 * One that a picture has just landed on keeps a mark of it (`data-landed`,
 * 1.9). While it wore the name it was shown whole, whatever it was waiting
 * for (app/globals.css, `[data-carried-in]`): the reading room's covers wait
 * unseen for their pictures, and a tile is seen at once while its cover
 * travels back into it. Given the name back, a tile whose picture the phone
 * had dropped from memory went unseen again for a moment, under the reader's
 * eyes, until the picture was back. What has landed stays seen.
 */
export function setDown(): void {
  for (const el of wearing) {
    el.style.removeProperty("view-transition-name");
    el.style.removeProperty("view-transition-class");
    if ("carriedIn" in el.dataset) el.dataset.landed = "";
    delete el.dataset.carriedIn;
  }
  wearing = [];
  for (const el of shown) el.style.removeProperty("content-visibility");
  shown = [];
}

/**
 * A long list draws a card only once it is near the screen
 * (`content-visibility: auto`, `.cv-card`), and the browser decides that a
 * frame late. A list that has just been put back is pictured before that
 * frame, with the card the reader came out of still undrawn, and a picture
 * in an undrawn card cannot travel: measured on the export, the saint's icon
 * left his page and did not arrive in his card. So the card that takes the
 * picture back is drawn for the length of the change, and given back to the
 * list's own rule after it, by which time it is on the screen.
 */
function drawn(el: HTMLElement): void {
  if (typeof getComputedStyle !== "function") return;
  for (let node: HTMLElement | null = el; node && node !== document.body; node = node.parentElement) {
    if (getComputedStyle(node).contentVisibility !== "auto") continue;
    node.style.setProperty("content-visibility", "visible");
    shown.push(node);
  }
}

function linksTo(href: string): Element[] {
  return [...document.querySelectorAll("a[href]")].filter((a) => a.getAttribute("href") === href);
}

function takerOf(key: string): HTMLElement | null {
  const all = [...document.querySelectorAll<HTMLElement>("[data-carry-into]")];
  return (key ? all.find((el) => el.dataset.carryInto === key) : undefined) ?? all.find((el) => el.dataset.carryInto === "") ?? null;
}

/**
 * What the picture lands in is already there. A page brings its head in
 * with entrances of its own (a fade on the icon, the rows' cascade), and a
 * picture that has travelled to its place must not then fade in again from
 * nothing. Each one-shot entrance above it is taken to its end, never taken
 * away.
 */
function settle(el: HTMLElement): void {
  for (let node: HTMLElement | null = el; node && node !== document.body; node = node.parentElement) {
    if (typeof node.getAnimations !== "function") continue;
    for (const animation of node.getAnimations()) {
      const timing = animation.effect?.getComputedTiming();
      if (!timing || timing.iterations === Infinity) continue;
      try {
        animation.finish();
      } catch {
        // An animation with no end cannot be finished, and is left running.
      }
    }
  }
}

/**
 * A tap. If it is on a link with a picture to carry, the picture takes the
 * name now, so it is in the picture of the page being left whenever that is
 * taken. Call from a capturing click listener.
 */
export function liftFrom(target: EventTarget | null): void {
  if (typeof document === "undefined") return;
  if (liftTimer) clearTimeout(liftTimer);
  setDown();
  lifted = null;
  if (!canMove()) return;
  const link = (target as Element | null)?.closest?.("a[href]") ?? null;
  const picture = link?.querySelector<HTMLElement>("[data-carry]") ?? null;
  const href = link?.getAttribute("href") ?? "";
  if (!link || !picture || !href.startsWith("/")) return;
  lifted = { href, key: picture.dataset.carry ?? "", nth: Math.max(0, linksTo(href).indexOf(link)), to: pageKey(href) };
  wear(picture, lifted.key);
  // A tap that goes nowhere (a new tab, a handler that stops it) leaves no
  // name behind it.
  liftTimer = setTimeout(() => {
    lifted = null;
    setDown();
  }, NOTE_MS);
}

/**
 * The page a picture was lifted for has committed: the picture that takes it
 * wears the name too, and the way back is remembered.
 */
export function carryIn(to: string): void {
  if (typeof document === "undefined") return;
  const was = lifted;
  lifted = null;
  if (liftTimer) clearTimeout(liftTimer);
  if (!was || was.to !== pageKey(to)) {
    setDown();
    return;
  }
  const taker = takerOf(was.key);
  if (!taker) return;
  settle(taker);
  wear(taker, was.key, true);
  ways.delete(was.to);
  ways.set(was.to, { href: was.href, key: was.key, nth: was.nth });
  while (ways.size > KEEP_WAYS) ways.delete(ways.keys().next().value as string);
}

/**
 * In sight: some of it is on the screen. The browser pictures a named
 * picture wherever it stands, on the screen or far above it, and a head the
 * reader had scrolled a long way past was flown back into its card from
 * beyond the top of the screen (seen in the film of a book read on,
 * 2026-11-10: the cover came down out of nowhere). A picture that is not in
 * sight has nowhere to be seen leaving from.
 */
function inSight(el: HTMLElement): boolean {
  if (typeof window === "undefined" || typeof el.getBoundingClientRect !== "function") return true;
  const box = el.getBoundingClientRect();
  const height = window.innerHeight;
  return box.bottom > 0 && (!(height > 0) || box.top < height);
}

/**
 * A step back is about to be pictured from this page: its head takes the
 * name, to go back into its card. Only a head that is in sight: from further
 * down the page nothing travels, and the card arrives with its page.
 */
function liftBack(from: string): Way | null {
  const way = ways.get(pageKey(from));
  if (!way) return null;
  const head = takerOf(way.key);
  if (!head || !inSight(head)) return null;
  setDown();
  wear(head, way.key);
  return way;
}

/** The page behind has committed: the card the picture came out of takes the name. */
function carryBack(way: Way): void {
  const picture = linksTo(way.href)[way.nth]?.querySelector<HTMLElement>("[data-carry]") ?? null;
  if (!picture) return;
  drawn(picture);
  wear(picture, way.key, true);
}

/** Test seam. */
export function resetRouteMotionForTests(): void {
  noted = null;
  settledAt = 0;
  returning = null;
  wearing = [];
  shown = [];
  lifted = null;
  if (liftTimer) clearTimeout(liftTimer);
  liftTimer = null;
  ways.clear();
}
