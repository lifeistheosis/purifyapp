"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { PremiumNavCta } from "@/components/nav/PremiumNavCta";
import { useScrolled } from "@/lib/useScrolled";
import { createClient } from "@/lib/supabase/client";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import {
  DiscoverDropdown,
  DISCOVER_CHILD_HREFS,
} from "@/components/nav/DiscoverDropdown";
import { shopEnabled } from "@/lib/shop/flags";
import { Close } from "@/components/ui/icons/Close";
import { Menu } from "@/components/ui/icons/Menu";
import { InitialsAvatar } from "@/components/profile/InitialsAvatar";

/**
 * Reads the current Supabase session client-side once on mount and again
 * on auth-state-change events. Returns `null` before the first read (no
 * flash of "signed in" before we know), "" when signed out, and the name
 * the avatar draws its initials from once a session exists.
 *
 * NEVER CALL AN AUTH METHOD FROM THE CALLBACK, and never return a promise
 * from it. This subscriber used to be `onAuthStateChange(() => read())`,
 * and `read()` awaited `getUser()`. supabase-js awaits whatever the
 * callback returns, from inside the auth lock it is already holding, so:
 *
 *   updateUser() takes the lock
 *     -> emits USER_UPDATED, awaiting every subscriber
 *       -> this callback calls getUser()
 *         -> _acquireLock sees the lock held, queues behind the pending
 *            outer call, and waits for it to finish
 *
 * The outer call cannot finish until the callback returns, and the
 * callback cannot return until the outer call finishes. Nothing times out;
 * both promises simply never settle. Every caller of an auth write on any
 * page carrying this nav hung forever, which is what stranded the profile
 * name editor on "Saving...". Verified against @supabase/auth-js 2.105.4:
 * the nested form never resolves, the detached form resolves at once.
 *
 * The event hands us the session already, so there is nothing to look up.
 * If you ever do need an auth call here, detach it (setTimeout, or a
 * non-returned async call) so the emitter's lock is released first.
 */
function useAccountName(): string | null {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    function show(user: { email?: string; user_metadata?: unknown } | null) {
      if (cancelled) return;
      if (!user) {
        setName("");
        return;
      }
      const meta = user.user_metadata as { display_name?: string } | null;
      setName(meta?.display_name || user.email?.split("@")[0] || "Reader");
    }
    // The one read that may take the lock: nobody is holding it on mount.
    void supabase.auth.getUser().then(({ data }) => show(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      show(session?.user ?? null);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return name;
}

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const scrolled = useScrolled();
  const accountName = useAccountName();
  const signedIn = !!accountName;
  const { t } = useTranslate();

  const NAV = [
    { key: "today", label: t("nav.today"), href: "/prayers/today" },
    { key: "bible", label: t("nav.bible"), href: "/bible" },
    { key: "prayers", label: t("nav.prayers"), href: "/prayers" },
    { key: "saints", label: t("nav.saints"), href: "/saints" },
    { key: "discover", label: t("nav.discover"), href: "/discover" },
    { key: "calendar", label: t("nav.calendar"), href: "/calendar" },
    { key: "community", label: t("nav.community"), href: "/community" },
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

        {/* Full link row needs ~900px; below lg (tablet portrait included)
            the hamburger menu takes over so the header can never overflow
            the viewport. */}
        <nav className="hidden lg:flex items-center gap-7">
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
          {/* The shop is a destination, not a reading surface, so it gets
              its own pill button instead of another text link. Hidden while
              the marketplace flag is dark. */}
          {shopEnabled() && (
            <Link
              href="/shop"
              style={{ animationDelay: `${80 + NAV.length * 35}ms` }}
              className={cn(
                // -ml-4 cancels the pill's own left padding so the Shop
                // LABEL sits on the nav row's text rhythm; the ring then
                // hugs the label instead of pushing it right.
                "appnav-in -ml-4 inline-flex items-center rounded-pill border px-4 py-1.5 font-sans text-ui font-medium transition-colors duration-150",
                isActive("/shop")
                  ? "border-gold text-gold-pale bg-gold/10"
                  : "border-gold/45 text-gold-pale hover:border-gold hover:bg-gold/10",
              )}
            >
              {t("nav.shop")}
            </Link>
          )}
        </nav>

        <div
          className="appnav-in hidden lg:flex items-center gap-5"
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
              // The ring shows where you are: brighter on /account, and on
              // hover. Neutral since 2026-09-25, no gold (see InitialsAvatar).
              className={cn(
                "inline-flex rounded-full p-[2px] ring-1 transition-shadow duration-150",
                isActive("/account")
                  ? "ring-paper/70"
                  : "ring-transparent hover:ring-paper/40",
              )}
            >
              <InitialsAvatar name={accountName} size={32} />
            </Link>
          ) : (
            // Default for both pre-hydration (accountName === null) and
            // confirmed signed-out (accountName === ""): show the text link. If a session is
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
          <PremiumNavCta active={isActive("/premium")} />
        </div>

        <button
          type="button"
          aria-label={t("nav.menuToggle")}
          aria-expanded={open}
          className="lg:hidden inline-flex items-center justify-center h-11 w-11 rounded-pill border border-paper/20 text-paper focus-visible:outline-2 focus-visible:outline-paper focus-visible:outline-offset-2"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <Close size={18} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden absolute left-0 right-0 top-full bg-night border-b border-white/8">
          <nav className="flex flex-col px-5 py-4 gap-1">
            {[
              ...NAV,
              ...(shopEnabled()
                ? [{ key: "shop", label: t("nav.shop"), href: "/shop" }]
                : []),
              ...SECONDARY,
              { key: "account", label: t("nav.account"), href: "/account" },
            ].map(
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
            <div className="mt-4">
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
