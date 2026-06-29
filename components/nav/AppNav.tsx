"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { ComingSoonCTA } from "@/components/marketing/ComingSoonCTA";
import { useScrolled } from "@/lib/useScrolled";
import { createClient } from "@/lib/supabase/client";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import {
  DiscoverDropdown,
  DISCOVER_CHILD_HREFS,
} from "@/components/nav/DiscoverDropdown";

function initialsFromName(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/**
 * Reads the current Supabase session client-side once on mount and again
 * on auth-state-change events. Returns `null` before the first read (no
 * flash of "signed in" before we know), and a two-letter initials string
 * once a session exists.
 */
function useAccountInitials(): string | null {
  const [initials, setInitials] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    async function read() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        setInitials("");
        return;
      }
      const meta = user.user_metadata as { display_name?: string } | null;
      const name =
        meta?.display_name ||
        user.email?.split("@")[0] ||
        "Reader";
      setInitials(initialsFromName(name));
    }
    read();
    const { data: sub } = supabase.auth.onAuthStateChange(() => read());
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return initials;
}

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const scrolled = useScrolled();
  const initials = useAccountInitials();
  const signedIn = !!initials;
  const { t } = useTranslate();

  const NAV = [
    { key: "today", label: t("nav.today"), href: "/prayers/today" },
    { key: "bible", label: t("nav.bible"), href: "/bible" },
    { key: "prayers", label: t("nav.prayers"), href: "/prayers" },
    { key: "saints", label: t("nav.saints"), href: "/saints" },
    { key: "discover", label: t("nav.discover"), href: "/discover" },
    { key: "calendar", label: t("nav.calendar"), href: "/calendar" },
  ];

  const SECONDARY = [{ key: "support", label: t("nav.support"), href: "/support" }];

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  function isDiscoverActive() {
    if (isActive("/discover")) return true;
    return DISCOVER_CHILD_HREFS.some((h) => isActive(h));
  }

  // Always show the bg when the mobile menu is open, even at the very top.
  const showBg = scrolled || open;

  return (
    <header
      // Clear the iOS notch / status bar on mobile web. viewport-fit=cover
      // (app/layout.tsx) lets the page run under the notch, so without this the
      // back button and menu toggle sit under the status bar and can't be
      // tapped (reported on iPhone Safari). env(safe-area-inset-top) is 0 on
      // desktop and non-notched devices, so this is a no-op there; the native
      // shell uses safe-pt instead and never renders this web nav.
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      className={cn(
        "sticky top-0 z-40 transition-[background-color,border-color,backdrop-filter] duration-200",
        showBg
          ? "bg-night/85 backdrop-blur border-b border-white/8"
          : "bg-transparent border-b border-transparent",
      )}
    >
      <div className="mx-auto max-w-[1240px] h-[72px] flex items-center justify-between gap-6 px-5 md:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label={t("common.back")}
            onClick={() => router.back()}
            style={{ animationDelay: "0ms" }}
            className="appnav-in inline-flex items-center justify-center h-9 w-9 rounded-pill border border-paper/20 text-paper/70 hover:text-paper hover:border-paper/40 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-paper focus-visible:outline-offset-2"
          >
            <svg
              width={18}
              height={18}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M15 5 L8 12 L15 19" />
            </svg>
          </button>
          <Link
            href="/"
            style={{ animationDelay: "40ms" }}
            className="appnav-in font-sans text-title-sm font-bold tracking-[-0.01em] text-paper hover:text-paper/80 transition-colors duration-150"
          >
            Purify
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-7">
          {NAV.map((it, i) => {
            const delay = { animationDelay: `${80 + i * 35}ms` };
            if (it.key === "discover") {
              return (
                <DiscoverDropdown
                  key={it.key}
                  pathname={pathname}
                  triggerLabel={it.label}
                  triggerHref={it.href}
                  triggerStyle={delay}
                  triggerClassName={cn(
                    "appnav-in font-sans text-ui font-medium transition-colors duration-150",
                    isDiscoverActive()
                      ? "text-paper"
                      : "text-paper/65 hover:text-paper",
                  )}
                />
              );
            }
            return (
              <Link
                key={it.key}
                href={it.href}
                style={delay}
                className={cn(
                  "appnav-in font-sans text-ui font-medium transition-colors duration-150",
                  isActive(it.href)
                    ? "text-paper"
                    : "text-paper/65 hover:text-paper",
                )}
              >
                {it.label}
              </Link>
            );
          })}
        </nav>

        <div
          className="appnav-in hidden md:flex items-center gap-5"
          style={{ animationDelay: `${80 + NAV.length * 35}ms` }}
        >
          {SECONDARY.map((it) => (
            <Link
              key={it.key}
              href={it.href}
              className={cn(
                "font-sans text-ui font-medium transition-colors duration-150",
                isActive(it.href)
                  ? "text-paper"
                  : "text-paper/65 hover:text-paper",
              )}
            >
              {it.label}
            </Link>
          ))}
          {signedIn ? (
            <Link
              href="/account"
              aria-label={t("nav.yourAccount")}
              className={cn(
                "inline-flex items-center justify-center rounded-full border-2 transition-colors duration-150",
                isActive("/account")
                  ? "border-gold"
                  : "border-gold/55 hover:border-gold",
              )}
              style={{
                width: 36,
                height: 36,
                background:
                  "linear-gradient(155deg, #2a1f10 0%, #3b2a14 50%, #5a3f1c 100%)",
              }}
            >
              <span className="font-display-serif text-caption text-cream tracking-[0.04em]">
                {initials}
              </span>
            </Link>
          ) : (
            // Default for both pre-hydration (initials === null) and confirmed
            // signed-out (initials === ""): show the text link. If a session is
            // later detected the avatar branch above takes over in place.
            <Link
              href="/account"
              className={cn(
                "font-sans text-ui font-medium transition-colors duration-150",
                isActive("/account")
                  ? "text-paper"
                  : "text-paper/65 hover:text-paper",
              )}
            >
              {t("nav.account")}
            </Link>
          )}
          <ComingSoonCTA variant="inverse" className="!py-2.5 !px-5 text-ui">
            {t("nav.openPurify")}
          </ComingSoonCTA>
        </div>

        <button
          type="button"
          aria-label={t("nav.menuToggle")}
          aria-expanded={open}
          className="md:hidden inline-flex items-center justify-center h-11 w-11 rounded-pill border border-paper/20 text-paper focus-visible:outline-2 focus-visible:outline-paper focus-visible:outline-offset-2"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="text-lede">{open ? "✕" : "≡"}</span>
        </button>
      </div>

      {open && (
        <div className="md:hidden absolute left-0 right-0 top-full bg-night border-b border-white/8">
          <nav className="flex flex-col px-5 py-4 gap-1">
            {[...NAV, ...SECONDARY, { key: "account", label: t("nav.account"), href: "/account" }].map(
              (it) => (
                <Link
                  key={it.key}
                  href={it.href}
                  onClick={() => setOpen(false)}
                  className="font-sans text-body font-medium text-paper/85 hover:text-paper py-3 border-b border-white/5 last:border-0"
                >
                  {it.label}
                </Link>
              ),
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
