import type { ReactNode } from "react";

/**
 * Simple mobile-header strip for Bible / Discover / Prayers / You.
 * Renders a single bold title flanked by an optional action slot
 * (typically the user avatar). The Today screen uses a richer
 * `<MobileTopTabs />` instead.
 */
export function MobileHeader({
  title,
  trailing,
}: {
  title: string;
  trailing?: ReactNode;
}) {
  return (
    <header className="flex items-center justify-between px-5 pt-4 pb-2">
      <h1 className="font-sans text-lede font-bold tracking-[-0.01em] text-paper">
        {title}
      </h1>
      {trailing && <div className="flex items-center gap-3">{trailing}</div>}
    </header>
  );
}
