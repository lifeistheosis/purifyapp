import { cn } from "@/lib/cn";

/**
 * The one progress bar.
 *
 * There were five hand-rolled bars before this, in two techniques. Two of
 * them animated `width`, which is not compositor-accelerated: every frame
 * forces a layout, and on the Android WebView a bar that ticks with a
 * scroll or an audio position is the worst place to pay that. Two animated
 * `transform: scaleX`, which is free. One had no transition at all and
 * jumped. None of the five carried `role="progressbar"`, so a screen reader
 * was told nothing about any of them.
 *
 * This is the scaleX version, with the ARIA, and with the movement removed
 * for readers who ask for reduced motion (the fill still lands in the right
 * place, it just gets there in one frame).
 *
 * `value` is a fraction from 0 to 1, clamped here so a caller cannot
 * overshoot the track. Callers that think in percentages should divide.
 */
export function ProgressBar({
  value,
  label,
  height = 2,
  tone = "gold",
  durationMs = 300,
  className,
  trackClassName,
}: {
  /** 0 to 1. Values outside the range are clamped, not scaled. */
  value: number;
  /**
   * Accessible name. Omit ONLY when the bar is decorative and its progress
   * is already stated in text next to it, in which case it renders
   * aria-hidden rather than as an unnamed progressbar.
   */
  label?: string;
  /** Track height in px. */
  height?: number;
  tone?: "gold" | "paper" | "accent";
  /**
   * How long the fill takes to reach a new value. The default suits a bar
   * that steps (a rule advancing, a goal updating). A bar driven by scroll
   * or by audio position should pass something shorter, around 150, or it
   * visibly lags the thing it is reporting.
   */
  durationMs?: number;
  className?: string;
  trackClassName?: string;
}) {
  const clamped = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
  const percent = Math.round(clamped * 100);

  const fillTone =
    tone === "paper" ? "bg-paper" : tone === "accent" ? "bg-accent" : "bg-gold";

  return (
    <div
      {...(label
        ? {
            role: "progressbar",
            "aria-label": label,
            "aria-valuenow": percent,
            "aria-valuemin": 0,
            "aria-valuemax": 100,
          }
        : { "aria-hidden": true })}
      className={cn("w-full overflow-hidden bg-white/5", className, trackClassName)}
      style={{ height }}
    >
      <div
        className={cn(
          "h-full origin-left",
          fillTone,
          // transform, never width. See the note at the top of this file.
          // `transition-none` under reduced motion sets transition-property to
          // none, so the inline duration below cannot reinstate the movement.
          "transition-transform ease-out motion-reduce:transition-none",
        )}
        style={{
          transform: `scaleX(${clamped})`,
          transitionDuration: `${durationMs}ms`,
        }}
      />
    </div>
  );
}
