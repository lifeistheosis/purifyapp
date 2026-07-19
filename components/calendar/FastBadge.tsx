"use client";

import type { FastingStatus } from "@/lib/calendar/orthodox";
import { FAST_META } from "./fastMeta";
import { cn } from "@/lib/cn";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * A small tablet showing the day's fast: bespoke icon + label, optionally the
 * one-line rule. Tinted by the fast's own colour (paired with icon + text, so
 * colour is never the sole signal). Client so label/rule resolve from the
 * catalog via the fast's stable ruleId and follow native locale switches.
 */
export function FastBadge({
  fast,
  showRule = true,
  className,
}: {
  fast: FastingStatus;
  showRule?: boolean;
  className?: string;
}) {
  const { t } = useTranslate();
  const meta = FAST_META[fast.kind];
  const Icon = meta.Icon;
  return (
    <div
      className={cn(
        "rounded-md border px-4 py-3",
        className,
      )}
      style={{
        borderColor: `rgb(${meta.rgb} / 0.35)`,
        backgroundColor: `rgb(${meta.rgb} / 0.08)`,
      }}
    >
      <div className="flex items-center gap-2.5">
        {Icon ? (
          <span style={{ color: `rgb(${meta.rgb})` }} className="shrink-0">
            <Icon size={20} />
          </span>
        ) : null}
        <p
          className="font-sans text-ui font-semibold leading-tight"
          style={{ color: `rgb(${meta.rgb})` }}
        >
          {t(`calendar.fast.${fast.ruleId}.label`)}
        </p>
      </div>
      {showRule && (
        <p className="mt-1.5 font-sans text-caption text-paper/70 leading-[1.5]">
          {t(`calendar.fast.${fast.ruleId}.rule`)}
        </p>
      )}
    </div>
  );
}
