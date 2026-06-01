import * as React from "react";
import { cn } from "@/lib/cn";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "w-full bg-paper border border-line rounded-pill px-5 py-3",
        "font-sans text-body leading-[1.55] text-ink placeholder:text-ink-mute",
        "transition-[border-color,box-shadow] duration-150 ease",
        "focus:outline-none focus:border-accent focus:ring-[3px] focus:ring-accent/15",
        className,
      )}
      {...props}
    />
  );
}
