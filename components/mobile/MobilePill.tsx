import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Small rounded chip used for quick-jump entries (Psalter, Gospel of John,
 * etc. on /bible; favourite saints on /you). Optional `accent` lifts it
 * to a gold treatment for the user's most-used entry.
 */
export function MobilePill({
  href,
  children,
  accent = false,
}: {
  href: string;
  children: ReactNode;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        "inline-flex items-center rounded-full border px-3 py-1.5 font-sans text-[12.5px] font-medium transition-colors " +
        (accent
          ? "border-gold/45 bg-gold/[0.08] text-gold hover:bg-gold/[0.14]"
          : "border-paper/15 bg-paper/[0.04] text-paper/85 hover:border-paper/30 hover:bg-paper/[0.08]")
      }
    >
      {children}
    </Link>
  );
}

/**
 * Row layout for a series of pills. Wraps softly on narrow viewports.
 */
export function MobilePillRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}
