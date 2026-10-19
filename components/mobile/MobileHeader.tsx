"use client";

import { useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { fitTitle, TITLE_MAX_PX } from "@/lib/ui/titleFit";
import { MobilePremiumButton } from "@/components/nav/MobilePremiumButton";
import { NotificationsButton } from "@/components/nav/NotificationsButton";
import { SearchTrigger } from "@/components/search/SearchTrigger";
import { StreakCounter } from "@/components/streak/StreakCounter";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * The phone's tab bar: one bar, drawn the same on all five tabs (Today,
 * Bible, Discover, Prayers, You) and on Reading.
 *
 * The owner, 2026-10-16: the five tabs each drew the top right differently
 * ("Same design on all"), Support did nothing useful there, the Premium pill
 * sat on the left on Today and on the right elsewhere, and its star was a
 * vibe-coded symbol. So: the tab's name on the left, and on the right, in
 * this order on every tab, the Premium pill, search and the bell. Nothing
 * else rides in the bar, so what is right of the title is the same width on
 * every tab and the pill never moves between them. Support stays a row in
 * Settings and the computer's header keeps its link.
 *
 * The streak rides beside the pill since 1.7.1, the owner, 2026-10-17: "can
 * you put the streak at the top, like right next to plus? Just added like a
 * fireball and a counter." The flame and the count (StreakCounter) follow
 * the pill, so the pill keeps the first place on the right, and the flame is
 * the same on every tab, so nothing moves between them. It costs the name
 * about 40px, so a name too long for what is left steps down in size until
 * it fits (lib/ui/titleFit.ts) rather than being cut.
 *
 * The title is the screen's one h1, set in Lora by the global heading rule.
 * In the apps the bar stays at the top while the page scrolls under it, and
 * clears the status bar itself (`.tab-topbar` in globals.css, beside
 * `.topbar-safe`, cancels the page's own inset so nothing pads twice). On a
 * phone's browser it scrolls away under the website's header. `sticky={false}`
 * is for Reading, which sits under the apps' back bar, already pinned there.
 *
 * Solid `bg-night`, not a translucent blur: the Android WebView bleeds
 * imagery through backdrop-filter and drops frames while scrolling.
 */
export function MobileHeader({
  title,
  titleKey,
  sticky = true,
}: {
  title?: string;
  /** Catalog key resolved client-side; wins over title. */
  titleKey?: string;
  sticky?: boolean;
}) {
  const { t } = useTranslate();
  const resolvedTitle = titleKey ? t(titleKey) : title;
  // Typed by `as`: the one-bar test reads every <Capitalised token here as a
  // drawn component, a type argument included.
  const nameRef = useRef(null as HTMLHeadingElement | null);

  // The name is measured at the bar's own size, then drawn as large as the
  // room left for it allows (lib/ui/titleFit.ts): again whenever that room
  // changes (the streak arriving, a phone turned) or a font lands. Before the
  // paint, so a screen opened from the tab bar never shows the name cut first.
  useLayoutEffect(() => {
    const h1 = nameRef.current;
    if (!h1) return;
    let room = -1;
    const fit = () => {
      h1.style.fontSize = "";
      const full = parseFloat(getComputedStyle(h1).fontSize) || TITLE_MAX_PX;
      const size = fitTitle(h1.scrollWidth, h1.clientWidth, full);
      if (size < full) h1.style.fontSize = `${size}px`;
    };
    fit();
    const watch = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      if (Math.abs(width - room) < 0.5) return;
      room = width;
      fit();
    });
    watch.observe(h1);
    const fonts = typeof document !== "undefined" ? document.fonts : undefined;
    fonts?.addEventListener?.("loadingdone", fit);
    return () => {
      watch.disconnect();
      fonts?.removeEventListener?.("loadingdone", fit);
    };
  }, [resolvedTitle]);

  return (
    <header
      data-tab-topbar=""
      className={cn("z-30 border-b border-paper/8 bg-night py-2", sticky && "tab-topbar")}
    >
      {/* The row lines up with the body below it, the same column on a
          tablet. The end padding is short by the bell's own margin, so the
          bell's line ends where the body's text does, its 44px touch box
          reaching into the gutter. */}
      <div className="flex h-11 items-center gap-2 ps-5 pe-[9px] md:mx-auto md:w-full md:max-w-[760px] lg:max-w-[880px]">
        {/* `title-in` lifts the title a few px as the screen arrives. Transform
            only: the opacity is already owned by `.route-fade` above it. */}
        <h1 ref={nameRef} className="title-in min-w-0 flex-1 truncate text-lede leading-tight tracking-[-0.01em] text-paper">
          {resolvedTitle}
        </h1>
        <div className="flex shrink-0 items-center">
          <span className="me-0.5 inline-flex">
            <MobilePremiumButton />
          </span>
          <StreakCounter />
          <SearchTrigger iconSize={24} className="text-paper/80" />
          <NotificationsButton />
        </div>
      </div>
    </header>
  );
}
