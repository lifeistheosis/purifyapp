"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { cartCount, useCart } from "@/lib/shop/cart";

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
      className="md:hidden sticky top-12 z-20 bg-night/92 backdrop-blur border-b border-white/8"
    >
      <ul className="flex gap-1 overflow-x-auto scrollbar-thin px-3 py-2">
        {TABS.map((t) => {
          if (t.href === "/shop/cart" && count === 0 && pathname !== "/shop/cart") {
            return null;
          }
          const active = t.exact
            ? pathname === t.href
            : pathname === t.href || pathname.startsWith(t.href + "/");
          return (
            <li key={t.href} className="shrink-0">
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-pill px-3.5 py-1.5 font-sans text-detail font-medium transition-colors",
                  active
                    ? "bg-gold text-night"
                    : "text-paper/70 hover:text-paper border border-paper/15 bg-paper/[0.03]",
                )}
              >
                {t.label}
                {t.href === "/shop/cart" && count > 0 ? (
                  <span
                    className={cn(
                      "inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 font-sans text-[10px] font-bold",
                      active ? "bg-night text-gold" : "bg-gold text-night",
                    )}
                  >
                    {count}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
