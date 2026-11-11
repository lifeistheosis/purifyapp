/**
 * The way out of a reader (1.9, the pre-build gate: "Back that does not
 * return to where the reader was").
 *
 * A chapter of the Bible has one round button at its top left, a chevron
 * named Back. It was a door: it always opened the whole list of books, at
 * its top (`back="/bible"`). That is right for a reader who has nothing
 * behind them, which since 1.8 is most of them: the Bible tab opens the
 * chapter last read, and the list is then reached by that button and by
 * nothing else. It is wrong for a reader who came to the chapter from
 * somewhere: from a row of the list, which came back at Genesis and not at
 * their row; from Today's reading, a saint's page or the search, which came
 * back as the list and not as the page they had been on. The phone's Back
 * returned them rightly, and the button named Back did not. The owner's own
 * note 1 on build 93 was a page's Back button that did not return him to his
 * place.
 *
 * The rule (the arbiter, 2026-11-11):
 *
 *  - From a row of the list, to that row. From anywhere else, to that place.
 *  - With nothing behind (a fresh open, a shared link, the Bible tab), the
 *    whole list, as before.
 *  - Chapters turned inside the reader are not steps: one tap leaves it.
 *
 * So a room is told apart from the pages it is reached from (ROOMS: the
 * pages a reader turns inside it), and the page the reader came into it from
 * is remembered, as an address and how far down it stood. Only a page they
 * went FORWARD from counts. The tab bar's tabs stand side by side: Today is
 * not behind a chapter the Bible tab opened, and going "back" to it would
 * leave the list of books with no way to it at all.
 *
 * Leaving is then one of three things:
 *
 *  1. A true step through history, as far back as that page, where the
 *     browser can say exactly where it is (the Navigation API: every Android
 *     WebView that has View Transitions, and an iPhone from iOS 26.2). The
 *     page is found as the nearest one behind that is not of the room, and
 *     it must be the page remembered, or nothing is done on its strength. It
 *     is pictured as any step back (lib/ui/routeMotion.ts, returnBy), and the
 *     reader's place on it is put back as on any step back
 *     (lib/ui/returnPlace.ts). Counting the chapters turned would have been
 *     wrong the first time a verse's own address made an entry of its own.
 *  2. Where the browser cannot say (an iPhone before 26.2): the page they
 *     came from is opened as the page behind would return, and put where
 *     they left it. It is a new entry and not a step, which no reader of an
 *     iPhone can tell: the phone has no Back of its own.
 *  3. Nothing remembered, or the two disagree: the door to the list, as it
 *     was. That is `false`, and the link is left to do what it does.
 *
 * Remembered in memory and nowhere else: after a reload nothing is behind,
 * and the button is the door again.
 *
 * No React here, so it can be tested with a stubbed window. The marks are
 * made by components/nav/RouteTransition.tsx (every route, and every tap),
 * and the one caller is a top bar that says which room it leaves
 * (components/nav/MobileTopBar.tsx, `leaves`), which only the chapter's page
 * does.
 */

import { noteNav, returnBy } from "@/lib/ui/routeMotion";
import { noteReturn } from "@/lib/ui/scrollReset";

import { BACK_FALLBACK_MS } from "./backBar";

/** The pages a reader turns inside a room. A chapter: /bible/<book>/<number>. */
export const ROOMS = {
  bible: /^\/bible\/[^/]+\/\d+\/?$/,
} as const;

export type Room = keyof typeof ROOMS;

/** How a route came: forward by a link, across (a tab, a chapter turned), as a floor a Back button opened, or by a step through history. */
export type RouteKind = "forward" | "swap" | "back" | "traverse";

export type LeaveRouter = { push: (href: string, options?: { scroll?: boolean }) => void };

type Entry = { url: string | null; index: number };
type LeaveWindow = Pick<Window, "addEventListener" | "removeEventListener" | "setTimeout"> & {
  location: { pathname: string; search: string };
  history: { go: (by: number) => void };
  scrollY?: number;
  navigation?: { entries?: () => Entry[]; currentEntry?: Entry | null };
};

type Way = { came: string; down: number };

const ways = new Map<Room, Way>();
let lastAddress: string | null = null;
let lastTap: { address: string; down: number } | null = null;

function theWindow(win?: LeaveWindow): LeaveWindow | undefined {
  return win ?? (typeof window === "undefined" ? undefined : (window as unknown as LeaveWindow));
}

function addressOf(w: LeaveWindow): string {
  return w.location.pathname + w.location.search;
}

/** The path of an address or a whole URL, without what follows ? or #. */
function pathOf(address: string): string {
  const local = address.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]*/i, "");
  return local.split(/[?#]/)[0] || "/";
}

/** One address as another: the same path, whatever its last slash, and the same query. */
function sameAddress(a: string, b: string): boolean {
  const shape = (address: string) => {
    const local = address.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]*/i, "").split("#")[0];
    const [path, query = ""] = local.split("?");
    return `${path.replace(/\/+$/, "") || "/"}?${query}`;
  };
  return shape(a) === shape(b);
}

function inRoom(room: Room, address: string): boolean {
  return ROOMS[room].test(pathOf(address));
}

/**
 * Call when the bridge mounts, and from a capturing `click` on the document:
 * where the page stands now, so the page a reader leaves is known as it was
 * when they left it.
 */
export function noteWayTap(win?: LeaveWindow): void {
  const w = theWindow(win);
  if (!w) return;
  const address = addressOf(w);
  lastTap = { address, down: Math.round(w.scrollY ?? 0) };
  // With its query, which a route that only filters a page does not bring here.
  lastAddress = address;
}

/**
 * Call when a route has committed, with how it came. A room entered by going
 * forward remembers the page it was entered from; one entered across (the
 * tab bar) or as a floor has nothing behind it; a step through history that
 * lands in a room changes nothing, since what was behind it still is.
 */
export function noteWayRoute(kind: RouteKind, win?: LeaveWindow): void {
  const w = theWindow(win);
  if (!w) return;
  const from = lastAddress;
  const to = addressOf(w);
  lastAddress = to;
  for (const room of Object.keys(ROOMS) as Room[]) {
    if (!inRoom(room, to)) continue;
    // A page turned inside the room: not a step, whichever way it came.
    if (from !== null && inRoom(room, from)) continue;
    if (kind === "traverse") continue;
    if (kind === "forward" && from !== null) ways.set(room, { came: from, down: lastTap && sameAddress(lastTap.address, from) ? lastTap.down : 0 });
    else ways.delete(room);
  }
}

/** The page a room was entered from, if the reader went forward into it. For the test, and for nothing else. */
export function wayOf(room: Room): Way | null {
  return ways.get(room) ?? null;
}

/**
 * Leave the room the reader is in, to where they were before it. True when
 * that has been done from here; false when there is nothing to return to,
 * and the caller's own door (its link to the floor) should open.
 */
export function leaveBy(router: LeaveRouter, room: Room, floor: string, win?: LeaveWindow): boolean {
  const w = theWindow(win);
  if (!w) return false;
  const way = ways.get(room);
  if (!way || !inRoom(room, addressOf(w))) return false;

  const nav = w.navigation;
  const entries = typeof nav?.entries === "function" ? nav.entries() : null;
  const here = nav?.currentEntry?.index;
  if (entries && typeof here === "number" && here >= 0) {
    // The nearest page behind this one that is not of the room.
    let behind = here - 1;
    while (behind >= 0 && entries[behind]?.url && inRoom(room, entries[behind].url!)) behind -= 1;
    const target = behind >= 0 ? entries[behind] : undefined;
    if (!target?.url || !sameAddress(target.url, way.came)) return false;

    // Armed before the step, as lib/nav/goBack.ts arms it: a step that moved
    // nothing by the deadline sends the reader to the floor, never nowhere.
    let moved = false;
    const onMove = () => {
      moved = true;
    };
    w.addEventListener("popstate", onMove, { once: true });
    w.addEventListener("pagehide", onMove, { once: true });
    const by = behind - here;
    returnBy(() => w.history.go(by));
    w.setTimeout(() => {
      w.removeEventListener("popstate", onMove);
      w.removeEventListener("pagehide", onMove);
      if (moved) return;
      noteNav("back");
      router.push(floor);
    }, BACK_FALLBACK_MS);
    return true;
  }

  // The browser cannot say how far back that page is. It is opened as the
  // page behind would return, and put where the reader left it.
  noteNav("back");
  noteReturn(way.down);
  router.push(way.came, { scroll: false });
  return true;
}

/** Test seam. */
export function resetReaderWayForTests(): void {
  ways.clear();
  lastAddress = null;
  lastTap = null;
}
