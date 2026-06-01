import type { FastKind } from "@/lib/calendar/orthodox";
import { FAST_META } from "./fastMeta";
import { cn } from "@/lib/cn";

/**
 * A small tablet showing the day's fast: bespoke icon + label, optionally the
 * one-line rule. Tinted by the fast's own colour (paired with icon + text, so
 * colour is never the sole signal).
 */
export function FastBadge({
  kind,
  label,
  rule,
  className,
}: {
  kind: FastKind;
  label: string;
  rule?: string;
  className?: string;
}) {
  const meta = FAST_META[kind];
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
          {label}
        </p>
      </div>
      {rule && (
        <p className="mt-1.5 font-sans text-caption text-paper/70 leading-[1.5]">
          {rule}
        </p>
      )}
    </div>
  );
}
