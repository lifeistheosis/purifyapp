import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The small uppercase section heading used all over /prayers/today.
 *
 * It exists because the page used to label every one of its sections with a
 * `<p>`, so a screen reader met one `<h1>` and then eight unheaded blocks.
 * Turning those into real headings is the whole point of this component.
 *
 * The inline `fontFamily` is NOT a style preference and must not be replaced
 * with a `font-sans` utility. app/globals.css sets
 *
 *   h1, h2, h3, h4, h5, h6 { font-family: var(--font-heading); font-weight: 700 }
 *
 * UNLAYERED, on purpose, so it beats anything in `@layer utilities`. An
 * `<h2 className="font-sans">` therefore still renders as bold Lora, and an
 * 11px uppercase serif eyebrow looks like a mistake. The inline style is the
 * only thing that wins.
 *
 * No "use client": it has no hooks, so server components (OnThisDayHistory)
 * can render it too.
 */
export function TodayHeading({
  id,
  level = 2,
  tone = "paper",
  className,
  children,
}: {
  id?: string;
  level?: 2 | 3;
  /** `gold` marks the reader's own sections apart from the Church's. */
  tone?: "paper" | "gold";
  className?: string;
  children: ReactNode;
}) {
  const Tag = level === 2 ? "h2" : "h3";
  return (
    <Tag
      id={id}
      style={{ fontFamily: "var(--font-sans)", fontWeight: 600 }}
      className={cn(
        "font-sans text-eyebrow uppercase tracking-[2px]",
        tone === "gold" ? "text-gold/80" : "text-paper/60",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
