/**
 * The address a tap is opening, before the router has written it (1.9,
 * Gate 2.0's jumps as pages arrive).
 *
 * Next writes a new address to the window as the page arriving commits (its
 * history update is an insertion effect), after that page has rendered. A
 * page that reads its place from the address as it renders read the address
 * of the page being left. A council's canons opened at Canon I
 * (`#s2`) read no place there, so they opened on their first chapter with
 * the book's cover over it (components/reading/OpeningCover.tsx); then the
 * address came, the chapter was the one asked for, the cover was no longer
 * over the chapter the book opened on, and it went: the page jumped up by
 * the cover, 270px, five ways in (docs/1.9-build/notes/gate-2/run-tip.md).
 *
 * So the tap that opens a page says where it goes (components/nav/
 * RouteTransition.tsx, on every tap, before anything the tap does), and a
 * page asks `hashFor` with its own path: the window's hash once the address
 * is that page's, the tapped address's while it is still on its way, and
 * none when nothing said (a page opened by a script, which reads its place
 * once the address is written, as before).
 */

let tapped: { path: string; hash: string } | null = null;

/** One path, whatever the export's trailing slash or the encoding says. */
function samePath(a: string, b: string): boolean {
  const norm = (p: string) => {
    let d = p;
    try {
      d = decodeURI(p);
    } catch {
      // A path that is not well formed is compared as it is.
    }
    return d.replace(/\/+$/, "") || "/";
  };
  return norm(a) === norm(b);
}

/** A tap on a link: the address it opens, if it stays in the app. */
export function noteOpening(href: string): void {
  if (typeof window === "undefined") return;
  let url: URL;
  try {
    url = new URL(href, window.location.href);
  } catch {
    return;
  }
  tapped = url.origin === window.location.origin ? { path: url.pathname, hash: url.hash } : null;
}

/** The new address is written (the route change has committed): the window says it now. */
export function openingWritten(): void {
  tapped = null;
}

/**
 * The hash of the address of the page at `pathname`: the window's once the
 * address is that page's; while it is still on its way, the one the tap
 * that opened it named; else none.
 */
export function hashFor(pathname: string): string {
  if (typeof window === "undefined") return "";
  if (!pathname || samePath(window.location.pathname, pathname)) return window.location.hash;
  return tapped && samePath(tapped.path, pathname) ? tapped.hash : "";
}
