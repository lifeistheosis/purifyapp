"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { goBack } from "@/lib/nav/goBack";
import { ChevronLeft } from "@/components/ui/icons/ChevronLeft";
import { SearchTrigger } from "@/components/search/SearchTrigger";
import { SiteMenuButton } from "@/components/nav/SiteMenuButton";
import { WebOnly } from "@/components/platform/PlatformGate";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * Compact 48px header for mobile-only surfaces (the Bible reader, a saint's
 * work, settings, the account pages, privacy, terms). Mounted per-page rather
 * than globally, so routes that want a true hero (Today) can omit it.
 *
 * On a phone it is the page's ONLY bar, in the app and on the web alike: the
 * web header steps aside wherever one is mounted (globals.css, "One bar on a
 * phone"), and on the web the header's menu moves in here (SiteMenuButton).
 *
 * - `title` sits beside the back chevron, left-aligned: the trailing cluster
 *   is wider than the leading one, so a centred title sat visibly off the
 *   screen's centre, and the left edge gives a long name the most room.
 * - `titleTail` follows the title and is never truncated: "1 Thessalonians"
 *   may lose letters on a narrow phone, the chapter number may not.
 * - `subtitle` is a second line under the title (the reader's "v 11 of 42").
 * - `back` shows a chevron and either goes back (with a floor, lib/nav/
 *   goBack.ts: `backFallback`, or Today) or routes to the given href.
 * - `trailing` is a slot for the page's own actions.
 * - `revealTitleOn` (1.7, a saint's page): the id of the page's own h1. The
 *   bar's title is then a quiet copy that arrives once that heading has gone
 *   up under the bar, the slim bar of the owner's note 19 (the iOS artist
 *   page he pointed at), and not a second h1.
 * - `overlay` (1.7): on a phone the bar starts clear over the page's picture,
 *   its buttons on round plates, and turns solid with the name as above
 *   (globals.css, "A page bar over a picture"). The page pulls its picture up
 *   under the bar with `.under-topbar`. Never on a tablet: the iPad keeps a
 *   solid bar.
 * - `center` (1.8, the saint web): a control in the middle of the bar in
 *   place of the title, the Web / Timeline switch the owner asked for ("I
 *   want that to just be a button"). The page then names itself with its own
 *   h1, and `title` is not shown.
 * - `plates` (1.8, the Bible reader, the owner's pick B of round 2, "The
 *   page"): no bar at all. The way back and the page's own buttons stand on
 *   round plates over the page, clear of the status bar, whose strip stays
 *   covered so the words never run under the clock. The page names itself
 *   with its own h1, so the bar draws no title, and search is one of the
 *   page's own buttons there. The plates step away while the reader reads
 *   on and come back on a scroll up, with the page's pill (lib/ui/
 *   scrollAway.ts, globals.css "The page: the Bible reader with no bar").
 *
 * No Support link rides in a phone bar (the owner, 2026-10-16: it "does
 * nothing useful there"). Giving is a row in Settings, and the computer's
 * header keeps its link.
 *
 * Hidden on `md+`, desktop keeps the AppNav.
 */
export function MobileTopBar({
  title,
  titleKey,
  titleTail,
  subtitle,
  back,
  backFallback,
  trailing,
  revealTitleOn,
  overlay = false,
  center,
  plates = false,
}: {
  title?: string;
  /** Catalog key resolved client-side; wins over title. */
  titleKey?: string;
  titleTail?: string;
  subtitle?: React.ReactNode;
  back?: true | string;
  /** Where `back` goes when there is nothing of the app behind the page. Today unless given. */
  backFallback?: string;
  trailing?: React.ReactNode;
  /** The id of the page's own h1; the bar's title shows once it has scrolled away. */
  revealTitleOn?: string;
  /** Start clear over the page's picture, on a phone. Needs `revealTitleOn`. */
  overlay?: boolean;
  /** A control in the middle of the bar, in place of the title. */
  center?: React.ReactNode;
  /** No bar: the way back and the page's buttons on round plates over the page. */
  plates?: boolean;
}) {
  const router = useRouter();
  const { t } = useTranslate();
  const barRef = useRef<HTMLDivElement>(null);
  const resolvedTitle = titleKey ? t(titleKey) : title;
  const fullTitle = titleTail ? `${resolvedTitle} ${titleTail}` : resolvedTitle;
  // The space travels with the tail, so the heading's text (and what a screen
  // reader says) is "Luke 10", not "Luke10".
  const tailText = titleTail ? ` ${titleTail}` : null;

  // The title arrives when the page's heading has gone up under the bar. One
  // observer, which only speaks when the heading crosses the bar's foot, and
  // an attribute on the bar: no React state and no work while scrolling.
  // Looked up again on a new address, whose page has a heading of its own.
  const pathname = usePathname();
  useEffect(() => {
    const bar = barRef.current;
    if (!revealTitleOn || !bar) return;
    const heading = document.getElementById(revealTitleOn);
    if (!heading || typeof IntersectionObserver === "undefined") {
      // Nothing to wait for: the bar keeps its title, solid.
      bar.setAttribute("data-revealed", "");
      return;
    }
    // Where the page is now (a page come back to may be scrolled), before
    // the observer's first word arrives a frame later.
    if (heading.getBoundingClientRect().bottom <= bar.offsetHeight + 1) bar.setAttribute("data-revealed", "");
    else bar.removeAttribute("data-revealed");
    const io = new IntersectionObserver(
      ([entry]) => {
        const top = entry.rootBounds?.top ?? 0;
        const gone = !entry.isIntersecting && entry.boundingClientRect.bottom <= top + 1;
        if (gone) bar.setAttribute("data-revealed", "");
        else bar.removeAttribute("data-revealed");
      },
      { rootMargin: `-${Math.round(bar.offsetHeight)}px 0px 0px 0px`, threshold: 0 },
    );
    io.observe(heading);
    return () => io.disconnect();
  }, [revealTitleOn, pathname]);

  const backClass =
    "h-10 w-10 inline-flex shrink-0 items-center justify-center rounded-pill text-paper/80 transition-colors hover:text-paper focus-visible:outline-2 focus-visible:outline-paper focus-visible:outline-offset-2";

  const backControl = back ? (
    back === true ? (
      <button
        type="button"
        aria-label={t("nav.back")}
        onClick={() => goBack(router, backFallback ?? "/")}
        className={backClass}
      >
        <ChevronLeft size={20} className="rtl:-scale-x-100" />
      </button>
    ) : (
      <Link href={back} aria-label={t("nav.back")} className={backClass}>
        <ChevronLeft size={20} className="rtl:-scale-x-100" />
      </Link>
    )
  ) : null;

  if (plates) {
    // No bar: the plates stand in a row of the bar's height under the status
    // bar, and the row lets every tap between them through to the page. The
    // plates' look, the strip over the status bar and the stepping away are
    // in globals.css, keyed on data-plates.
    return (
      <div
        // Still the marker globals.css looks for: on a phone's browser the
        // website's header steps aside for it, and focus mode puts it away.
        data-mobile-topbar
        data-plates
        className="md:hidden native-md-flex pointer-events-none fixed inset-x-0 top-0 z-30 flex flex-col"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div data-plates-row className="flex h-[52px] items-center justify-between gap-2 px-3">
          {backControl ?? <span aria-hidden />}
          <div className="flex items-center gap-2">
            {trailing}
            <WebOnly>
              <SiteMenuButton />
            </WebOnly>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={barRef}
      // The marker globals.css looks for to give a phone this bar alone.
      data-mobile-topbar
      data-overlay={overlay && revealTitleOn ? "" : undefined}
      className={cn(
        "md:hidden native-md-flex sticky top-0 z-30",
        // `topbar-safe` (globals.css) pads the bar below the iOS notch on the
        // WEB (viewport-fit=cover puts content under it); the native shell has
        // its own inset handling, so the rule is scoped to non-native.
        "topbar-safe h-12 px-2 flex items-center gap-1",
        // 95%: the reader's second line sits where the verses scroll under
        // the bar, and at 92% their text ghosted through behind it.
        "bg-night/95 backdrop-blur border-b border-white/8",
      )}
    >
      {backControl}
      <div className={cn("min-w-0 flex-1 flex flex-col justify-center", !back && "pl-3")}>
        {center ? (
          <div className="flex min-w-0 justify-center">{center}</div>
        ) : revealTitleOn ? (
          // The page's own h1 names it; this is the slim bar's copy, for the eye.
          <p
            aria-hidden
            data-topbar-title
            data-reveal
            className="flex min-w-0 items-baseline font-sans text-ui font-semibold leading-tight tracking-[-0.005em] text-paper"
          >
            <span className="truncate">{resolvedTitle}</span>
            {tailText ? <span className="shrink-0 whitespace-pre">{tailText}</span> : null}
          </p>
        ) : (
          <h1
            className="flex min-w-0 items-baseline font-sans text-ui font-semibold leading-tight tracking-[-0.005em] text-paper"
            title={fullTitle}
          >
            <span className="truncate">{resolvedTitle}</span>
            {tailText ? <span className="shrink-0 whitespace-pre">{tailText}</span> : null}
          </h1>
        )}
        {subtitle}
      </div>
      {/* Search sits in every mobile bar, beside whatever else the page asked
          for. It is not part of the `trailing` fallback chain on purpose: a
          page that passes its own trailing action (a translation switcher,
          say) must not thereby lose the only way a phone has to open the
          palette. The menu closes the row on the web. */}
      <div className="flex shrink-0 items-center gap-0.5">
        <SearchTrigger />
        {trailing}
        <WebOnly>
          <SiteMenuButton />
        </WebOnly>
      </div>
    </div>
  );
}
