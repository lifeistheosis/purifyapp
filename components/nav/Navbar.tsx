"use client";

import { useState } from "react";
import Link from "next/link";
import { DesktopInstallCTA } from "@/components/pwa/DesktopInstallCTA";
import { useScrolled } from "@/lib/useScrolled";
import { cn } from "@/lib/cn";
import { useTranslate } from "@/components/i18n/MessagesProvider";

export function Navbar() {
  const scrolled = useScrolled();
  const [open, setOpen] = useState(false);
  const { t } = useTranslate();

  const navItems = [
    { key: "today", label: t("nav.today"), href: "/prayers/today" },
    { key: "bible", label: t("nav.bible"), href: "/bible" },
    { key: "discover", label: t("nav.discover"), href: "/discover" },
    { key: "prayers", label: t("nav.prayers"), href: "/prayers" },
    { key: "saints", label: t("nav.saints"), href: "/saints" },
    { key: "councils", label: t("nav.councils"), href: "/councils" },
    { key: "theology", label: "Theology", href: "/theology" },
    { key: "apologetics", label: "Apologetics", href: "/apologetics" },
    { key: "calendar", label: t("nav.calendar"), href: "/calendar" },
  ];

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
          className="font-sans text-title-sm font-bold tracking-[-0.01em] text-paper hover:text-paper/80 transition-colors duration-150"
        >
          Purify
        </Link>

        <nav className="hidden md:flex items-center gap-9">
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="font-sans text-ui font-medium text-paper/85 hover:text-paper transition-colors duration-150"
            >
              {item.label}
            </Link>
          ))}
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
          <DesktopInstallCTA variant="inverse" className="!py-2.5 !px-5 text-ui">
            {t("nav.openPurify")}
          </DesktopInstallCTA>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          aria-label={t("nav.menuToggle")}
          aria-expanded={open}
          className="sm:hidden inline-flex items-center justify-center h-11 w-11 rounded-pill border border-paper/20 text-paper focus-visible:outline-2 focus-visible:outline-paper focus-visible:outline-offset-2"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="text-lede">{open ? "✕" : "≡"}</span>
        </button>
      </div>

      {open && (
        <div className="sm:hidden absolute left-0 right-0 top-[72px] bg-night border-b border-white/8 shadow-lg">
          <nav className="flex flex-col px-5 py-3">
            {[...navItems, ...secondary].map((it) => (
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
              <DesktopInstallCTA variant="inverse" className="w-full !py-3 text-ui">
                {t("nav.openPurify")}
              </DesktopInstallCTA>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
