"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { Lampada } from "@/components/ui/icons/Lampada";
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
 * - `back` shows a chevron and either pops the router stack or routes to the
 *   given href.
 * - `trailing` is a slot for the page's own actions.
 * - `donate` renders a gold vigil-lamp link to /support in the trailing slot
 *   when no explicit `trailing` is given: the mobile parallel to the desktop
 *   nav's Support link.
 *
 * Hidden on `md+`, desktop keeps the AppNav.
 */
export function MobileTopBar({
  title,
  titleKey,
  titleTail,
  subtitle,
  back,
  trailing,
  donate,
}: {
  title?: string;
  /** Catalog key resolved client-side; wins over title. */
  titleKey?: string;
  titleTail?: string;
  subtitle?: React.ReactNode;
  back?: true | string;
  trailing?: React.ReactNode;
  donate?: boolean;
}) {
  const router = useRouter();
  const { t } = useTranslate();
  const resolvedTitle = titleKey ? t(titleKey) : title;
  const fullTitle = titleTail ? `${resolvedTitle} ${titleTail}` : resolvedTitle;
  // The space travels with the tail, so the heading's text (and what a screen
  // reader says) is "Luke 10", not "Luke10".
  const tailText = titleTail ? ` ${titleTail}` : null;

  const backClass =
    "h-10 w-10 inline-flex shrink-0 items-center justify-center rounded-pill text-paper/80 transition-colors hover:text-paper focus-visible:outline-2 focus-visible:outline-paper focus-visible:outline-offset-2";

  return (
    <div
      // The marker globals.css looks for to give a phone this bar alone.
      data-mobile-topbar
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
      {back ? (
        back === true ? (
          <button type="button" aria-label={t("nav.back")} onClick={() => router.back()} className={backClass}>
            <ChevronLeft size={20} />
          </button>
        ) : (
          <Link href={back} aria-label={t("nav.back")} className={backClass}>
            <ChevronLeft size={20} />
          </Link>
        )
      ) : null}
      <div className={cn("min-w-0 flex-1 flex flex-col justify-center", !back && "pl-3")}>
        <h1
          className="flex min-w-0 items-baseline font-sans text-ui font-semibold leading-tight tracking-[-0.005em] text-paper"
          title={fullTitle}
        >
          <span className="truncate">{resolvedTitle}</span>
          {tailText ? <span className="shrink-0 whitespace-pre">{tailText}</span> : null}
        </h1>
        {subtitle}
      </div>
      {/* Search sits in every mobile bar, beside whatever else the page asked
          for. It is not part of the `trailing` fallback chain on purpose: a
          page that passes its own trailing action (a translation switcher,
          say) must not thereby lose the only way a phone has to open the
          palette. The menu closes the row on the web. */}
      <div className="flex shrink-0 items-center gap-0.5">
        <SearchTrigger />
        {trailing ??
          (donate ? (
            <Link
              href="/support"
              aria-label={t("nav.supportPurify")}
              title={t("nav.supportPurify")}
              className="h-10 w-10 inline-flex items-center justify-center rounded-pill text-gold/80 hover:text-gold transition-colors"
            >
              <Lampada size={20} />
            </Link>
          ) : null)}
        <WebOnly>
          <SiteMenuButton />
        </WebOnly>
      </div>
    </div>
  );
}
