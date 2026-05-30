import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * 2 × 2 grid of "what to do next" tiles. Used on Discover to give the
 * four bodies (Saints / Calendar / Councils / Topics) a flatter shape
 * than the vertical timeline that Today uses.
 */
export type BodyTile = {
  label: string;
  blurb: string;
  href: string;
  icon?: ReactNode;
  accent?: boolean;
};

export function BodyGrid({ tiles }: { tiles: BodyTile[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {tiles.map((t) => (
        <Link
          key={t.label}
          href={t.href}
          className={cn(
            "relative rounded-2xl border p-4 active:scale-[0.98] transition-transform overflow-hidden",
            t.accent
              ? "border-gold/30 bg-gold/[0.06]"
              : "border-paper/10 bg-paper/[0.03]",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="font-sans text-[11px] uppercase tracking-[1.5px] text-paper/55">
              {t.label}
            </p>
            {t.icon && <span className="shrink-0">{t.icon}</span>}
          </div>
          <p className="mt-2 font-serif text-[15px] text-paper/85 leading-[1.35]">
            {t.blurb}
          </p>
          <p className="mt-3 font-sans text-[12.5px] font-medium text-paper/65">
            Open →
          </p>
        </Link>
      ))}
    </div>
  );
}
