import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Standard mobile card — a rounded rectangle with a small eyebrow, an
 * optional title, a body, and an optional action footer. Used everywhere
 * across the mobile shells (Today, Bible, Discover, Prayers, You) so a
 * tweak here propagates.
 *
 * The whole card can be a link (`href`) — set it and the card behaves as
 * a tap target. Action-footer rows still pass clicks through normally
 * because React synthetic events bubble cleanly even inside a Link.
 */
export function MobileCard({
  eyebrow,
  title,
  href,
  children,
  footer,
  tint = "default",
  className,
}: {
  eyebrow?: ReactNode;
  title?: ReactNode;
  href?: string;
  children?: ReactNode;
  footer?: ReactNode;
  /** Visual variant. "warm" adds a rubric-red radial bleed (verse-style). */
  tint?: "default" | "warm" | "gold";
  className?: string;
}) {
  const Outer = href ? Link : "article";
  const props = href ? { href } : {};
  const bg =
    tint === "warm"
      ? "radial-gradient(120% 80% at 80% 90%, rgba(193,39,45,0.18) 0%, transparent 60%), linear-gradient(180deg, #18120f 0%, #0a0606 100%)"
      : tint === "gold"
        ? "radial-gradient(120% 80% at 20% 0%, rgba(183,176,163,0.10) 0%, transparent 60%), linear-gradient(180deg, #16131a 0%, #0a0810 100%)"
        : undefined;
  return (
    <Outer
      {...(props as { href: string })}
      className={cn(
        "relative block overflow-hidden rounded-2xl border border-paper/10 p-4",
        href && "active:scale-[0.995] transition-transform",
        className,
      )}
      style={bg ? { background: bg } : undefined}
    >
      {eyebrow && (
        <p className="font-sans text-caption text-paper/55">{eyebrow}</p>
      )}
      {title && (
        <p className="mt-0.5 font-sans text-body font-bold text-paper leading-tight">
          {title}
        </p>
      )}
      {children}
      {footer && (
        <div className="mt-3 pt-3 border-t border-paper/8">{footer}</div>
      )}
    </Outer>
  );
}
