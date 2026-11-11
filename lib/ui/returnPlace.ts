/**
 * Going back puts the reader where their thumb was.
 *
 * The browser restores a page's scroll as a number of pixels. That is the
 * right place only if the page is the same height above that point as it was
 * when the reader left, and a long list here is not: cards off screen are
 * placeholders (`content-visibility: auto`), drawn at a guessed height until
 * they are scrolled to, and a list that has just been put back has not been
 * scrolled at all.
 *
 * Measured on the 1.5.2 export on 2026-10-05, at a phone's size, on the
 * saints list (a card was really 282px and its placeholder 200px): a reader
 * who scrolled 20 saints down, opened one and came back found that saint
 * 1,400px above where they had left it; 40 saints down, 3,022px; 80 saints
 * down, 5,882px, seven screens away. The scroll number was right every time.
 * `scripts/export-walk.mjs` had been reading that number and calling it the
 * reader's place.
 *
 * So the place is remembered as what it is: the link that was tapped, and how
 * far from the top of the screen it sat. Coming back, that link is found
 * again and the page is moved until it sits there. It works whatever the
 * cards' heights turn out to be, and on a list that is fetched after the page
 * arrives (Community), where no pixel count could.
 *
 * The link has to be the one that was tapped, and not another that leads to
 * the same place (1.9, build 93 note 1; the owner on his phone: "when I click
 * back to go back to the first council of Nicaea ... it just randomly places
 * you at the bottom"). A council's page shows one of its Fathers on a card
 * that opens his page, and names him again, as a link, deep in its account.
 * He chose St Alexander in the row, opened him by the card and came back; the
 * row had begun again at St Athanasius, so the card he had tapped was gone,
 * and the only link left to St Alexander was the one in the account. It was
 * taken for the card, and the page was moved 3,424px down to put it where
 * his thumb had been. So a place also remembers how many links on the page
 * led where the tapped one did, and which of them it was; coming back, the
 * link is found only while the page has that many again and that one is
 * drawn. A page that has lost one, or gained one, cannot say which is which,
 * and is left where the browser put it: at the reader's own number, which on
 * a page like that one is right.
 *
 * It is not right on a page that gains a link BECAUSE the reader opened
 * something (1.9, the pre-build gate's tap walk, 2026-11-11). The reading
 * room draws "Continue reading" and "Because you read" once a work has been
 * opened, and the Bible's list draws a "Continue reading" row once a chapter
 * has. Each holds a new link to the very place the reader has just been. So
 * such a page always had one more link to that place than when it was left,
 * the tapped one was never looked for, and the page stayed at the browser's
 * number with the new shelves standing above it: measured on the export, a
 * cover in the reading room's library 576px below the thumb, and a book's
 * row in the Bible's list 68px below it (33 of its 40 rows, by the walk).
 * So a place also remembers the two links the tapped one stood between.
 * When the page has another number of links to the place, the tapped one is
 * the link to it that still stands between those two, is drawn and is not
 * in a bar. If none does, or two do, it cannot be told, and the page is left
 * where the browser put it, as before. The council's page stays safe: the
 * line in its account stands between other links than the card did.
 *
 * And the link is measured where it will stand, not where it is while it is
 * still being brought in. A page may bring a part of itself in as it opens
 * (Prayers' rule rises 8px into place, held low for half a second first),
 * and a page that comes back may bring it in again. While that lasts, where
 * the link is on the screen is not yet its place: measured on the 1.9
 * export, the page was moved 8px to meet a row that was still on its way,
 * the watch let go, and the row then rose 8px past the reader's thumb. At
 * first the answer was to measure nothing until the entrance had finished,
 * and put the page right then. That was right there, where the page did not
 * need to move, and late wherever it did: the Bible's list brings its rows
 * in again on the browser's own Back (held 8px low for a third of a second,
 * then rising), so its row would have stood 68px off for three quarters of
 * a second and then jumped. So what the entrance is still holding the link
 * by (the shift on whatever is on its way in) is taken off the measure, and
 * the page is put right at once, before it is painted. The watch does not
 * let go while an entrance lasts, and looks again when it has landed.
 *
 * The browser puts its own number back as well, a moment after the page
 * has come back, and not when asked (traced on the export: the step is
 * heard, the page is committed and put right here, the browser then sets
 * its own number, and the next frame's look puts the page right again
 * before that frame is painted). So the look is made every frame for as
 * long as the watch lasts, and nothing at the browser's number is shown.
 * Taking the restoring over at the step back does not stop the browser
 * (`history.scrollRestoration` set to "manual" as the step is heard: it
 * put its number back all the same, having read the setting before any
 * script ran), so the two stay as they are.
 *
 * Left alone:
 *   - A link that is not part of the page: one in a bar, a sheet or a menu
 *     (anything fixed or sticky). It will not be there, or it will be exactly
 *     where it was, and neither says anything about the page behind it.
 *   - A page that no longer has the link, or cannot tell it from another to
 *     the same place (above). Among them, on a page that has gained a link
 *     to the place, a tapped link that stood right beside what was added: it
 *     no longer stands between the same two.
 *   - A page left some other way (the tab bar, a button). The browser's
 *     number is all there is, and the placeholders are now sized close to
 *     the real cards so that it lands near (`.cv-card` in app/globals.css).
 *   - The reader. The first touch, wheel or key ends the adjusting at once.
 *
 * No React here, so it can be tested with a stubbed window; the mount is
 * components/nav/ScrollResetBridge.tsx.
 */

/**
 * The tapped link: which one of how many to the same place, where the two
 * links it stood between lead (null: there was none on that side), and where
 * on the screen it was.
 */
export type Place = { href: string; nth: number; of: number; top: number; before: string | null; after: string | null };

/** A tap older than this did not cause the navigation that follows it. */
export const TAP_MS = 15000;

/**
 * How long the page is watched after coming back. A list drawn from the
 * page's own data is there on the first frame; one that is fetched arrives
 * within a second or two. Frames, at about sixty a second.
 */
export const WATCH_FRAMES = 150;

/** The page is left alone once the link has sat still this many frames, and not before `SETTLE_FRAMES`. */
export const STEADY_FRAMES = 6;

/** The browser may put its own number back a few frames late. Stay through that. */
export const SETTLE_FRAMES = 30;

/** How many pages' places are kept. A reader's way back is rarely this deep. */
const KEEP = 24;

const STOP_EVENTS = ["touchstart", "wheel", "keydown", "pointerdown"] as const;

const places = new Map<string, Place>();
let lastTap: { place: Place; from: string; at: number } | null = null;
let stopWatching: (() => void) | null = null;

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

/** The page a place belongs to. The query is part of it: a filtered list is another list. */
function address(): string {
  return window.location.pathname + window.location.search;
}

/** True when the link rides in something pinned to the screen rather than in the page. */
function isPinned(el: Element): boolean {
  for (let node: Element | null = el; node && node !== document.body; node = node.parentElement) {
    const position = window.getComputedStyle(node).position;
    if (position === "fixed" || position === "sticky") return true;
  }
  return false;
}

/**
 * Where the nearest link of the page on one side of `all[i]` leads (`step`
 * -1: the one before it, 1: the one after), or null when there is none.
 *
 * Only a link a reader could see beside it is a neighbour. Not one in a bar:
 * it is not part of the page, and where it leads may change with what the
 * reader has done (the Bible tab opens the chapter last read). And not one
 * that is not drawn: the Bible's list is in the page twice, for a phone and
 * for a wide screen, and the wide one, which a phone never draws, begins
 * right after the phone's last book. When it gained its own "Continue
 * reading" row, Revelation's row had a new link after it that no reader
 * could see, was not known again, and came back 67px off (measured on the
 * export, the first run of scripts/back-walk.mjs).
 */
function beside(all: readonly Element[], i: number, step: -1 | 1): string | null {
  for (let j = i + step; j >= 0 && j < all.length; j += step) {
    if (all[j].getClientRects().length > 0 && !isPinned(all[j])) return all[j].getAttribute("href");
  }
  return null;
}

/**
 * The link the place names, if the page has drawn it and it can be told from
 * every other.
 *
 * While the page has as many links to that place as it had when the reader
 * tapped one, it is the same one of them, if that one is drawn. Never
 * another link to the same place in its stead; until 1.9 the first one drawn
 * was taken when the tapped one was not there, which is how a council's page
 * came back at a line of its account.
 *
 * When the page has another number of them (it has drawn a shelf of what was
 * last opened, or dropped one), it is the link to that place that still
 * stands between the two links the tapped one stood between, is drawn and is
 * not in a bar. One such link is the tapped one. None, or two, and it cannot
 * be told.
 */
function find(place: Place): HTMLAnchorElement | null {
  const all = Array.from(document.links) as HTMLAnchorElement[];
  const same: number[] = [];
  for (let i = 0; i < all.length; i += 1) {
    if (all[i].getAttribute("href") === place.href) same.push(i);
  }
  if (same.length === place.of) {
    const link = all[same[place.nth]];
    return link && link.getClientRects().length > 0 ? link : null;
  }
  let found: HTMLAnchorElement | null = null;
  for (const i of same) {
    const link = all[i];
    if (link.getClientRects().length === 0 || isPinned(link)) continue;
    if (beside(all, i, -1) !== place.before || beside(all, i, 1) !== place.after) continue;
    if (found) return null;
    found = link;
  }
  return found;
}

/** How far down the screen a `transform` is holding what it is on: the y of its matrix, as the browser gives it. */
function shiftOfTransform(value: string | undefined): number {
  if (!value || value === "none") return 0;
  const matrix = /^matrix(3d)?\((.+)\)$/.exec(value.trim());
  if (!matrix) return 0;
  const n = matrix[2].split(",").map((part) => Number.parseFloat(part));
  const y = matrix[1] ? n[13] : n[5];
  return Number.isFinite(y) ? y : 0;
}

/** The same of a `translate`: its second length, when it is one in px. */
function shiftOfTranslate(value: string | undefined): number {
  if (!value || value === "none") return 0;
  const y = value.trim().split(/\s+/)[1];
  if (!y || !/^-?[\d.]+(e-?\d+)?px$/.test(y)) return 0;
  return Number.parseFloat(y);
}

/**
 * What is still bringing the link in: whether it, or something that holds
 * it, has an animation under way that will end, and how far down the screen
 * such things are holding it for now (a part that rises 8px into place,
 * while it is held low: 8). One that never ends (a light that breathes) is
 * no entrance, and is neither waited for nor taken off the measure.
 *
 * The shift is read as it stands and taken to end at nothing, as an
 * entrance does: a part brought in from a little below comes to rest where
 * it belongs (the rows' `cascade-rise-in` in app/globals.css is a `from`
 * with no `to`). A motion that ended shifted would be met a little off, and
 * put right when it had landed, since the watch stays until then.
 */
function entrance(link: Element): { under: boolean; held: number } {
  let under = false;
  let held = 0;
  for (let node: Element | null = link; node && node !== document.body; node = node.parentElement) {
    if (typeof node.getAnimations !== "function") continue;
    let coming = false;
    for (const animation of node.getAnimations()) {
      if (animation.playState !== "running") continue;
      const ends = animation.effect?.getComputedTiming().endTime;
      if (typeof ends === "number" && Number.isFinite(ends)) coming = true;
    }
    if (!coming) continue;
    under = true;
    const style = window.getComputedStyle(node);
    held += shiftOfTransform(style.transform) + shiftOfTranslate(style.translate);
  }
  return { under, held };
}

/**
 * Call from a capturing `click` listener on the document. Remembers the link
 * under the thumb. Whether it led anywhere is decided when a route commits.
 */
export function noteLinkTap(event: { target: EventTarget | null }): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const target = event.target as Element | null;
  const link = target && typeof target.closest === "function" ? (target.closest("a[href]") as HTMLAnchorElement | null) : null;
  if (!link) return;
  const href = link.getAttribute("href");
  // A place on this page, or somewhere outside the app, leaves no page behind.
  if (!href || href.startsWith("#") || /^[a-z][a-z0-9+.-]*:/i.test(href)) return;
  if (isPinned(link)) {
    lastTap = null;
    return;
  }
  const all = Array.from(document.links) as HTMLAnchorElement[];
  const same = all.filter((a) => a.getAttribute("href") === href);
  const at = all.indexOf(link);
  lastTap = {
    place: {
      href,
      nth: Math.max(0, same.indexOf(link)),
      of: same.length,
      top: link.getBoundingClientRect().top,
      before: at < 0 ? null : beside(all, at, -1),
      after: at < 0 ? null : beside(all, at, 1),
    },
    from: address(),
    at: now(),
  };
}

/**
 * Call when a page opened by going forward has committed. The link that was
 * tapped on the page just left becomes that page's place.
 */
export function keepPlace(): void {
  const tap = lastTap;
  lastTap = null;
  if (!tap || now() - tap.at > TAP_MS) return;
  places.delete(tap.from);
  places.set(tap.from, tap.place);
  while (places.size > KEEP) {
    const oldest = places.keys().next().value;
    if (oldest === undefined) break;
    places.delete(oldest);
  }
}

/** Ends the adjusting. Safe to call at any time. */
export function endReturn(): void {
  stopWatching?.();
}

/**
 * Whether a page reached by going back is being moved to the link the reader
 * had tapped. A page that keeps a place of its own (Orthodox History's row,
 * lib/history/scroll.ts) leaves the page to this then, so the two never pull
 * it two ways.
 */
export function isReturning(): boolean {
  return stopWatching !== null;
}

/**
 * Call when a page reached by going back has committed. If the reader left
 * it by a link, moves the page until that link is where their thumb was.
 * Returns whether it had a place to return to, for the test and nothing else.
 */
export function returnToPlace(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  lastTap = null;
  endReturn();
  const key = address();
  const place = places.get(key);
  if (!place) return false;
  places.delete(key);

  let frames = 0;
  let steady = 0;
  let frame = 0;
  let done = false;
  function stop() {
    if (done) return;
    done = true;
    if (frame) window.cancelAnimationFrame(frame);
    for (const type of STOP_EVENTS) window.removeEventListener(type, stop);
    if (stopWatching === stop) stopWatching = null;
  }
  function look() {
    if (done) return;
    frames += 1;
    const link = find(place!);
    if (link) {
      const coming = entrance(link);
      // Where it will stand: what is still bringing it in is taken off.
      const off = link.getBoundingClientRect().top - coming.held - place!.top;
      if (Math.abs(off) > 1) {
        // At once, whatever the page's own scroll behaviour says: this is a
        // correction, not a journey.
        window.scrollBy({ top: off, left: 0, behavior: "instant" as ScrollBehavior });
        steady = 0;
      } else if (coming.under) {
        // In its place to be, but not there yet: that is not sitting still.
        steady = 0;
      } else {
        steady += 1;
      }
    }
    if (frames >= WATCH_FRAMES || (steady >= STEADY_FRAMES && frames >= SETTLE_FRAMES)) {
      stop();
      return;
    }
    frame = window.requestAnimationFrame(look);
  }
  // The reader's own hand ends it: passive, and never preventing anything.
  for (const type of STOP_EVENTS) window.addEventListener(type, stop, { passive: true });
  stopWatching = stop;
  // Once now, before the page is painted, then frame by frame.
  look();
  return true;
}

/** Test seam. */
export function resetReturnPlaceForTests(): void {
  endReturn();
  places.clear();
  lastTap = null;
  stopWatching = null;
}
