import * as React from "react";
import { cn } from "@/lib/cn";

type Variant = "default" | "warm" | "dark";

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: Variant;
};

const variants: Record<Variant, string> = {
  default:
    "bg-paper border border-line shadow-sm hover:shadow-md",
  warm: "bg-paper-warm border border-line hover:shadow-md",
  dark: "bg-night text-paper border-0",
};

export function Card({ variant = "default", className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg p-7 transition-[box-shadow,border-color] duration-200 ease-out",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "font-sans text-title-sm leading-[1.25] font-semibold text-ink mb-2",
        className,
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("font-sans text-body leading-[1.55] text-ink-soft", className)} {...props} />
  );
}
