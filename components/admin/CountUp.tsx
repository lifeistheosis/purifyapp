"use client";

// Animated number that eases up from 0 to `value` over `duration` ms when
// it first mounts (or when `value` changes by more than 1). Falls back to
// the static number if the user prefers reduced motion. Drops in anywhere
// a plain number would render, so StatCard / KpiCard / inline displays all
// pick up the polish without changes to their layout.

import { useEffect, useRef, useState } from "react";

import { prefersReducedMotion } from "@/lib/ui/motion";

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// Format with thousands separators + preserve a string passthrough so
// callers can render "—" or other placeholder values without animating.
function fmt(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return Math.round(n).toLocaleString();
}

export function CountUp({
  value,
  duration = 700,
  className,
}: {
  value: number | string;
  duration?: number;
  className?: string;
}) {
  // Non-numeric (placeholder like "—") passes through untouched.
  const isNumeric = typeof value === "number" && Number.isFinite(value);
  const target = isNumeric ? (value as number) : 0;

  const [display, setDisplay] = useState<number>(target);
  const rafRef = useRef<number | null>(null);
  const lastTargetRef = useRef<number>(target);

  useEffect(() => {
    if (!isNumeric) return;
    const from = lastTargetRef.current;
    // Snap when reduced motion is preferred or when the change is so small
    // that animating it would just be jitter (off-by-one polling churn).
    const snap =
      prefersReducedMotion() || Math.abs(target - from) <= 1;
    const totalMs = snap ? 0 : duration;
    const start = performance.now();

    function tick(now: number) {
      const t = totalMs === 0 ? 1 : Math.min(1, (now - start) / totalMs);
      const eased = easeOutCubic(t);
      setDisplay(from + (target - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        lastTargetRef.current = target;
        rafRef.current = null;
      }
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, isNumeric, duration]);

  if (!isNumeric) return <span className={className}>{String(value)}</span>;
  return <span className={className}>{fmt(display)}</span>;
}
