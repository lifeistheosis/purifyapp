import type { ReactNode } from "react";
import Link from "next/link";
import { Lampada } from "@/components/ui/icons/Lampada";

/**
 * Simple mobile-header strip for Bible / Discover / Prayers / You.
 * Renders a single bold title flanked by an optional action slot
 * (typically the user avatar). The Today screen uses a richer
 * `<MobileTopTabs />` instead.
 *
 * A gold vigil-lamp link to /support sits in the action slot by default —
 * the mobile parallel to the desktop nav's Support link, so giving is
 * reachable from every tab. Pass `donate={false}` to omit it.
 */
export function MobileHeader({
  title,
  trailing,
  donate = true,
}: {
  title: string;
  trailing?: ReactNode;
  donate?: boolean;
}) {
  const hasActions = donate || Boolean(trailing);
  return (
    // pt-4 only, NOT the status-bar inset: this (non-sticky) header renders
    // inside the (app) layout's <main class="safe-pt">, which already clears
    // the bar. Adding env(safe-area-inset-top) here too double-padded the top.
    <header className="flex items-center justify-between px-5 pt-4 pb-2">
      <h1 className="font-sans text-lede font-bold tracking-[-0.01em] text-paper">
        {title}
      </h1>
      {hasActions && (
        <div className="flex items-center gap-3">
          {donate && (
            <Link
              href="/support"
              aria-label="Support Purify"
              title="Support Purify"
              className="inline-flex h-9 w-9 items-center justify-center rounded-pill text-gold/80 hover:text-gold transition-colors"
            >
              <Lampada size={20} />
            </Link>
          )}
          {trailing}
        </div>
      )}
    </header>
  );
}
