"use client";

import { cn } from "@/lib/cn";

export function FilterPill({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-pill border px-4 py-2.5 md:py-2 min-h-[40px] font-sans text-detail font-medium transition-colors duration-150 inline-flex items-center gap-2",
        "focus-visible:outline-2 focus-visible:outline-paper focus-visible:outline-offset-[3px]",
        active
          ? "bg-paper text-night border-paper"
          : "bg-paper/[0.04] text-paper/80 border-paper/15 hover:bg-paper/10 hover:border-paper/30",
      )}
      aria-pressed={active}
    >
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={cn(
            "text-eyebrow tabular-nums",
            active ? "text-night/70" : "text-paper/55",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
