"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { TOP_ICON, TOP_PLATE } from "@/components/nav/topPlate";
import { goBack } from "@/lib/nav/goBack";
import { ChevronLeft } from "@/components/ui/icons/ChevronLeft";
import { Search } from "@/components/ui/icons/Search";
import { SearchTrigger } from "@/components/search/SearchTrigger";
import { openSearch } from "@/lib/search/open";
import { haptic } from "@/lib/ui/motion";
import { SiteMenuButton } from "@/components/nav/SiteMenuButton";
import { WebOnly } from "@/components/platform/PlatformGate";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import type { LocaleCode } from "@/lib/i18n/locales";
import { textDir } from "@/lib/i18n/textDir";

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
 *   its buttons on round plates (each with a fine edge, so it reads on a dark
 *   icon), and turns solid once the head's first words reach it, `solidFrom`
 *   or the name (build 90 note 3; globals.css, "A page bar over a picture").
 *   Its title still arrives with the name, as above. The page pulls its
 *   picture up under the bar with `.under-topbar`. Never on a tablet: the
 *   iPad keeps a solid bar.
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
 * - `searchPlace` (1.8, round 3 r3-13): the bar's search opens turned to
 *   this place (lib/search/open.ts), as Theology's screens ask it to.
 *
 * No Support link rides in a phone bar (the owner, 2026-10-16: it "does
 * nothing useful there"). Giving is a row in Settings, and the computer's
 * header keeps its link.
 *
 * Hidden on `md+`, desktop keeps the AppNav.
 */
export function MobileTopBar({
  title,
  titles,
  titleKey,
  titleTail,
  subtitle,
  back,
  backFallback,
  trailing,
  revealTitleOn,
  solidFrom,
  overlay = false,
  center,
  plates = false,
  searchPlace,
}: {
  title?: string;
  /**
   * The title in the other languages the page has it in (a lesson's name in
   * German), shown for a reader in that language; `title` for the rest. In
   * the apps a page's title is written once, in English, so this is chosen on
   * the device (1.9, the German lessons in the apps; components/i18n/useInReadersLanguage.ts).
   */
  titles?: Partial<Record<LocaleCode, string>>;
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
  /**
   * With `overlay`: the id of the head's first words, the ones nearest the
   * bar (a council's ordinal line, a doctrine's quoted line). The bar turns
   * solid as soon as they reach it. Leave it out when the name is the first
   * of the head's words.
   */
  solidFrom?: string;
  /** Start clear over the page's picture, on a phone. Needs `revealTitleOn`. */
  overlay?: boolean;
  /** A control in the middle of the bar, in place of the title. */
  center?: React.ReactNode;
  /** No bar: the way back and the page's buttons on round plates over the page. */
  plates?: boolean;
  /** The place the bar's search opens turned to (lib/search/open.ts). */
  searchPlace?: string;
}) {
  const router = useRouter();
  const { t, locale } = useTranslate();
  const barRef = useRef<HTMLDivElement>(null);
  const resolvedTitle = titleKey ? t(titleKey) : (titles?.[locale] ?? title);
  // A title from the catalog, or in the reader's own language, is the reader's; one handed in as text
  // is a work's, a saint's or a council's name, which is English (build 90 note 4).
  const titleLang = titleKey || titles?.[locale] ? undefined : "en";
  const fullTitle = titleTail ? `${resolvedTitle} ${titleTail}` : resolvedTitle;
  // The space travels with the tail, so the heading's text (and what a screen
  // reader says) is "Luke 10", not "Luke10".
  const tailText = titleTail ? ` ${titleTail}` : null;

  // The title arrives when the page's heading has gone up under the bar. One
  // observer, which only speaks when the heading crosses the bar's foot, and
  // an attribute on the bar: no React state and no work while scrolling.
  // Looked up again on a new address, whose page has a heading of its own.
  //
  // A bar over a picture (`overlay`) keeps two marks (build 90 note 3). Its
  // ground turns solid (data-solid) as soon as the head's first words reach
  // its foot: `solidFrom`, or the name itself when the page gives none. The
  // name in the bar (data-revealed) still waits for the page's name to have
  // gone, so no second name shows early. Before, the ground waited for the
  // name too, and the words above it (a council's ordinal line, a doctrine's
  // quoted line) and then the name passed under the clear bar, under the way
  // back's plate, before it turned.
  const pathname = usePathname();
  useEffect(() => {
    const bar = barRef.current;
    if (!revealTitleOn || !bar) return;
    const heading = document.getElementById(revealTitleOn);
    const clear = overlay;
    const first = clear ? (solidFrom ? document.getElementById(solidFrom) : null) ?? heading : null;
    const mark = (name: string, on: boolean) => (on ? bar.setAttribute(name, "") : bar.removeAttribute(name));
    if (!heading || typeof IntersectionObserver === "undefined") {
      // Nothing to wait for: the bar keeps its title, solid.
      mark("data-revealed", true);
      mark("data-solid", true);
      return;
    }
    const foot = () => bar.offsetHeight;
    // Where the page is now (a page come back to may be scrolled), before
    // the observers' first word arrives a frame later.
    let gone = heading.getBoundingClientRect().bottom <= foot() + 1;
    let reached = first ? first.getBoundingClientRect().top < foot() : true;
    mark("data-revealed", gone);
    mark("data-solid", gone || reached);
    const margin = { rootMargin: `-${Math.round(foot())}px 0px 0px 0px` };
    const io = new IntersectionObserver(
      ([entry]) => {
        const top = entry.rootBounds?.top ?? 0;
        gone = !entry.isIntersecting && entry.boundingClientRect.bottom <= top + 1;
        mark("data-revealed", gone);
        mark("data-solid", gone || reached);
      },
      { ...margin, threshold: 0 },
    );
    io.observe(heading);
    // The first words: wholly below the bar's foot, the bar stays clear; any
    // of them under it, solid. Asked again at each quarter of the line, so a
    // line that slips under by a fraction of a pixel (a Theology path's
    // kicker, at 50.8px under a 51px bar) is caught as it goes on.
    const firstIo = first
      ? new IntersectionObserver(
          ([entry]) => {
            const top = entry.rootBounds?.top ?? 0;
            reached = entry.boundingClientRect.top < top;
            mark("data-solid", gone || reached);
          },
          { ...margin, threshold: [0, 0.25, 0.5, 0.75, 1] },
        )
      : null;
    if (first && firstIo) firstIo.observe(first);
    return () => {
      io.disconnect();
      firstIo?.disconnect();
    };
  }, [revealTitleOn, solidFrom, overlay, pathname]);

  const backClass = `${TOP_PLATE} text-paper/80 transition-colors hover:text-paper focus-visible:outline-2 focus-visible:outline-paper focus-visible:outline-offset-2`;

  const backControl = back ? (
    back === true ? (
      <button
        type="button"
        aria-label={t("nav.back")}
        onClick={() => goBack(router, backFallback ?? "/")}
        className={backClass}
      >
        <ChevronLeft {...TOP_ICON} className="rtl:-scale-x-100" />
      </button>
    ) : (
      <Link href={back} aria-label={t("nav.back")} className={backClass}>
        <ChevronLeft {...TOP_ICON} className="rtl:-scale-x-100" />
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
        {/* The row, not the bar around it, stands at the top of the screen
            (lib/ui/readingPlace.ts): it steps away while the reader reads
            on, and the strip over the status bar stays. */}
        {/* Its height is --plates-row-h (globals.css): the reading line along
            the status bar, then the plates with an even gap above and below,
            on the page's own margin at both sides (build 89 note 15). */}
        <div data-plates-row data-screen-edge="top" className="flex h-[var(--plates-row-h)] items-center justify-between gap-2 px-5 pt-[2px]">
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
      // What stands at the top of the screen (lib/ui/readingPlace.ts).
      data-screen-edge="top"
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
            <span lang={titleLang} dir={textDir(titleLang)} className="truncate">
              {resolvedTitle}
            </span>
            {tailText ? <span className="shrink-0 whitespace-pre">{tailText}</span> : null}
          </p>
        ) : (
          <h1
            className="flex min-w-0 items-baseline font-sans text-ui font-semibold leading-tight tracking-[-0.005em] text-paper"
            title={fullTitle}
          >
            <span lang={titleLang} dir={textDir(titleLang)} className="truncate">
              {resolvedTitle}
            </span>
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
        {searchPlace ? (
          <button
            type="button"
            onClick={() => {
              haptic("light");
              openSearch(searchPlace);
            }}
            aria-label={t("search.open")}
            title={t("search.open")}
            data-search-place={searchPlace}
            className="h-11 w-11 inline-flex shrink-0 items-center justify-center rounded-pill text-paper/70 transition-colors hover:text-paper focus-visible:outline-2 focus-visible:outline-paper focus-visible:outline-offset-2"
          >
            <Search size={20} aria-hidden />
          </button>
        ) : (
          <SearchTrigger />
        )}
        {trailing}
        <WebOnly>
          <SiteMenuButton />
        </WebOnly>
      </div>
    </div>
  );
}
