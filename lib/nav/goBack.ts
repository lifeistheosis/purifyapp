import { BACK_FALLBACK_MS, backOutcome } from "./backBar";

/**
 * One way back for both bars (1.7): the apps' back bar (NativeBackBar) and a
 * page's own top bar (MobileTopBar, `back` with no address). It was the back
 * bar's alone; the top bar's chevron called router.back() and nothing else,
 * so at the bottom of the history, where a cold start or a deep link to a
 * saint leaves the reader, it did nothing at all.
 *
 * Back, with a floor that holds. Where the browser can say there is nothing
 * of this site behind the page (the Navigation API's canGoBack: false at the
 * bottom of the stack, and on the website when the page behind is another
 * site's), the reader goes to the floor at once. Otherwise the router goes
 * back and the call LISTENS for it: a same-document traversal always fires
 * popstate and a no-op never does, so when nothing moved by the deadline the
 * reader goes to the floor (lib/nav/backBar.ts, backOutcome, says why the
 * obvious history.length test is wrong and must not come back).
 *
 * `floor` is where the page sits in the app: Today for the back bar, the
 * saints for a saint.
 */
export type BackRouter = { back: () => void; push: (href: string) => void };

type BackWindow = Pick<Window, "addEventListener" | "removeEventListener" | "setTimeout"> & {
  navigation?: { canGoBack?: boolean };
};

export function goBack(router: BackRouter, floor: string, win?: BackWindow): void {
  const w: BackWindow | undefined = win ?? (typeof window === "undefined" ? undefined : (window as unknown as BackWindow));
  if (!w) return;

  if (w.navigation && w.navigation.canGoBack === false) {
    router.push(floor);
    return;
  }

  // Armed BEFORE back(), or a traversal that lands in the same tick is
  // missed and the reader is sent to the floor as well.
  let moved = false;
  const onMove = () => {
    moved = true;
  };
  w.addEventListener("popstate", onMove, { once: true });
  // A page the browser leaves for another site's is not stranded either.
  w.addEventListener("pagehide", onMove, { once: true });

  router.back();

  w.setTimeout(() => {
    w.removeEventListener("popstate", onMove);
    w.removeEventListener("pagehide", onMove);
    if (backOutcome(moved) === "home") router.push(floor);
  }, BACK_FALLBACK_MS);
}
