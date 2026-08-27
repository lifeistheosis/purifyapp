/**
 * Which native routes get a back button, and which must not.
 *
 * The rule lives here rather than in components/nav/NativeBackBar.tsx because
 * vitest.config.ts collects `lib/**` only, and this is the fragile half: a
 * hand-written list of routes that must stay in step with a tree of ninety-nine
 * pages. A rule guarded by nothing is a rule that rots. See
 * lib/nav/__tests__/backBar.test.ts, which walks the real app directory.
 *
 * Two kinds of screen must NOT get the bar.
 *
 * The seven TAB ROOTS, because "back" from a tab root is meaningless: the tab
 * bar is already the way between them, and a chevron there invites the reader
 * to unwind out of the app.
 *
 * The routes that already show their OWN MobileTopBar, or the reader gets two
 * headers stacked. Ten routes today: five pages that mount it directly, and
 * the five account routes that inherit it from account/(signed)/layout.tsx.
 * That second group is why the test walks layout chains instead of reading
 * page files. Nothing in /account/profile's own page says it has a header.
 */

/**
 * Tab roots, from components/nav/MobileTabBar.tsx.
 *
 * /account is NOT one any more. The You tab was retired and the account now
 * hangs off the Discover library as Settings, so it is an ordinary inner
 * destination and MUST get a back button: it is reached by tapping into it,
 * and without one the reader is exactly as stranded as the report described.
 * Note that YouMobile's own MobileHeader is not a substitute. It is not
 * sticky and carries no chevron, unlike MobileTopBar, which is why only
 * MobileTopBar routes are excluded below.
 */
const TAB_ROOTS = new Set([
  "/",
  "/bible",
  "/discover",
  "/prayers",
  "/shop",
  "/community",
]);

/**
 * Routes that already show a MobileTopBar and so bring their own chevron.
 * Kept in step with the tree by lib/nav/__tests__/backBar.test.ts.
 */
export const OWN_HEADER_PATTERNS: RegExp[] = [
  /^\/bible\/[^/]+\/[^/]+$/, // bible/[book]/[chapter]
  /^\/saints\/[^/]+\/[^/]+$/, // saints/[slug]/[work]
  /^\/privacy$/,
  /^\/terms$/,
  /^\/settings$/,
  // The (signed) account group: the bar comes from the LAYOUT, not the pages,
  // which is why it cannot be spotted by reading page files. Its siblings
  // /account/developer and /account/export are outside the group and do need
  // a bar, so this cannot be widened to /account/*.
  /^\/account\/(data|eikon-box|profile|security|sessions)$/,
];

/**
 * How long to wait for the history traversal before giving up on it.
 *
 * This is a DEADLINE, not a delay: nothing waits on it in the normal case,
 * because the fallback is cancelled the instant popstate arrives. It is only
 * spent when the reader really was at the bottom of the stack, where the
 * alternative is a chevron that does nothing at all.
 *
 * Generous on purpose. A short deadline loses a race it must not lose: a
 * traversal delayed past it by a busy main thread would send the reader to
 * Today just as the page they asked for was arriving. Being slow in the rare
 * case is survivable; being wrong in the common one is not.
 */
export const BACK_FALLBACK_MS = 400;

/**
 * Where the back control should land, given whether the history stack moved.
 *
 * THE OBVIOUS CHECK IS WRONG, so this exists to stop it coming back.
 * `window.history.length > 1` looks like it answers "is there something behind
 * us", and it does not: it is the SIZE of the stack, never the POSITION in it,
 * and it never shrinks. Cold-start onto a deep-linked saint (length 1), tap
 * through to a writing (length 2), press back once (still 2, now at the
 * bottom), press back again: the length check passes, history.back() is a
 * no-op at index 0 of a Capacitor WebView, and the reader is left tapping a
 * dead chevron. That is precisely the complaint this bar was built to answer.
 *
 * So the caller does not predict, it observes: it listens for popstate, which
 * a same-document traversal always fires and a no-op at the bottom never does.
 *
 * Safe on the web by construction: NativeBackBar renders under NativeOnly, so
 * "home" can only ever mean Today inside the shell, never a navigation away
 * from someone's browser history.
 */
export function backOutcome(moved: boolean): "stay" | "home" {
  return moved ? "stay" : "home";
}

/**
 * True when NativeBackBar should render on this path.
 *
 * Also called by components/shop/ShopSubTabs.tsx, which has to pin itself
 * below the bar on exactly the routes that have one. Sharing the predicate is
 * what keeps the two from disagreeing about which routes those are.
 */
export function shouldShowBack(pathname: string): boolean {
  if (!pathname) return false;
  // Trailing slashes would otherwise make "/bible/" miss the tab-root check
  // and gain a chevron the real "/bible" does not have.
  const path = pathname !== "/" ? pathname.replace(/\/+$/, "") : "/";
  if (TAB_ROOTS.has(path)) return false;
  if (OWN_HEADER_PATTERNS.some((re) => re.test(path))) return false;
  return true;
}
