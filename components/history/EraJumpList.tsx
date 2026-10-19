"use client";

// The eras as plain buttons, the way between the ages of the Church: in the
// Eras sheet (opened from any era's pinned name) and as the computer's side
// column. Each row wears the timeline's own mark, filled for the era the
// reader is in (1.7), so the list reads as the line seen whole.

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { TimelineNode } from "@/components/ui/icons/TimelineNode";
import { cn } from "@/lib/cn";
import { HISTORY_ERAS, type Era } from "@/lib/history/events";

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
      <ol>
        {HISTORY_ERAS.map((era) => {
          const count = counts[era.id] ?? 0;
          const active = activeEra === era.id;
          return (
            <li key={era.id} aria-current={active ? "true" : undefined}>
              <button
                type="button"
                disabled={count === 0}
                onClick={() => onJump(era.id)}
                className={cn(
                  "tap-press flex w-full min-h-12 items-center gap-3 rounded-[10px] px-1 text-start hover:bg-paper/[0.04] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper",
                  count === 0 && "opacity-35",
                )}
              >
                <span className="history-node shrink-0" data-major={active ? "" : undefined} data-current={active ? "" : undefined}>
                  <TimelineNode />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block truncate font-sans text-ui", active ? "font-semibold text-paper" : "text-paper/80")}>
                    {t(`study.history.era.${era.id}.label`)}
                  </span>
                  <span className="block font-sans text-caption text-paper/55 tabular-nums">
                    {era.from}–{era.to}
                  </span>
                </span>
                <span className="shrink-0 font-sans text-caption text-paper/55 tabular-nums">{count}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
