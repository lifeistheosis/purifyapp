"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { shopEnabled } from "@/lib/shop/flags";

export type SiteNavItem = { key: string; label: string; href: string };

/**
 * The website's destinations, in one place for both menus that list them:
 * the web header (AppNav) and the menu sheet a phone opens from a page's own
 * top bar (SiteMenuButton). Two copies of this list would drift.
 *
 *  - `primary`: the header row's sections, in order.
 *  - `secondary`: the quieter links after them.
 *  - `menu`: everything a phone's menu lists, the shop and the account
 *    included.
 */
export function useSiteNav(): {
  primary: SiteNavItem[];
  secondary: SiteNavItem[];
  menu: SiteNavItem[];
} {
  const { t } = useTranslate();
  const primary = [
    { key: "today", label: t("nav.today"), href: "/prayers/today" },
    { key: "bible", label: t("nav.bible"), href: "/bible" },
    { key: "prayers", label: t("nav.prayers"), href: "/prayers" },
    { key: "saints", label: t("nav.saints"), href: "/saints" },
    { key: "discover", label: t("nav.discover"), href: "/discover" },
    { key: "calendar", label: t("nav.calendar"), href: "/calendar" },
    { key: "community", label: t("nav.community"), href: "/community" },
  ];
  const secondary = [{ key: "support", label: t("nav.support"), href: "/support" }];
  const menu = [
    ...primary,
    ...(shopEnabled() ? [{ key: "shop", label: t("nav.shop"), href: "/shop" }] : []),
    ...secondary,
    { key: "account", label: t("nav.account"), href: "/account" },
  ];
  return { primary, secondary, menu };
}
