import * as React from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "tertiary" | "ghost" | "inverse";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

const base =
  "font-sans text-[15px] leading-none font-medium whitespace-nowrap inline-flex items-center justify-center rounded-pill transition-[background-color,color,box-shadow,transform] duration-200 ease-out cursor-pointer disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-paper px-7 py-3.5 hover:bg-accent-deep active:scale-[0.98]",
  secondary:
    "bg-paper text-ink border border-line px-7 py-3.5 hover:border-ink",
  tertiary:
    "bg-transparent text-accent px-0 py-0 rounded-none hover:text-accent-deep",
  ghost: "bg-transparent text-ink px-5 py-2 hover:bg-paper-warm",
  inverse:
    "bg-paper text-ink px-8 py-4 hover:bg-paper/90 active:scale-[0.98]",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(base, variants[variant], className)}
      {...props}
    />
  );
}
