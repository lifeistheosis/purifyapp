"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { PremiumNavCta } from "@/components/nav/PremiumNavCta";
import { useSiteNav } from "@/components/nav/siteNav";
import { Menu } from "@/components/ui/icons/Menu";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";

/**
 * The website's menu, from a page's own top bar. On a phone, a page with a
 * MobileTopBar shows that bar alone (the web header steps aside, globals.css
 * "One bar on a phone"), so the header's menu has to live here or those
 * pages would have no way to the rest of the site. The list is the header's
 * (siteNav), in the shared draggable sheet. Web only: the native app's tab
 * bar is its navigation.
 */
export function SiteMenuButton() {
  const { t } = useTranslate();
  const pathname = usePathname() ?? "";
  const { menu } = useSiteNav();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      <button
        type="button"
        aria-label={t("nav.menuToggle")}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="h-10 w-10 inline-flex items-center justify-center rounded-pill text-paper/70 transition-colors hover:text-paper focus-visible:outline-2 focus-visible:outline-paper focus-visible:outline-offset-2"
      >
        <Menu size={20} />
      </button>
      {/* openFull: a menu shows every destination at once, Premium included,
          instead of opening at 60% with the last rows below the screen. */}
      <Sheet open={open} onClose={close} title="Purify" openFull bodyClassName="pt-1">
        <nav className="flex flex-col">
          {menu.map((it) => {
            const active = isActive(it.href);
            return (
              <Link
                key={it.key}
                href={it.href}
                onClick={close}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-12 items-center border-b border-white/5 font-sans text-body font-medium transition-colors last:border-0",
                  active ? "text-paper" : "text-paper/75 hover:text-paper",
                )}
              >
                {it.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-4">
          <PremiumNavCta fullWidth active={isActive("/premium")} onClick={close} />
        </div>
      </Sheet>
    </>
  );
}
