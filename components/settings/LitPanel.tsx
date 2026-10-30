"use client";

// The material Settings is made of (1.8): the owner's pick A of round 3,
// "Lit panels" (Homebase/boards/purify-master/variants/r3-01-settings, locked
// 2026-10-30), from his note 9 of build 80: the screen "feels vibe coded,
// like clicking buttons on a screen", and he wanted more texture and depth.
//
//   - Each group is a raised panel lit from above, with a fine grain.
//   - Each row is led by its own glyph on a lit plate.
//   - Every choice is a carved track, the chosen one raised and glowing.
//   - On and off is a switch.
//
// Every change is still one tap. The look is app/globals.css, "Settings: lit
// panels", on the page's tokens, so every palette carries it.

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { cn } from "@/lib/cn";

export function Section({
  id,
  title,
  hint,
  children,
}: {
  /** Lets the app-wide search open this screen at the section: its rows for
   *  settings point at /settings#<id> (lib/search/buildCorpus.ts). */
  id?: string;
  /** Left out for a group that is one row and says what it is: Sign out. */
  title?: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    // scroll-mt clears the bar fixed to the top of a phone.
    <section id={id} className="mt-7 scroll-mt-24 first:mt-0">
      {title ? <h2 className="set-h">{title}</h2> : null}
      {hint ? <p className="set-hint">{hint}</p> : null}
      <div className={cn("set-panel", (title || hint) && "mt-3")}>{children}</div>
    </section>
  );
}

/** A row's glyph, on its lit plate. Decoration: the row's words name it. */
export function Plate({ children }: { children: ReactNode }) {
  return (
    <span aria-hidden className="set-plate">
      {children}
    </span>
  );
}

/**
 * A row: its plate, its name and a line under it, and what it holds. A
 * switch sits beside the name (`control`); a track, the pages or the cards
 * go under it (`children`), and under those, in italic, what the choice
 * means (`sub`).
 */
export function Row({
  icon,
  label,
  description,
  control,
  sub,
  children,
}: {
  icon?: ReactNode;
  label: ReactNode;
  description?: ReactNode;
  control?: ReactNode;
  sub?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="set-row">
      <div className="set-lab">
        {icon ? <Plate>{icon}</Plate> : null}
        <div className="min-w-0 flex-1">
          <p className="set-label">{label}</p>
          {description ? <p className="set-desc">{description}</p> : null}
        </div>
        {control}
      </div>
      {children}
      {sub ? <p className="set-sub">{sub}</p> : null}
    </div>
  );
}

/** A row that opens a screen of its own. */
export function LinkRow({
  href,
  icon,
  label,
  description,
}: {
  href: string;
  icon?: ReactNode;
  label: ReactNode;
  description?: ReactNode;
}) {
  return (
    <Link href={href} className="set-row set-link">
      <div className="set-lab">
        {icon ? <Plate>{icon}</Plate> : null}
        <div className="min-w-0 flex-1">
          <p className="set-label">{label}</p>
          {description ? <p className="set-desc">{description}</p> : null}
        </div>
        <ChevronRight size={15} className="set-chev rtl:-scale-x-100" />
      </div>
    </Link>
  );
}

/** A row that does something here, drawn as a LinkRow is. */
export function ButtonRow({
  icon,
  label,
  description,
  onClick,
  disabled = false,
}: {
  icon?: ReactNode;
  label: ReactNode;
  description?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="set-row set-link w-full text-start">
      <span className="set-lab">
        {icon ? <Plate>{icon}</Plate> : null}
        <span className="min-w-0 flex-1">
          <span className="set-label">{label}</span>
          {description ? <span className="set-desc">{description}</span> : null}
        </span>
        <ChevronRight size={15} className="set-chev rtl:-scale-x-100" />
      </span>
    </button>
  );
}

export type TrackOption<T extends string> = {
  value: T;
  label: string;
  /** Drawn in place of the label, which then names it to a screen reader (the faces' "Aa"). */
  face?: ReactNode;
};

/**
 * A carved track of choices, one of them raised and lit. Null when never
 * answered: then none is raised. More than three wrap into rows of `cols`.
 */
export function Track<T extends string>({
  value,
  options,
  onChange,
  label,
  cols,
  faces = false,
}: {
  value: T | null;
  options: readonly TrackOption<T>[];
  onChange: (v: T) => void;
  label: string;
  cols?: number;
  /** The tall track whose choices draw themselves (Reader font). */
  faces?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="set-track"
      data-faces={faces ? "" : undefined}
      style={{ "--set-cols": cols ?? options.length } as CSSProperties}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className="hit-44"
        >
          {o.face ?? o.label}
        </button>
      ))}
    </div>
  );
}

/** On and off. Named by the row it sits in. */
export function Switch({ on, onChange, label }: { on: boolean; onChange: (on: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className="set-switch hit-44"
    >
      <span aria-hidden className="set-switch-knob" />
    </button>
  );
}
