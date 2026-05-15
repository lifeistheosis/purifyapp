import * as React from "react";
import { cn } from "@/lib/cn";

type Variant = "free" | "paid" | "verified" | "neutral";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: Variant;
};

const variants: Record<Variant, string> = {
  free: "bg-paper/10 text-paper border-paper/20",
  paid: "bg-accent/15 text-accent border-accent/40",
  verified: "bg-grad-teal/15 text-grad-teal border-grad-teal/40",
  neutral: "bg-paper/5 text-paper/70 border-paper/15",
};

export function Badge({
  variant = "neutral",
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill border px-3 py-1 font-sans text-[12px] font-semibold uppercase tracking-[1.2px]",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
