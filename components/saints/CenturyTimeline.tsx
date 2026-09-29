"use client";

// The century filter as a timeline: one column per century from the first to
// the twenty-first, its bar as tall as the number of saints in it.
//
// It replaced twenty-two chips (2026-09-28, the owner's "optimize the by kind
// and by century filters"), which wrapped into two rows on an iPad and said
// less: the bars show at a glance where the saints gather (the fourth
// century, the twentieth) as well as filtering. Every column stays in place
// as the other filter narrows the counts, so the timeline never reflows under
// a finger; an empty century is dimmed and cannot be chosen.
//
// Heights follow the square root of the count, so a century with one saint
// still shows a bar beside one with thirty-three.

import { centuryLabel } from "@/lib/saints/saints";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";

const FIRST = 1;
const LAST = 21;
const BAR_MAX = 56;
const BAR_MIN = 6;

export function CenturyTimeline({
  counts,
  active,
  onSelect,
  label,
}: {
  /** Saints per century under the other active filter. */
  counts: Map<number, number>;
  active: number | null;
  onSelect: (century: number | null) => void;
  /** Names the group for assistive technology, e.g. "By century". */
  label: string;
}) {
  const { tn } = useTranslate();
  const last = Math.max(LAST, ...counts.keys());
  const centuries = Array.from({ length: last - FIRST + 1 }, (_, i) => FIRST + i);
  const max = Math.max(1, ...counts.values());

  return (
    <div className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none] md:-mx-8 md:px-8 lg:mx-0 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
      <div role="group" aria-label={label} className="flex min-w-[640px] items-stretch gap-1 lg:min-w-0">
        {centuries.map((c) => {
          const n = counts.get(c) ?? 0;
          const on = active === c;
          const height = n === 0 ? 3 : BAR_MIN + Math.round((BAR_MAX - BAR_MIN) * Math.sqrt(n / max));
          return (
            <button
              key={c}
              type="button"
              disabled={n === 0}
              aria-pressed={on}
              aria-label={`${centuryLabel(c)}, ${tn("saints.saintCount", n)}`}
              title={`${centuryLabel(c)} · ${n}`}
              onClick={() => onSelect(on ? null : c)}
              className={cn(
                "group flex min-h-11 min-w-0 flex-1 flex-col items-center justify-end gap-1.5 rounded-xl px-0.5 pb-1.5 pt-2 transition-colors duration-150",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper",
                "disabled:cursor-default",
                on ? "bg-paper/[0.08]" : "enabled:hover:bg-paper/[0.05]",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "font-sans text-[11px] font-medium leading-none tabular-nums transition-colors",
                  on ? "text-paper" : n === 0 ? "text-transparent" : "text-paper/45 group-hover:text-paper/70",
                )}
              >
                {n}
              </span>
              <span
                aria-hidden
                className={cn(
                  "w-full max-w-[22px] rounded-t-[6px] rounded-b-[2px] transition-colors duration-150",
                  on ? "bg-paper" : n === 0 ? "bg-paper/[0.08]" : "bg-paper/25 group-hover:bg-paper/45",
                )}
                style={{ height }}
              />
              <span
                aria-hidden
                className={cn(
                  "font-sans text-[11px] font-semibold leading-none tabular-nums transition-colors",
                  on ? "text-paper" : n === 0 ? "text-paper/20" : "text-paper/55",
                )}
              >
                {c}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
