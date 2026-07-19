"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { Lampada } from "@/components/ui/icons/Lampada";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * Compact 48px header for mobile-only surfaces (Discover, You, individual
 * Bible chapters). Mounted per-page rather than globally, so routes that
 * want a true hero (Today) can omit it.
 *
 * - `title` is centered.
 * - `back` shows a chevron and either pops the router stack or routes
 *   to the given href.
 * - `trailing` is a slot for a small action (translation switcher,
 *   settings icon, etc.).
 * - `donate` renders a gold vigil-lamp link to /support in the trailing
 *   slot when no explicit `trailing` is given — the mobile parallel to the
 *   desktop nav's Support link.
 *
 * Hidden on `md+`, desktop keeps the AppNav.
 */
export function MobileTopBar({
  title,
  back,
  trailing,
  donate,
}: {
  title?: string;
  back?: true | string;
  trailing?: React.ReactNode;
  donate?: boolean;
}) {
  const router = useRouter();
  const { t } = useTranslate();

  const trailingContent =
    trailing ??
    (donate ? (
      <Link
        href="/support"
        aria-label={t("nav.supportPurify")}
        title={t("nav.supportPurify")}
        className="h-10 w-10 inline-flex items-center justify-center rounded-pill text-gold/80 hover:text-gold transition-colors"
      >
        <Lampada size={20} />
      </Link>
    ) : null);

  return (
    <div
      className={cn(
        "md:hidden sticky top-0 z-30",
        // `topbar-safe` (globals.css) pads the bar below the iOS notch on the
        // WEB (viewport-fit=cover puts content under it); the native shell has
        // its own inset handling, so the rule is scoped to non-native.
        "topbar-safe h-12 px-2 flex items-center justify-between gap-2",
        "bg-night/92 backdrop-blur border-b border-white/8",
      )}
    >
      <div className="min-w-[44px] flex items-center">
        {back ? (
          back === true ? (
            <button
              type="button"
              aria-label={t("nav.back")}
              onClick={() => router.back()}
              className="h-10 w-10 inline-flex items-center justify-center rounded-pill text-paper/80 hover:text-paper"
            >
              <span aria-hidden className="text-lede leading-none">‹</span>
            </button>
          ) : (
            <Link
              href={back}
              aria-label={t("nav.back")}
              className="h-10 w-10 inline-flex items-center justify-center rounded-pill text-paper/80 hover:text-paper"
            >
              <span aria-hidden className="text-lede leading-none">‹</span>
            </Link>
          )
        ) : null}
      </div>
      <h1
        className="flex-1 text-center font-sans text-ui font-semibold text-paper tracking-[-0.005em] truncate"
        title={title}
      >
        {title}
      </h1>
      <div className="min-w-[44px] flex items-center justify-end">
        {trailingContent}
      </div>
    </div>
  );
}
