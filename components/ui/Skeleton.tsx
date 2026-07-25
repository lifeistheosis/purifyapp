import { cn } from "@/lib/cn";

/**
 * Loading placeholders.
 *
 * Every route `loading.tsx` used to hand-roll these as `bg-paper/10
 * animate-pulse` divs, which meant seven slightly different greys, seven
 * slightly different radii, and a pulse that kept beating while the real
 * content faded in over the top of it.
 *
 * The register here is the one the rest of the app uses: a `.cascade`, so
 * skeleton rows arrive in reading order exactly the way the real rows will,
 * and the swap from placeholder to content is a change of contents rather
 * than a change of behaviour. Three weights, matching the existing usage:
 *
 *   strong — headings, primary lines, avatars
 *   mid    — secondary lines
 *   faint  — body copy, tertiary meta
 *
 * `animate-pulse` is kept (it is what says "waiting" rather than "empty")
 * and Tailwind already suppresses it under `prefers-reduced-motion`.
 */

type Weight = "strong" | "mid" | "faint";

const WEIGHT: Record<Weight, string> = {
  strong: "bg-paper/10",
  mid: "bg-paper/8",
  faint: "bg-paper/6",
};

export function Skeleton({
  className,
  weight = "mid",
  rounded = "rounded",
}: {
  className?: string;
  weight?: Weight;
  /** Radius utility. Pass `rounded-full` for avatars, `rounded-pill` for
   * search fields, `rounded-lg` for cards. */
  rounded?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(WEIGHT[weight], rounded, "animate-pulse", className)}
    />
  );
}

/**
 * A run of text lines. The last line is short, the way a real paragraph
 * ends, which is most of what makes a text skeleton read as text.
 */
export function SkeletonText({
  lines = 3,
  className,
  weight = "faint",
}: {
  lines?: number;
  className?: string;
  weight?: Weight;
}) {
  return (
    <div className={cn("cascade space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          weight={weight}
          className={cn("h-4", i === lines - 1 ? "w-[62%]" : "w-full")}
        />
      ))}
    </div>
  );
}

/**
 * The list-row placeholder used by the saints, councils and history
 * loading states: a round icon, two lines, a chevron slot.
 */
export function SkeletonRow({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-lg border border-white/8 p-4",
        className,
      )}
    >
      <Skeleton weight="strong" rounded="rounded-full" className="h-12 w-12 shrink-0" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton weight="strong" className="h-4 w-[70%]" />
        <Skeleton weight="faint" className="h-3 w-[45%]" />
      </div>
      <Skeleton weight="faint" rounded="rounded-full" className="h-7 w-7 shrink-0" />
    </div>
  );
}

/**
 * `n` list rows, cascaded. Use for any route whose body is a vertical
 * list; the cascade means the placeholders arrive the same way the real
 * rows will, so the handoff is invisible.
 */
export function SkeletonList({
  rows = 6,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("cascade space-y-3", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}
