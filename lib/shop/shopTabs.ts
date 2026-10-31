/**
 * The shop's own bar on a phone (components/shop/ShopSubTabs.tsx): its four
 * sections, and which one a page lights.
 */
export const SHOP_TABS: { labelKey: string; href: string; exact?: boolean }[] = [
  { labelKey: "shop.tabs.explore", href: "/shop", exact: true },
  { labelKey: "shop.tabs.requests", href: "/shop/requests" },
  { labelKey: "shop.tabs.orders", href: "/shop/orders" },
  { labelKey: "shop.messages", href: "/shop/messages" },
];

/** The shop's browsing pages, which all belong to the Explore tab. */
const BROWSE = ["/shop/category", "/shop/icons", "/shop/stores", "/shop/eikon"];

/**
 * The tab a page belongs to. Request an icon is the Requests tab's own form
 * (1.8, r3-19, Requests A): build 85 lit no tab at all on it. Browsing is
 * Explore: a category, a piece, the stores; without that the line went out
 * the moment a reader tapped a chip, as if they had left the shop's front
 * room. The cart, checkout and the seller pages are not browsing, and light
 * nothing.
 */
export function currentShopTab(pathname: string): string | null {
  // The apps' export builds with `trailingSlash: true`, so the shop's front
  // page arrives there as "/shop/" and an exact match against "/shop" lit
  // nothing. Same normalisation as shouldShowBack() in lib/nav/backBar.
  const path = pathname !== "/" ? pathname.replace(/\/+$/, "") : "/";
  if (path === "/shop/request") return "/shop/requests";
  const hit = SHOP_TABS.find((tab) =>
    tab.exact ? path === tab.href : path === tab.href || path.startsWith(tab.href + "/"),
  );
  if (hit) return hit.href;
  return BROWSE.some((p) => path === p || path.startsWith(p + "/")) ? "/shop" : null;
}
