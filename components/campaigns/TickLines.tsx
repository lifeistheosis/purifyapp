"use client";

import type { ReactNode } from "react";

import { Check } from "@/components/ui/icons/Check";

/**
 * One choice among a few, each a line to tick in a lit panel: how long a
 * campaign runs, what it is for, its psalm, how long a reader carries it, the
 * reason on a report (1.9). Drawn as the prayers to tick are
 * (components/prayers/PlaceChips.tsx), which the owner picked over a cloud of
 * pills (2026-10-29: never pills for a choice). There several may be ticked;
 * here one is, so it is a radio group to a screen reader and to the arrow
 * keys of a keyboard.
 */
export function TickLines<T extends string | number>({
  value,
  options,
  onChange,
  labelledBy,
}: {
  value: T | null;
  options: readonly { id: T; label: string; desc?: ReactNode }[];
  onChange: (next: T) => void;
  /** The id of the line that names the choice. */
  labelledBy: string;
}) {
  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className="set-panel">
      {options.map((o, i) => {
        const on = o.id === value;
        return (
          <button
            key={String(o.id)}
            type="button"
            role="radio"
            aria-checked={on}
            // One stop for the keyboard: the ticked line, or the first.
            tabIndex={on || (value === null && i === 0) ? 0 : -1}
            onClick={() => onChange(o.id)}
            onKeyDown={(e) => {
              const step = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
              if (!step) return;
              e.preventDefault();
              const next = options[(i + step + options.length) % options.length];
              onChange(next.id);
              const lines = e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
              lines?.[(i + step + options.length) % options.length]?.focus();
            }}
            className="set-link flex min-h-12 w-full items-center gap-3 px-4 py-2.5 text-start"
          >
            <span aria-hidden className="rule-tick" data-on={on ? "" : undefined}>
              {on ? <Check size={12} /> : null}
            </span>
            <span className="min-w-0 flex-1">
              <span className="set-label">{o.label}</span>
              {o.desc ? <span className="set-desc">{o.desc}</span> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * One line to tick, on its own: the family's blessing and the rules when a
 * campaign is started, and the two lines a picture needs
 * (components/campaigns/CampaignPictures.tsx).
 */
export function TickBox({ on, onChange, children }: { on: boolean; onChange: (next: boolean) => void; children: ReactNode }) {
  return (
    <button type="button" role="checkbox" aria-checked={on} onClick={() => onChange(!on)} className="flex min-h-11 w-full items-start gap-3 py-2 text-start">
      <span aria-hidden className="rule-tick mt-0.5" data-on={on ? "" : undefined}>
        {on ? <Check size={12} /> : null}
      </span>
      <span className="min-w-0 flex-1 font-sans text-detail leading-relaxed text-paper/85">{children}</span>
    </button>
  );
}
