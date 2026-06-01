import { Cross } from "@/components/ui/icons/Cross";
import { cn } from "@/lib/cn";

/**
 * A gold small-caps eyebrow led by a small three-bar Cross. Replaces the bare
 * uppercase-tracked label used throughout the old calendar.
 */
export function SectionLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "inline-flex items-center gap-2 font-sans text-eyebrow font-semibold uppercase tracking-[2px] text-gold/75",
        className,
      )}
    >
      <Cross size={13} className="text-gold/70" />
      <span>{children}</span>
    </p>
  );
}
