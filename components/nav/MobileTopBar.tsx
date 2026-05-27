"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

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
 *
 * Hidden on `md+`, desktop keeps the AppNav.
 */
export function MobileTopBar({
  title,
  back,
  trailing,
}: {
  title?: string;
  back?: true | string;
  trailing?: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <div
      className={cn(
        "md:hidden sticky top-0 z-30",
        "h-12 px-2 flex items-center justify-between gap-2",
        "bg-night/92 backdrop-blur border-b border-white/8",
      )}
    >
      <div className="min-w-[44px] flex items-center">
        {back ? (
          back === true ? (
            <button
              type="button"
              aria-label="Back"
              onClick={() => router.back()}
              className="h-10 w-10 inline-flex items-center justify-center rounded-pill text-paper/80 hover:text-paper"
            >
              <span aria-hidden className="text-[20px] leading-none">‹</span>
            </button>
          ) : (
            <Link
              href={back}
              aria-label="Back"
              className="h-10 w-10 inline-flex items-center justify-center rounded-pill text-paper/80 hover:text-paper"
            >
              <span aria-hidden className="text-[20px] leading-none">‹</span>
            </Link>
          )
        ) : null}
      </div>
      <h1
        className="flex-1 text-center font-sans text-[15px] font-semibold text-paper tracking-[-0.005em] truncate"
        title={title}
      >
        {title}
      </h1>
      <div className="min-w-[44px] flex items-center justify-end">
        {trailing}
      </div>
    </div>
  );
}
