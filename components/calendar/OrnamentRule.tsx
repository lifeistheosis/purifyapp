import { Cross } from "@/components/ui/icons/Cross";
import { cn } from "@/lib/cn";

/**
 * A bespoke gold ornament rule: a thin fading line on each side of a centered
 * three-bar Cross flanked by two small diamonds. Used as section dividers and
 * to frame the illuminated panels. Colour follows the liturgical `--tone` when
 * `tinted`, else gold. Purely decorative.
 */
export function OrnamentRule({
  className,
  tinted = false,
  crossSize = 16,
}: {
  className?: string;
  tinted?: boolean;
  crossSize?: number;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "flex items-center justify-center gap-2.5",
        tinted ? "" : "text-gold/45",
        className,
      )}
      style={tinted ? { color: "rgb(var(--tone) / 0.55)" } : undefined}
    >
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-current opacity-70" />
      <span className="inline-block h-[5px] w-[5px] rotate-45 bg-current opacity-70" />
      <Cross size={crossSize} />
      <span className="inline-block h-[5px] w-[5px] rotate-45 bg-current opacity-70" />
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-current opacity-70" />
    </div>
  );
}
