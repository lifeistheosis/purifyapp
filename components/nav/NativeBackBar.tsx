"use client";

import { usePathname, useRouter } from "next/navigation";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { BACK_FALLBACK_MS, backOutcome, shouldShowBack } from "@/lib/nav/backBar";

/**
 * A way back, on every native screen that is not a tab root.
 *
 * ── Why this had to be global ───────────────────────────────────────────
 *
 * A reader in the app's own Community tab: "You should add a back button on
 * iOS so it makes navigation a bit easier. Whenever I click on a section, say
 * I want to go back, sometimes I have to go complete out of that section and
 * then click back to when I was."
 *
 * "Sometimes" undersold it. MobileTopBar carries a back chevron, but it is
 * mounted per route, and it renders on TEN of the ninety-nine routes under
 * app/(app): five pages that mount it directly, and the five account routes
 * that inherit it from account/(signed)/layout.tsx. The other eighty-nine had
 * no way back at all.
 *
 * On the web that is survivable because the browser has its own back. Inside
 * the native shell there is no browser chrome, and iOS has no hardware back
 * button, so a reader who tapped into a saint or a council was stranded and
 * had to leave through the tab bar and navigate down again. That is the
 * behaviour reported, and it is why this renders under NativeOnly.
 *
 * The rule for WHICH routes lives in lib/nav/backBar.ts, guarded by a test
 * that walks the real app tree. It is not here because vitest collects
 * `lib/**` only, and a hand-written list of ten routes against a tree of
 * ninety-nine is precisely the thing that must not go unguarded.
 *
 * ── No md: variant, deliberately ────────────────────────────────────────
 *
 * MobileTopBar is `md:hidden`, so on a wide viewport it disappears and AppNav
 * takes over. This bar has no such escape hatch and does not need one: the
 * native shell is phone-only in both stores (TARGETED_DEVICE_FAMILY = "1" in
 * project.pbxproj, android:screenOrientation="portrait" in the manifest), so
 * `md` is never reached inside it. If a tablet target is ever added, this and
 * the exclusions both need a responsive answer, because at `md` the bars this
 * defers to are not on screen at all and every exclusion becomes a dead spot.
 *
 * ── router.back(), with a floor that actually holds ─────────────────────
 *
 * At the bottom of the WebView's history stack, which is where a cold start or
 * a deep link leaves the reader, back() is a silent no-op. A dead chevron is
 * the complaint restated, not answered, so the bar has to notice and go
 * somewhere instead.
 *
 * It notices by LISTENING rather than predicting: a same-document traversal
 * always fires popstate, and a no-op at the bottom never does. See backOutcome
 * in lib/nav/backBar.ts for why the obvious `history.length > 1` test is wrong
 * and must not come back.
 */
export function NativeBackBar() {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { t } = useTranslate();

  if (!shouldShowBack(pathname)) return null;

  return (
    <div
      // topbar-safe is the existing machinery for exactly this position, and
      // it was written the hard way: inside the shell a `top-0` sticky bar
      // re-pins to the true viewport top on scroll and slides under the clock
      // and battery, so the class pads by the inset, grows its own height to
      // match, and cancels <main>'s .safe-pt with a negative margin so nothing
      // double-pads at rest. Reproducing that by hand here is how the bar ends
      // up half under the status bar again. See globals.css.
      className="topbar-safe sticky top-0 z-30 flex items-center border-b border-white/8 bg-night/92 px-1 backdrop-blur"
    >
      <button
        type="button"
        onClick={() => {
          if (typeof window === "undefined") return;

          // Arm the listener BEFORE calling back(), or a traversal that lands
          // in the same tick is missed and the reader gets thrown to Today.
          let moved = false;
          const onPop = () => {
            moved = true;
          };
          window.addEventListener("popstate", onPop, { once: true });

          router.back();

          window.setTimeout(() => {
            window.removeEventListener("popstate", onPop);
            if (backOutcome(moved) === "home") router.push("/");
          }, BACK_FALLBACK_MS);
        }}
        aria-label={t("nav.back")}
        className="tap-press inline-flex h-10 w-10 items-center justify-center rounded-pill text-paper/80 hover:text-paper"
      >
        <span aria-hidden className="text-lede leading-none">
          &lsaquo;
        </span>
      </button>
    </div>
  );
}
