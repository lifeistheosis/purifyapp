"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * Renders a button-styled card that points at an unreleased feature.
 * Same crossfade pattern as ComingSoonCTA, but for full-width card targets
 * (e.g. the 4 cards on /marketplace) rather than pill buttons.
 */
export function ComingSoonLink({
  children,
  className,
  revertMs = 2200,
  ariaLabel,
}: {
  children: React.ReactNode;
  className?: string;
  revertMs?: number;
  ariaLabel?: string;
}) {
  const [shown, setShown] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function onClick() {
    setShown(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setShown(false), revertMs);
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-live="polite"
      className={cn(
        "relative text-left w-full cursor-pointer block",
        "focus-visible:outline-2 focus-visible:outline-paper focus-visible:outline-offset-[3px]",
        className,
      )}
    >
      <div
        className={cn(
          "transition-opacity duration-200",
          shown ? "opacity-0" : "opacity-100",
        )}
      >
        {children}
      </div>
      <div
        aria-hidden={!shown}
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-opacity duration-200 pointer-events-none rounded-lg",
          shown ? "opacity-100" : "opacity-0",
        )}
        style={{ background: "rgba(22, 18, 25, 0.92)" }}
      >
        <span className="font-sans text-ui font-semibold uppercase tracking-[1.5px] text-paper">
          Coming soon
        </span>
      </div>
    </button>
  );
}
