"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { cartCount, openCartDrawer, useCart } from "@/lib/shop/cart";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Cart } from "@/components/ui/icons/Cart";
import { ScrollRail } from "@/components/ui/ScrollRail";
import { shouldShowBack } from "@/lib/nav/backBar";

/**
 * The shop's own bar on `< md`: its sections, and the cart. Desktop carries
 * the section through the page headers instead. "Saved" is the app-wide
 * /saved surface (product favorites live there beside bookmarks); "Profile"
 * is the account page.
 *
 * Redrawn for 1.5.2 (the owner, 2026-10-05, of the shop on a phone: "the top
 * bar ... could have a better design"). It was seven loose words in a row
 * that ran off the right of the screen, the current one in a white pill, with
 * the cart as the second word:
 *
 *   - The cart is out of the row and pinned at its right end, as a button
 *     with its count, so it is where a thumb expects it on every shop screen
 *     and never scrolls out of reach.
 *   - The sections are tabs: the one the reader is on is marked by a gold
 *     line on the bar's own edge, in the shop's gold (the `premium` tokens),
 *     rather than by a pill in the page's white.
 *   - The row fades where it runs on, shows no scrollbar, and opens with the
 *     current tab in view (ScrollRail).
 */
const TABS: { labelKey: string; href: string; exact?: boolean }[] = [
  { labelKey: "shop.tabs.explore", href: "/shop", exact: true },
  { labelKey: "shop.tabs.requests", href: "/shop/requests" },
  { labelKey: "shop.tabs.orders", href: "/shop/orders" },
  { labelKey: "shop.messages", href: "/shop/messages" },
  { labelKey: "common.saved", href: "/saved" },
  { labelKey: "account.tabs.profile", href: "/account" },
];

/** The shop's browsing pages, which all belong to the Explore tab. */
const BROWSE = ["/shop/category", "/shop/icons", "/shop/stores", "/shop/eikon"];

export function ShopSubTabs() {
  const { t, tn } = useTranslate();
  const pathname = usePathname() ?? "";
  const count = cartCount(useCart());
  // The apps' export builds with `trailingSlash: true`, so the shop's front
  // page arrives there as "/shop/" and an exact match against "/shop" lit
  // nothing: the bar stood with no tab marked on the one screen every reader
  // opens first. Same normalisation as shouldShowBack() in lib/nav/backBar.
  const path = pathname !== "/" ? pathname.replace(/\/+$/, "") : "/";

  // The seller console carries its own navigation; stacking the buyer
  // tabs above it would read as two competing menus.
  if (path.startsWith("/shop/seller")) return null;

  const isActive = (tab: (typeof TABS)[number]) =>
    tab.exact ? path === tab.href : path === tab.href || path.startsWith(tab.href + "/");
  // Browsing is Explore: a category, a piece, the stores. Without this the
  // gold line went out the moment a reader tapped a chip, as if they had left
  // the shop's front room. The cart, checkout and the seller pages are not
  // browsing, and light nothing.
  const browsing = BROWSE.some((p) => path === p || path.startsWith(p + "/"));
  const current = TABS.find(isActive)?.href ?? (browsing ? "/shop" : null);

  return (
    <nav
      aria-label={t("shop.shopSections")}
      // Solid background, not a translucent frosted one: in the native
      // Android WebView the shop's product imagery bled through a
      // bg-night/92 + backdrop-blur bar as it scrolled, which read as a
      // see-through top bar. A flat bg-night keeps the row legible.
      //
      // The offset lives in .sticky-safe-top (globals.css), NOT a `top-*`
      // utility: the shop renders no MobileTopBar, so what sits above this row
      // differs by surface (72px AppNav on the web, nothing but the status bar
      // on native). The old hard-coded top-12 reserved 48px for a bar that
      // exists on neither, which left a transparent band where the hero
      // scrolled under the status bar in the app.
      //
      // ...and now something DOES exist on native, on every /shop route but
      // the tab root: NativeBackBar. `under-back-bar` is inert on the web and
      // on /shop itself; where the bar is present it re-pins this row below it
      // and cancels the inset painting the bar has already done. The condition
      // is shouldShowBack(), the same call the bar renders from, so this row
      // cannot drift out of step with it.
      className={cn(
        "md:hidden native-md-block sticky sticky-safe-top z-20 bg-night border-b border-white/8",
        shouldShowBack(pathname) && "under-back-bar",
      )}
    >
      <div className="flex items-stretch">
        {/* The sections. `current` keeps the tab the reader is on in view: on
            Saved or Profile it would otherwise sit off the right edge. */}
        <ScrollRail as="ul" current={current} arrows={false} className="min-w-0 flex-1" trackClassName="px-2">
          {TABS.map((tab) => {
            const active = tab.href === current;
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "tap-press relative inline-flex h-12 items-center px-3 font-sans text-detail transition-colors",
                    active ? "font-semibold text-paper" : "font-medium text-paper/60 hover:text-paper",
                  )}
                >
                  {t(tab.labelKey)}
                  {/* Where the reader is: a gold line on the bar's edge. Every
                      tab carries one, so the line fades from the old tab to
                      the new as the bar stays mounted across the shop. */}
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-premium transition-opacity duration-200",
                      active ? "opacity-100" : "opacity-0",
                    )}
                  />
                </Link>
              </li>
            );
          })}
        </ScrollRail>

        {/* The cart, pinned. It opens the slide-in drawer rather than
            navigating, so it is never the "current" tab; its count bumps when
            something is added (badge-bump keyframe, keyed by count). */}
        <button
          type="button"
          onClick={openCartDrawer}
          aria-label={count > 0 ? tn("shop.openCartCount", count) : t("shop.openCart")}
          className="tap-press relative inline-flex h-12 w-14 shrink-0 items-center justify-center border-s border-white/8 text-paper/85 transition-colors hover:text-paper"
        >
          <Cart size={21} />
          {count > 0 ? (
            <span
              key={count}
              className="badge-bump absolute end-2 top-1.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-premium px-1 font-sans text-[10px] font-bold leading-none text-night"
            >
              {count}
            </span>
          ) : null}
        </button>
      </div>
    </nav>
  );
}
