import { cn } from "@/lib/cn";

/**
 * Read-only star rating. Renders five glyphs filled to the rounded average,
 * with an optional "4.5 (12)" tail. Presentational and server-safe.
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
  const filled = Math.round(avg ?? 0);
  const label =
    avg != null
      ? `Rated ${avg.toFixed(1)} out of 5 from ${count} ${count === 1 ? "review" : "reviews"}`
      : "No reviews yet";

  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      aria-label={label}
    >
      <span aria-hidden className="inline-flex leading-none tracking-[1px]">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={i <= filled ? "text-gold" : "text-paper/25"}>
            ★
          </span>
        ))}
      </span>
      {showCount ? (
        <span className="font-sans text-caption text-paper/55">
          {avg != null ? `${avg.toFixed(1)} (${count})` : "No reviews yet"}
        </span>
      ) : null}
    </span>
  );
}
