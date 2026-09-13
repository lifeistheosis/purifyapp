"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { authorMarkLabelKey, type AuthorMark } from "@/lib/community/authorMark";
import { cn } from "@/lib/cn";

/**
 * The supporter mark beside a subscriber's name in the community.
 *
 * Plus is a single small gold cross. Pro is the same cross inside a thin
 * red ring. Nothing else: no glow, no animation, no number, because the
 * mark says "this reader keeps the work going" and must not turn into a
 * rank. Derived from entitlements on the server and gone the moment the
 * period ends (lib/community/authorMark.ts); this component only draws
 * what it is handed.
 *
 * Drawn in-house, like the verified tick: the cross is two strokes and the
 * ring is a circle, both in palette tokens so every reading palette,
 * Parchment included, gets a readable mark without a variant per theme.
 * The gold is --color-festal, the real liturgical gold, rather than
 * --color-gold, which despite its name is a near-white grey on the default
 * surface and would draw a white cross.
 *
 * Same contract as VerifiedBadge: role="img" with the label from i18n so
 * the meaning is spoken and not only seen, the SVG aria-hidden so it is
 * spoken once, NOT focusable because a row of dead tab stops down a feed
 * helps nobody, and a tooltip that repeats the label on fine pointers only,
 * because on a touch screen :hover is summoned by a tap and never dismissed.
 *
 * Renders nothing for a null tier, so call sites can pass the payload value
 * straight through.
 */
export function SupporterMark({
  tier,
  size = 15,
}: {
  tier: AuthorMark | undefined;
  size?: number;
}) {
  const { t } = useTranslate();
  const key = authorMarkLabelKey(tier);
  if (!key) return null;
  const label = t(key);
  const pro = tier === "pro";

  return (
    <span
      className="supporter-mark-wrap relative inline-flex shrink-0 items-center align-middle"
      role="img"
      aria-label={label}
      data-tier={tier}
    >
      <svg
        className={cn("supporter-mark", pro && "supporter-mark-pro")}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        {pro ? (
          <circle
            cx="12"
            cy="12"
            r="10.75"
            fill="none"
            stroke="var(--color-crimson)"
            strokeWidth="1.5"
          />
        ) : null}
        {/*
          A plain cross, upright bar and one crossbar above centre. At 15px
          the strokes are about 1.5 device pixels on a 1x screen, which is
          the thinnest that still reads as gold rather than as a smudge.
        */}
        <path
          d={pro ? "M12 6.2v11.6M8.4 9.6h7.2" : "M12 3.6v16.8M6.8 8.6h10.4"}
          fill="none"
          stroke="var(--color-festal)"
          strokeWidth={pro ? 2.2 : 2.6}
          strokeLinecap="round"
        />
      </svg>

      {/*
        aria-hidden because the wrapper already carries the same words as
        its label; otherwise a screen reader says "Supporter" twice.
      */}
      <span
        aria-hidden="true"
        className="supporter-tip absolute left-1/2 top-full z-20 mt-2 whitespace-nowrap rounded-md border border-paper/15 bg-night-soft px-2.5 py-1 font-sans text-eyebrow font-medium text-paper shadow-lg"
      >
        {label}
      </span>
    </span>
  );
}
