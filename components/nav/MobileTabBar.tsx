"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { fitTabRow, TAB_LABEL_MAX_PX } from "@/lib/ui/tabLabelFit";
import { frameGlyph, type GlyphBox } from "@/lib/ui/tabGlyphFrame";
// Two library glyphs (Today's sun, You's head and shoulders) and three
// bespoke tab glyphs.
//
// Which glyph sits on which tab changed on the owner's word (2026-10-13):
// Prayers wears praying hands (tab/PrayingHands), and Discover wears the
// three-bar cross Prayers wore until then (tab/OrthodoxCross). The ladder
// Discover wore (tab/Klimax) is kept in the folder, as tab/Orans was.
//
// The tab set lives under icons/tab/ rather than replacing the library icons,
// because the two have different briefs. A library icon is read alone at
// whatever size its host gives it; a tab icon is read in a row at exactly
// 22px, where what matters is that it is optically the same weight as its
// neighbours and has a silhouette none of them share. Codex, Octogram,
// PrayerRope, Lampada and HaloedHead are all still in use elsewhere (Bible
// index, Discover, Reading, PrayersMobile, the calendar's fast-free glyph and
// the mobile headers' donate glyph) and are untouched by this.
//
// tab/Cart and the church went to Discover with Shop and Chat (2026-10-13):
// DiscoverMobile draws the cart on the Shop tile, so the shop keeps the glyph
// readers already know and the move reads as a move, not a disappearance.
// tab/Gear, which the You tab wore before it left the bar the first time, is
// not drawn anywhere now and is kept in the folder.
import { Sun } from "@/components/ui/icons/Sun";
import { User } from "@/components/ui/icons/User";
import { BookOpen } from "@/components/ui/icons/tab/BookOpen";
import { OrthodoxCross } from "@/components/ui/icons/tab/OrthodoxCross";
import { PrayingHands } from "@/components/ui/icons/tab/PrayingHands";
import { NotificationsBadge } from "@/components/community/NotificationsInbox";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { haptic } from "@/lib/ui/motion";
import { useOverlayOpen } from "@/lib/ui/overlay";
import { beginRouteExit } from "@/lib/ui/routeTransition";

/**
 * Persistent bottom tab bar on `< md` viewports. Hidden on desktop, which
 * keeps the existing AppNav.
 *
 * Five tabs, in the order the owner chose (2026-10-13):
 *   Today · Bible · Discover · Prayers · You
 *
 * It was six: Today · Bible · Discover · Prayers · Shop · Chat. Six were
 * tight at a phone's width, and in Greek the word for Discover was cut
 * short in its own cell. He was shown the bar both ways and said yes to
 * five. Shop and Chat are tiles on Discover now
 * (components/mobile/DiscoverMobile.tsx), and Discover's predicate below
 * took their routes, so the bar still lights a tab while a reader is in the
 * shop or in Chat. The unread dot went with Chat: it sits on Discover's
 * glyph here and on the Chat tile there.
 *
 * You is back. It had been the seventh tab and left when the bar was the
 * most crowded surface in the app; its screen then hung off Discover as a
 * Settings row. With Shop and Chat gone there is room, and it has its own
 * routes again.
 *
 * Active state is derived from `usePathname()`, with a small precedence
 * table so adjacent routes (e.g. /saints under Discover, /account under
 * You) light up the correct tab. `/prayers/today` used to be carved out of
 * Prayers and handed to Today, back when the in-app tiles pointed at it;
 * they no longer do, and it is a /prayers route, so it lights Prayers.
 *
 * There is deliberately NO sliding highlight behind the active tab. The
 * earlier version glided a rounded compartment between slots, which had two
 * problems. Visually, at seven tabs the cell computes to ~58x58px and a
 * 26px radius turned that compartment into a circle, so it read as a bubble
 * ballooning out of the bar rather than a compartment inside it. Mechanically
 * it animated `left`, which is not compositor-accelerated: the app's most
 * frequent interaction forced a layout every frame for 300ms, on the same
 * main thread that runs React. Removing it also retired the module-scoped
 * `lastActiveIndex` and the nested-rAF dance that existed only to keep that
 * compartment from jumping across the app/page.tsx <-> (app) remount boundary.
 *
 * The selected tab is still signalled three ways, only one of which is
 * colour: text colour, font weight, and icon stroke weight. That keeps the
 * state legible without relying on hue alone.
 */

type Tab = {
  key: string;
  label: string;
  href: string;
  Icon: typeof Sun;
  /**
   * Where this glyph's lines are in its 24-unit drawing, without their
   * thickness: x, y, width, height. MEASURED from the drawing, never judged
   * by eye, because it is what puts every glyph in the row at one size
   * (lib/ui/tabGlyphFrame.ts). Change a glyph's drawing and this changes
   * with it: section 25 of scripts/export-walk.mjs measures the built app
   * and fails when the two disagree.
   */
  box: GlyphBox;
  /** How thick its lines are, idle and lit. Most glyphs take TAB_LINES. */
  lines?: readonly [idle: number, lit: number];
  matches: (p: string) => boolean;
};

/**
 * How thick a glyph's lines are, in units of its drawing: idle, and lit.
 *
 * 1 and 2 are what the bar has always drawn, though only the 2 was meant.
 * Idle, it used to hand each glyph `strokeWidth={undefined}`, which took the
 * glyph's own 1.6 away and left the browser's default of 1. That is the bar
 * the owner has looked at and approved, so it is now said out loud and the
 * look is unchanged.
 */
const TAB_LINES = [1, 2] as const;

export function MobileTabBar() {
  const pathname = usePathname() ?? "/";
  const { t } = useTranslate();
  // Step aside while a modal sheet is open. This is not cosmetic: the bar was
  // eating taps and hiding text through the sheet.
  //
  // An `(app)` route is wrapped in `.route-fade`, whose animation is declared
  // `both`, so the opacity animation stays in effect forever and the wrapper is
  // a permanent stacking context. Every z-index inside it, including the
  // commentary sheet's z-[60], is therefore scoped to that wrapper and paints
  // BELOW this root-level z-50 bar. Raising the sheet's z-index cannot fix
  // that; only leaving the wrapper or removing the bar can.
  //
  // The visible consequence, reported twice from the Android beta by the same
  // reader (#android-forums, 2026-07-11 and 2026-08-01): the last lines of a
  // Father sat behind the bar, and any collapsed commentary header that
  // scrolled into the bar's 83px band could not be tapped open at all. A
  // bottom-padding bump in July moved the text but left the interception,
  // because padding cannot stop a bar that paints on top from taking the tap.
  //
  // Hiding the bar for the duration also makes the sheet a real modal: an
  // aria-modal dialog should not have live navigation sitting over it.
  const overlayOpen = useOverlayOpen();

  const TABS: Tab[] = [
    {
      key: "today",
      label: t("nav.today"),
      href: "/",
      Icon: Sun,
      box: [3.4, 3, 17.2, 12.5],
      matches: (p) => p === "/",
    },
    {
      key: "bible",
      label: t("nav.bible"),
      href: "/bible",
      Icon: BookOpen,
      box: [4.2, 4.41, 15.6, 15.49],
      // A walkthrough is Scripture read a chapter at a time, so it lights the
      // Bible tab (lib/walkthroughs).
      matches: (p) =>
        p === "/bible" || p.startsWith("/bible/") || p === "/walkthroughs" || p.startsWith("/walkthroughs/"),
    },
    {
      key: "discover",
      label: t("nav.discover"),
      href: "/discover",
      Icon: OrthodoxCross,
      box: [5.8, 3.2, 12.4, 17.2],
      matches: (p) =>
        p === "/discover" ||
        p.startsWith("/discover/") ||
        p === "/reading" ||
        p.startsWith("/reading/") ||
        p === "/saints" ||
        p.startsWith("/saints/") ||
        p === "/councils" ||
        p.startsWith("/councils/") ||
        p === "/topics" ||
        p.startsWith("/topics/") ||
        p === "/theology" ||
        p.startsWith("/theology/") ||
        p === "/apologetics" ||
        p.startsWith("/apologetics/") ||
        p === "/heresies" ||
        p.startsWith("/heresies/") ||
        p === "/calendar" ||
        p.startsWith("/calendar/") ||
        p === "/history" ||
        p.startsWith("/history/") ||
        p === "/kitchen" ||
        p.startsWith("/kitchen/") ||
        // Start here (1.6) hangs off Discover too.
        p === "/start" ||
        p.startsWith("/start/") ||
        // Find a parish (1.6) hangs off Discover, so the tab stays lit there.
        p === "/parishes" ||
        p.startsWith("/parishes/") ||
        // Shop and Chat are Discover tiles now (2026-10-13), and these were
        // their tabs' routes. Without them a reader in the shop or in Chat
        // would see no tab lit at all, which is what makes a tab bar feel
        // broken rather than merely shorter.
        p === "/shop" ||
        p.startsWith("/shop/") ||
        p === "/community" ||
        p.startsWith("/community/") ||
        p === "/campaigns" ||
        p.startsWith("/campaigns/"),
    },
    {
      key: "prayers",
      label: t("nav.prayers"),
      href: "/prayers",
      Icon: PrayingHands,
      box: [4.01, 2, 15.97, 19.54],
      // The hands have three times the lines of any other glyph in the same
      // room. Lit at 2 they close up into one white lump, so they are lit
      // at a weight that still tells the thumbs from the palms.
      lines: [0.95, 1.35],
      matches: (p) => p === "/prayers" || p.startsWith("/prayers/"),
    },
    {
      key: "you",
      label: t("nav.you"),
      // The reader's own screen: streak, saved, settings, the account.
      href: "/account",
      Icon: User,
      box: [4.5, 4.4, 15, 15.8],
      // Both spellings of each: the apps' addresses end in a slash. /settings
      // was written here without its second one, so Settings, the one screen
      // every row of this tab now leads to, lit no tab at all in the apps.
      matches: (p) =>
        p === "/account" ||
        p.startsWith("/account/") ||
        p === "/saved" ||
        p.startsWith("/saved/") ||
        p === "/settings" ||
        p.startsWith("/settings/"),
    },
  ];

  // One label size for the row, small enough that no two words next to each
  // other touch and neither end word leaves the bar, and for each label how
  // wide it may be drawn at that size (fitTabRow in lib/ui/tabLabelFit.ts,
  // which says why a word may be wider than its own cell). Re-measured when
  // the bar resizes (rotation, Split View, Stage Manager), when the webfont
  // lands, and when the labels change with the locale. The first paint is
  // the caption size held to the cell; the step, when there is one, is a
  // fraction of a pixel.
  const listRef = useRef<HTMLUListElement>(null);
  const labelsKey = TABS.map((tab) => tab.label).join("|");
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const labels = [...list.querySelectorAll<HTMLElement>("[data-tab-label]")];
      const cells = labels.map((label) => label.parentElement?.getBoundingClientRect() ?? null);
      const bar = list.parentElement?.getBoundingClientRect();
      if (labels.length < 2 || !bar || cells.some((c) => !c)) return;
      const lefts = cells.map((c) => c!.left);
      const words = document.createRange();
      const fit = fitTabRow({
        // Each word's own width, to a fraction of a pixel and whether or not
        // it is cut. This read scrollWidth and clientWidth, which are whole
        // numbers: a 65.7 px cell counted as 66, and the Greek for Discover,
        // 66.03 px wide at 11.5 px, "fitted" it and was drawn "Ανακαλύψ…".
        // Half a pixel is added for the same reason it is no longer rounded.
        naturals: labels.map((label) => {
          const current = parseFloat(getComputedStyle(label).fontSize) || TAB_LABEL_MAX_PX;
          words.selectNodeContents(label);
          const drawn = words.getBoundingClientRect().width || label.scrollWidth;
          return (drawn * TAB_LABEL_MAX_PX) / current + 0.5;
        }),
        cell: cells[0]!.width,
        // Absolute, so a right-to-left bar measures the same.
        pitch: Math.abs(lefts[1] - lefts[0]),
        // The bar's own padding beside its end cells, less a pixel for its border.
        edge: Math.min(Math.min(...lefts) - bar.left, bar.right - Math.max(...cells.map((c) => c!.right))) - 1,
      });
      list.style.setProperty("--tab-label-size", `${fit.size}px`);
      labels.forEach((label, i) => {
        label.style.maxWidth = fit.maxWidths[i] ? `${fit.maxWidths[i]}px` : "";
      });
    };
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(list);
    let live = true;
    document.fonts?.ready.then(() => live && measure()).catch(() => {});
    return () => {
      live = false;
      observer?.disconnect();
    };
  }, [labelsKey]);

  return (
    <nav
      aria-label={t("nav.tabBarLabel")}
      // Hidden from assistive tech too while a sheet is open, for the same
      // reason it is hidden visually: it is outside the open dialog.
      aria-hidden={overlayOpen || undefined}
      // Full-width wrapper is transparent and ignores pointer events so taps
      // in the side gutters fall through to content; only the floating bar
      // itself is interactive.
      className={cn(
        // native-md-block, so a tablet keeps the bar. The pill stays max-w-md and
        // centred rather than stretching; see the native-md-* rules in globals.css.
        "md:hidden native-md-block fixed inset-x-0 bottom-0 z-50 px-3 safe-bottom-pad pointer-events-none",
        // Faded rather than unmounted: the sheet slides up over 200ms, and a
        // bar that blinks out instantly is visible in the gap before the sheet
        // covers it. Matching durations makes the handoff read as one motion.
        "transition-opacity duration-200",
        overlayOpen && "opacity-0",
      )}
    >
      <div
        className={cn(
          "relative mx-auto mb-1.5 max-w-md overflow-visible",
          // The tap interception lives here, on the only part of the bar that
          // is interactive, so this is what has to be switched off.
          overlayOpen ? "pointer-events-none" : "pointer-events-auto",
          // Grounded bar: a solid elevated surface (no glassy blur or sheen),
          // a single hairline border, and a restrained shadow so it reads as a
          // quiet raised bar rather than a floating glass pill.
          "rounded-3xl border border-white/10 bg-night-soft",
          "shadow-[0_4px_18px_rgba(0,0,0,0.4)] px-2 py-2",
          // Below 360px (iPad Slide Over, the narrowest Split View) the bar's
          // own gutters are what stand between "Community" and an ellipsis at
          // the label floor. Cells stay well over the 44px touch minimum.
          "max-[359px]:px-1",
        )}
      >
        <ul ref={listRef} className="flex items-stretch gap-1 max-[359px]:gap-0">
          {TABS.map(({ key, label, href, Icon, box, lines = TAB_LINES, matches }) => {
            const active = matches(pathname);
            // Every glyph at one size: see lib/ui/tabGlyphFrame.ts.
            const frame = frameGlyph(box, lines[0]);
            return (
              // min-w-0: flex-1 is `flex: 1 1 0%`, but a flex item's
              // min-width defaults to auto, so without this the cell
              // refuses to shrink below its label's min-content width and
              // the bar runs off the screen. It did, in Greek, French,
              // Romanian and Russian.
              <li key={key} className="flex-1 min-w-0">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  // A tick on selection, and only on a real change of tab.
                  // Firing it when you re-tap the tab you are already on makes
                  // the bar feel noisy rather than responsive. Best-effort by
                  // design: iOS WKWebView has no navigator.vibrate, so this is
                  // never the only feedback a tap gives.
                  //
                  // The exit fade starts here, in the same tick as the tap and
                  // before React schedules the navigation, so the outgoing
                  // screen begins leaving while the destination is still being
                  // rendered. It fades `[data-route-content]`, which is a
                  // sibling of this bar, so the bar itself never dims and the
                  // selected state answers instantly. Guarded by the same
                  // `!active` check: re-tapping the current tab navigates
                  // nowhere, and fading the screen for it would be a flicker
                  // with no destination. See lib/ui/routeTransition.ts.
                  onClick={() => {
                    if (!active) {
                      haptic("light");
                      beginRouteExit();
                    }
                  }}
                  className={cn(
                    "tap-press",
                    // rounded-2xl, not the old rounded-[26px]: with no
                    // compartment behind it the radius now only shapes the
                    // focus ring, and 26px on a 58px-square cell drew a circle.
                    "h-[58px] flex flex-col items-center justify-center gap-1.5 rounded-2xl",
                    "font-sans text-caption tracking-[0.01em] transition-colors duration-200",
                    active
                      ? "text-paper font-semibold"
                      : "text-paper/55 hover:text-paper/80 font-medium",
                  )}
                >
                  {/* Active tabs also thicken the stroke. With the colour
                      shift and the heavier label that is three selected-state
                      signals, and two of the three are not colour. Every tab
                      glyph is drawn so its interior stays open at 2.0, but
                      for the praying hands, which are lit at less. */}
                  {/* `key` flips with the active state so React remounts the
                      glyph and the pop replays on every selection. Without it
                      the animation only fires once per mount. */}
                  {/* Relative so the unread dot can sit on the glyph. */}
                  <span className="relative inline-flex">
                    <Icon
                      key={active ? "on" : "off"}
                      size={22}
                      viewBox={frame.viewBox}
                      strokeWidth={frame.strokeFor(active ? lines[1] : lines[0])}
                      className={cn(active && "tab-pop")}
                    />
                    {/* Chat's unread dot. Chat is a tile on Discover now, so
                        the dot says so here and again on that tile. */}
                    {key === "discover" ? <NotificationsBadge /> : null}
                  </span>
                  {/* truncate, not wrap: a two-line label would change the
                      bar's height on one locale and not another. The full
                      word is still on the destination's own header.
                      inline-block, so scrollWidth is the text's own width
                      whether or not it fits; the size comes from the row's
                      fit above and only truncates below its floor.
                      max-w-full is the first paint's cap. The fit above then
                      sets each label's own, which may be wider than the cell:
                      the label is centred, and reaches evenly into the space
                      its neighbours' shorter words leave. */}
                  <span
                    data-tab-label
                    className="inline-block max-w-full truncate leading-none"
                    style={{ fontSize: `var(--tab-label-size, ${TAB_LABEL_MAX_PX}px)` }}
                  >
                    {label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
