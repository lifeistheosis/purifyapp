"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useScrolled } from "@/lib/useScrolled";
import { cn } from "@/lib/cn";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import {
  DiscoverDropdown,
  DISCOVER_CHILD_HREFS,
} from "@/components/nav/DiscoverDropdown";
import { PurifyMark } from "@/components/ui/PurifyMark";
import { PremiumNavCta } from "@/components/nav/PremiumNavCta";
import { shopEnabled } from "@/lib/shop/flags";
import { Close } from "@/components/ui/icons/Close";
import { Menu } from "@/components/ui/icons/Menu";

export function Navbar() {
  const scrolled = useScrolled();
  const [open, setOpen] = useState(false);
  const pathname = usePathname() ?? "/";
  const { t } = useTranslate();

  const navItems = [
    { key: "today", label: t("nav.today"), href: "/prayers/today" },
    { key: "bible", label: t("nav.bible"), href: "/bible" },
    { key: "prayers", label: t("nav.prayers"), href: "/prayers" },
    { key: "saints", label: t("nav.saints"), href: "/saints" },
    { key: "discover", label: t("nav.discover"), href: "/discover" },
    { key: "calendar", label: t("nav.calendar"), href: "/calendar" },
    { key: "community", label: t("nav.community"), href: "/community" },
  ];

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  function isDiscoverActive() {
    if (isActive("/discover")) return true;
    return DISCOVER_CHILD_HREFS.some((h) => isActive(h));
  }

  const secondary = [
    { key: "support", label: t("nav.support"), href: "/support" },
    { key: "account", label: t("nav.account"), href: "/account" },
  ];

  // Force the dark bg on while the mobile menu is open so the panel reads cleanly.
  const showBg = scrolled || open;

  return (
    <header
      className={cn(
        "sticky top-0 z-40 h-[72px] transition-[background-color,border-color,backdrop-filter] duration-200",
        showBg
          ? "bg-night/85 backdrop-blur border-b border-white/8"
          : "bg-transparent border-b border-transparent",
      )}
    >
      <div className="mx-auto max-w-[1240px] h-full flex items-center justify-between gap-4 px-5 md:px-8">
        <Link
          href="/"
          className="group inline-flex items-center gap-2.5 font-sans text-title-sm font-bold tracking-[-0.01em] text-paper hover:text-paper/80 transition-colors duration-150"
        >
          <PurifyMark
            size={24}
            className="text-gold-pale transition-colors group-hover:text-paper"
          />
          Purify
        </Link>

        <nav className="hidden md:flex items-center gap-9">
          {navItems.map((item) => {
            if (item.key === "discover") {
              return (
                <DiscoverDropdown
                  key={item.key}
                  pathname={pathname}
                  triggerLabel={item.label}
                  triggerHref={item.href}
                  triggerClassName={cn(
                    "font-sans text-ui font-medium transition-colors duration-150",
                    isDiscoverActive()
                      ? "text-paper"
                      : "text-paper/85 hover:text-paper",
                  )}
                />
              );
            }
            return (
              <Link
                key={item.key}
                href={item.href}
                className="font-sans text-ui font-medium text-paper/85 hover:text-paper transition-colors duration-150"
              >
                {item.label}
              </Link>
            );
          })}
          {/* The shop is a destination, not a reading surface, so it gets
              its own pill button instead of another text link. Hidden while
              the marketplace flag is dark. */}
          {shopEnabled() && (
            <Link
              href="/shop"
              className={cn(
                // -ml-4 cancels the pill's own left padding so the Shop
                // LABEL sits on the nav row's text rhythm; the ring then
                // hugs the label instead of pushing it right.
                "-ml-4 inline-flex items-center rounded-pill border px-4 py-1.5 font-sans text-ui font-medium transition-colors duration-150",
                isActive("/shop")
                  ? "border-gold text-gold-pale bg-gold/10"
                  : "border-gold/45 text-gold-pale hover:border-gold hover:bg-gold/10",
              )}
            >
              {t("nav.shop")}
            </Link>
          )}
        </nav>

        <div className="hidden sm:flex items-center gap-5">
          {secondary.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="font-sans text-ui font-medium text-paper/85 hover:text-paper transition-colors duration-150"
            >
              {item.label}
            </Link>
          ))}
          <PremiumNavCta active={isActive("/premium")} />
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          aria-label={t("nav.menuToggle")}
          aria-expanded={open}
          className="sm:hidden inline-flex items-center justify-center h-11 w-11 rounded-pill border border-paper/20 text-paper focus-visible:outline-2 focus-visible:outline-paper focus-visible:outline-offset-2"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <Close size={18} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="sm:hidden absolute left-0 right-0 top-[72px] bg-night border-b border-white/8 shadow-lg">
          <nav className="flex flex-col px-5 py-3">
            {[
              ...navItems,
              ...(shopEnabled()
                ? [{ key: "shop", label: t("nav.shop"), href: "/shop" }]
                : []),
              ...secondary,
            ].map((it) => (
              <Link
                key={it.key}
                href={it.href}
                onClick={() => setOpen(false)}
                className="font-sans text-body font-medium text-paper/85 hover:text-paper py-3.5 border-b border-white/5 last:border-0"
              >
                {it.label}
              </Link>
            ))}
            <div className="mt-4 mb-2">
              <PremiumNavCta
                fullWidth
                active={isActive("/premium")}
                onClick={() => setOpen(false)}
              />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
