/**
 * A tapped notification opens the screen it is about.
 *
 * In the phone apps it used to be `window.location.assign(url)`, and inside
 * the shells that never reaches the page. Capacitor answers any address with
 * no file extension with the ROOT index.html, on both platforms (the history
 * is in components/auth/OAuthButtons.tsx: it is what Apple rejected 1.0
 * build 12 for). So a reader who tapped "Morning prayers", or "someone
 * replied to your post", was handed the front door: Today, under the address
 * of the screen they had asked for. Seen on 2026-10-05 on the 1.5.2 export
 * served the way the shells serve it: a hard load of /bible/john/1/ drew
 * Today and left the address as it was.
 *
 * The only way to an inner screen in the apps is the router, so the tap is
 * handed to it. The router belongs to React; this module is what stands
 * between it and lib/push/native.ts, which is not a component:
 *
 *   - components/native/NativeBridge.tsx gives its opener here once the app
 *     is up, and takes it away when it goes.
 *   - A tap that arrives before that (a notification that launched the app)
 *     waits for the opener. If none comes, the old hard navigation is still
 *     better than nothing: the app comes up as the front door, and
 *     lib/nav/entry.ts asks the router for the screen the address names.
 *
 * No imports, so it can be tested without the app around it.
 */

/** How long a tap waits for the app before falling back to a hard load. */
export const OPENER_WAIT_MS = 6000;

let opener: ((url: string) => void) | null = null;
let waiting: { url: string; timer: ReturnType<typeof setTimeout> } | null = null;

/**
 * True for an address inside the app: one leading slash. Two would be another
 * site ("//example.org/..."), and a notification never gets to choose that.
 */
export function isAppAddress(url: unknown): url is string {
  return typeof url === "string" && url.startsWith("/") && !url.startsWith("//") && !url.startsWith("/\\");
}

/** The shell's own last resort. Kept apart so a test can watch it. */
function hardLoad(url: string): void {
  if (typeof window !== "undefined") window.location.assign(url);
}

/** Hand over (or take away) the way into the app. A waiting tap goes at once. */
export function setPushOpener(open: ((url: string) => void) | null): void {
  opener = open;
  if (open && waiting) {
    const { url, timer } = waiting;
    clearTimeout(timer);
    waiting = null;
    open(url);
  }
}

/** Open what a tapped notification points at. Anything that is not ours is dropped. */
export function openFromPush(url: unknown): void {
  if (!isAppAddress(url)) return;
  if (opener) {
    opener(url);
    return;
  }
  if (waiting) clearTimeout(waiting.timer);
  const timer = setTimeout(() => {
    waiting = null;
    hardLoad(url);
  }, OPENER_WAIT_MS);
  waiting = { url, timer };
}

/**
 * Whether opening `to` from `from` only changes the # on the same screen.
 * The router does that with pushState, which fires no `hashchange`, so a page
 * that listens for one (Community, for #post-… and #@handle) would never
 * hear it. The caller says it for the router.
 */
export function onlyTheHashChanges(from: { pathname: string }, to: { pathname: string; hash: string }): boolean {
  const trim = (p: string) => (p !== "/" ? p.replace(/\/+$/, "") : "/");
  return Boolean(to.hash) && trim(from.pathname) === trim(to.pathname);
}

/** Test seam. */
export function resetPushOpenForTests(): void {
  if (waiting) clearTimeout(waiting.timer);
  waiting = null;
  opener = null;
}
