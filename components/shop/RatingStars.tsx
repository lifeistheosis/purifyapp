"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Star } from "@/components/ui/icons/Star";
import { cn } from "@/lib/cn";

/**
 * Read-only star rating. Renders five glyphs filled to the rounded average,
 * with an optional "4.5 (12)" tail. Presentational; it reads the live
 * catalog, so it renders inside client components only.
 */
export function RatingStars({
  avg,
  count,
  showCount = true,
  className,
}: {
  avg: number | null;
  count: number;
  showCount?: boolean;
  className?: string;
}) {
  const { t, tn } = useTranslate();
  const filled = Math.round(avg ?? 0);
  const label =
    avg != null
      ? tn("shop.ratedOutOfFive", count, { avg: avg.toFixed(1) })
      : t("shop.noReviewsYet");

  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      aria-label={label}
    >
      <span aria-hidden className="inline-flex items-center gap-[1px] leading-none">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            size={13}
            filled={i <= filled}
            className={i <= filled ? "text-paper" : "text-paper/30"}
          />
        ))}
      </span>
      {showCount ? (
        <span className="font-sans text-caption text-paper/55">
          {avg != null ? `${avg.toFixed(1)} (${count})` : t("shop.noReviewsYet")}
        </span>
      ) : null}
    </span>
  );
}
