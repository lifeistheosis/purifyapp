"use client";

// Plain-button era navigation, the primary (and non-drag, accessible)
// way to move between the ages of the Church. Rendered inside a Sheet on
// phones and as the persistent left-column index on desktop.

import { HISTORY_ERAS, type Era } from "@/lib/history/events";
import { cn } from "@/lib/cn";
import { useTranslate } from "@/components/i18n/MessagesProvider";

export function EraJumpList({
  activeEra,
  counts,
  onJump,
  className,
}: {
  activeEra?: Era;
  /** Events per era under the current filters; eras at 0 are disabled. */
  counts: Partial<Record<Era, number>>;
  onJump: (era: Era) => void;
  className?: string;
}) {
  const { t } = useTranslate();
  return (
    <nav aria-label={t("study.history.historicalEras")} className={className}>
      <ol className="space-y-1">
        {HISTORY_ERAS.map((era) => {
          const count = counts[era.id] ?? 0;
          const active = activeEra === era.id;
          return (
            <li key={era.id}>
              <button
                type="button"
                disabled={count === 0}
                onClick={() => onJump(era.id)}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "tap-press flex w-full min-h-[48px] items-center justify-between gap-3 rounded-md px-3 text-left transition-colors",
                  active ? "bg-paper/10" : "hover:bg-paper/[0.05]",
                  count === 0 && "opacity-35",
                )}
              >
                <span className="min-w-0">
                  <span
                    className={cn(
                      "block truncate font-sans text-ui",
                      active ? "font-semibold text-paper" : "text-paper/75",
                    )}
                  >
                    {era.label}
                  </span>
                  <span className="block font-sans text-caption text-paper/55 tabular-nums">
                    {era.from}–{era.to}
                  </span>
                </span>
                <span className="shrink-0 font-sans text-caption text-paper/55 tabular-nums">
                  {count}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
