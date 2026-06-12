import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Quiet "prayer-book" layout primitives, shared across the whole prayer
 * section so the register stays consistent.
 *
 * The vocabulary, deliberately restrained:
 *   - a narrow reading measure with generous breathing room,
 *   - hairline rules instead of glowing gold-bordered hover cards,
 *   - gold reserved for one thin masthead rule and small accents,
 *   - serif for the sacred, low-contrast sans for labels.
 *
 * It reads like a book of prayers, not a landing page. All pieces are
 * server components; interactive bits live in their own client islands.
 */

const WIDTHS = {
  reading: "max-w-[620px]",
  index: "max-w-[680px]",
} as const;

export function PrayerPage({
  children,
  width = "index",
  className,
  backdrop,
}: {
  children: ReactNode;
  width?: keyof typeof WIDTHS;
  className?: string;
  /**
   * Optional full-bleed node rendered behind the content — e.g. a faint
   * crossfading wash of prayer icons. Kept low and fading into the night so
   * the page still reads like a book, not a hero.
   */
  backdrop?: ReactNode;
}) {
  return (
    <section
      className={cn(
        "relative isolate overflow-hidden bg-night min-h-screen",
        className,
      )}
    >
      {backdrop}
      <div
        className={cn(
          "relative z-10 mx-auto w-full px-6 md:px-8 py-16 md:py-24",
          WIDTHS[width],
        )}
      >
        {children}
      </div>
    </section>
  );
}

/**
 * Calm page masthead. A small eyebrow, a restrained serif title (never the
 * 56px display face), an optional scripture line in italic, a single thin
 * gold rule, and an optional intro paragraph.
 */
export function PrayerMasthead({
  eyebrow,
  title,
  scripture,
  intro,
  align = "left",
  children,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  scripture?: ReactNode;
  intro?: ReactNode;
  align?: "left" | "center";
  /** Optional slot above the eyebrow — typically a single small icon. */
  children?: ReactNode;
}) {
  const centered = align === "center";
  return (
    <header className={cn("mb-12 md:mb-16", centered && "text-center")}>
      {children && (
        <div className={cn("mb-7", centered && "flex justify-center")}>
          {children}
        </div>
      )}
      {eyebrow && (
        <p className="font-sans text-eyebrow uppercase tracking-[2.5px] text-paper/40 mb-5">
          {eyebrow}
        </p>
      )}
      <h1 className="font-serif text-title md:text-heading leading-[1.15] tracking-[-0.01em] text-paper">
        {title}
      </h1>
      {scripture && (
        <p className="mt-4 font-serif italic text-detail text-paper/45">
          {scripture}
        </p>
      )}
      <div
        aria-hidden
        className={cn("mt-7 h-px w-10 bg-gold/50", centered && "mx-auto")}
      />
      {intro && (
        <div className="mt-7 font-serif text-body text-paper/70 leading-[1.8]">
          {intro}
        </div>
      )}
    </header>
  );
}

/** Small uppercase group label sitting above a run of index rows. */
export function PrayerSectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="font-sans text-eyebrow uppercase tracking-[2.5px] text-paper/40 mb-1 mt-14 first:mt-0">
      {children}
    </p>
  );
}

/** Hairline-ruled list container for index rows. */
export function PrayerIndex({ children }: { children: ReactNode }) {
  return <ul className="border-t border-paper/10">{children}</ul>;
}

/**
 * A single quiet index row: serif title, optional one-line description and
 * meta, a faint arrow that warms to gold on hover. No fills, no borders but
 * the hairline that separates rows.
 */
export function PrayerIndexRow({
  href,
  title,
  description,
  meta,
  planned = false,
  plannedLabel = "Planned",
}: {
  href: string;
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  /**
   * A surface we have not yet seeded with verbatim text. Rendered as a quiet,
   * non-interactive row labeled "Planned" — surfaced honestly, never filled
   * with invented prayers (the project's content-integrity rule).
   */
  planned?: boolean;
  plannedLabel?: ReactNode;
}) {
  if (planned) {
    return (
      <li className="border-b border-paper/10">
        <div className="flex items-baseline gap-5 py-5 md:py-6">
          <div className="min-w-0 flex-1">
            <h2 className="font-serif text-title-sm text-paper/45 leading-snug">
              {title}
            </h2>
            {description && (
              <p className="mt-1.5 font-sans text-detail text-paper/55 leading-[1.6]">
                {description}
              </p>
            )}
          </div>
          <span className="shrink-0 font-sans text-eyebrow uppercase tracking-[1.5px] text-paper/30">
            {plannedLabel}
          </span>
        </div>
      </li>
    );
  }
  return (
    <li className="border-b border-paper/10">
      <Link href={href} className="group flex items-baseline gap-5 py-5 md:py-6">
        <div className="min-w-0 flex-1">
          <h2 className="font-serif text-title-sm text-paper/90 group-hover:text-paper leading-snug transition-colors">
            {title}
          </h2>
          {description && (
            <p className="mt-1.5 font-sans text-detail text-paper/50 leading-[1.6]">
              {description}
            </p>
          )}
        </div>
        {meta && (
          <span className="shrink-0 font-sans text-caption text-paper/55 tabular-nums">
            {meta}
          </span>
        )}
        <span
          aria-hidden
          className="shrink-0 self-center font-serif text-lede text-paper/25 transition-all duration-200 group-hover:text-gold/70 group-hover:translate-x-0.5"
        >
          →
        </span>
      </Link>
    </li>
  );
}

/** Faint closing note (sourcing, help-wanted, sign-in nudge). */
export function PrayerNote({ children }: { children: ReactNode }) {
  return (
    <p className="mt-14 font-sans text-caption text-paper/55 leading-[1.7]">
      {children}
    </p>
  );
}
