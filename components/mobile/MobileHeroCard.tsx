import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tint = "warm" | "deep" | "violet" | "gold";

// Grayscale scheme: every tint is now a neutral gradient with a soft
// white bleed, graded only by elevation so each tab's hero still has a
// subtly distinct weight without colour.
const BACKDROPS: Record<Tint, string> = {
  warm:
    "radial-gradient(120% 80% at 80% 90%, rgba(255,255,255,0.07) 0%, transparent 60%), linear-gradient(180deg, #1f1f22 0%, #101013 100%)",
  deep:
    "radial-gradient(120% 80% at 80% 90%, rgba(255,255,255,0.10) 0%, transparent 60%), linear-gradient(180deg, #1c1c1f 0%, #0d0d10 100%)",
  violet:
    "radial-gradient(120% 80% at 80% 90%, rgba(255,255,255,0.07) 0%, transparent 60%), linear-gradient(180deg, #202023 0%, #111114 100%)",
  gold:
    "radial-gradient(120% 80% at 20% 0%, rgba(255,255,255,0.09) 0%, transparent 60%), linear-gradient(180deg, #1e1e21 0%, #111114 100%)",
};

const WAVE_FILLS: Record<Tint, string> = {
  warm: "rgba(16,16,19,0.85)",
  deep: "rgba(13,13,16,0.85)",
  violet: "rgba(17,17,20,0.85)",
  gold: "rgba(17,17,20,0.85)",
};

/**
 * Bespoke "lead" card pattern, extracted from the Today VerseOfDayCard.
 *
 * Sits above the timeline rail on every tab so each tab has a recognisable
 * top-of-page identity. Same dark base + radial-gradient bleed + owned-SVG
 * wave at the lower right, parameterised by `tint` so each tab can carry
 * its own colour mood (warm rust for Bible/Today, cool slate for Discover,
 * violet for You, gold for prayer surfaces).
 *
 * Slots:
 *   - eyebrow: small caption above the kicker / headline
 *   - kicker: small bold line above the headline (citations, dates, names)
 *   - headline: the large serif title (~22px)
 *   - body: longer text below the headline, optionally fades to mask
 *   - aside: right-aligned slot (saint icon, large avatar, decorative icon)
 *   - actions: footer row with the 4-action pattern (favourite/share/more/expand)
 */
export function MobileHeroCard({
  tint = "warm",
  eyebrow,
  kicker,
  headline,
  body,
  bodyFades = false,
  aside,
  actions,
  href,
  className,
}: {
  tint?: Tint;
  eyebrow?: ReactNode;
  kicker?: ReactNode;
  headline: ReactNode;
  body?: ReactNode;
  bodyFades?: boolean;
  aside?: ReactNode;
  actions?: ReactNode;
  href?: string;
  className?: string;
}) {
  const Inner = href ? Link : ("div" as const);
  const innerProps = href ? { href } : {};

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-2xl border border-paper/10 p-5",
        className,
      )}
      style={{ background: BACKDROPS[tint] }}
    >
      <svg
        aria-hidden
        viewBox="0 0 400 200"
        className="pointer-events-none absolute inset-x-0 bottom-0 w-full opacity-50"
        preserveAspectRatio="none"
      >
        <path
          d="M0 160 C 80 120, 160 200, 240 150 S 400 120, 400 160 L 400 200 L 0 200 Z"
          fill={WAVE_FILLS[tint]}
        />
      </svg>

      <Inner {...(innerProps as { href: string })} className="relative block">
        <div className={aside ? "flex items-start gap-4" : ""}>
          <div className={aside ? "min-w-0 flex-1" : ""}>
            {eyebrow && (
              <p className="font-sans text-detail text-paper/65">{eyebrow}</p>
            )}
            {kicker && (
              <p className="mt-0.5 font-sans text-body font-bold text-paper">
                {kicker}
              </p>
            )}
            <h2 className="mt-3 font-serif text-title-sm leading-[1.25] text-paper/95">
              {headline}
            </h2>
            {body && (
              <div
                className="mt-3 font-serif text-body leading-[1.45] text-paper/85"
                style={
                  bodyFades
                    ? {
                        WebkitMaskImage:
                          "linear-gradient(180deg, #000 0%, #000 65%, transparent 100%)",
                        maskImage:
                          "linear-gradient(180deg, #000 0%, #000 65%, transparent 100%)",
                        maxHeight: "180px",
                        overflow: "hidden",
                      }
                    : undefined
                }
              >
                {body}
              </div>
            )}
          </div>
          {aside && <div className="shrink-0">{aside}</div>}
        </div>
      </Inner>

      {actions && <div className="relative">{actions}</div>}
    </article>
  );
}
