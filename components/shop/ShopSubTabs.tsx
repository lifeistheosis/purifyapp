"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { cartCount, openCartDrawer, useCart } from "@/lib/shop/cart";

/**
 * Sticky buyer navigation inside the shop section on `< md`, the same
 * register as PrayersSubTabs. Desktop carries the section through the
 * page headers instead. "Saved" is the app-wide /saved surface (product
 * favorites live there beside bookmarks); "Profile" is the account page.
 * Cart shows a live count and appears only once something is in it — an
 * empty cart tab would be noise.
 */
const TABS: { label: string; href: string; exact?: boolean }[] = [
  { label: "Explore", href: "/shop", exact: true },
  { label: "Cart", href: "/shop/cart" },
  { label: "Requests", href: "/shop/requests" },
  { label: "Orders", href: "/shop/orders" },
  { label: "Messages", href: "/shop/messages" },
  { label: "Saved", href: "/saved" },
  { label: "Profile", href: "/account" },
];

export function ShopSubTabs() {
  const pathname = usePathname() ?? "";
  const count = cartCount(useCart());

  // The seller console carries its own navigation; stacking the buyer
  // tabs above it would read as two competing menus.
  if (pathname.startsWith("/shop/seller")) return null;

  return (
    <nav
      aria-label="Shop sections"
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
      className="md:hidden sticky sticky-safe-top z-20 bg-night border-b border-white/8"
    >
      {/* Quiet text tabs; only the active one wears a pill. The cart is
          always reachable (hiding it while empty made the row jump around),
          its count badge bumps when something is added (badge-bump keyframe,
          keyed by count). Snap keeps mid-scroll states tidy. */}
      <ul className="flex snap-x gap-1 overflow-x-auto scrollbar-thin px-2 py-1.5">
        {TABS.map((t) => {
          const isCart = t.href === "/shop/cart";
          // The cart opens the slide-in drawer instead of navigating, so it is
          // never the "active route".
          const active = isCart
            ? false
            : t.exact
              ? pathname === t.href
              : pathname === t.href || pathname.startsWith(t.href + "/");
          const cls = cn(
            "tap-press inline-flex min-h-[44px] items-center gap-1.5 rounded-pill px-3.5 font-sans text-detail transition-colors",
            active
              ? "bg-gold font-semibold text-night"
              : "font-medium text-paper/65 hover:bg-paper/[0.05] hover:text-paper",
          );
          const inner = (
            <>
              {t.label}
              {isCart && count > 0 ? (
                <span
                  key={count}
                  className="badge-bump inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-gold px-1 font-sans text-[10px] font-bold text-night"
                >
                  {count}
                </span>
              ) : null}
            </>
          );
          return (
            <li key={t.href} className="shrink-0 snap-start">
              {isCart ? (
                <button type="button" onClick={openCartDrawer} className={cls}>
                  {inner}
                </button>
              ) : (
                <Link
                  href={t.href}
                  aria-current={active ? "page" : undefined}
                  className={cls}
                >
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
