"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { useTranslate } from "@/components/i18n/MessagesProvider";

type Variant = "primary" | "secondary" | "tertiary" | "ghost" | "inverse";

/**
 * A marketing-page CTA that keeps its label until clicked, then briefly
 * announces "Coming Soon" inline before reverting. Used for hero CTAs that
 * point at features still on the roadmap.
 */
export function ComingSoonCTA({
  children,
  variant = "primary",
  className,
  revertMs = 2200,
}: {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
  revertMs?: number;
}) {
  const { t } = useTranslate();
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
    <Button
      variant={variant}
      onClick={onClick}
      aria-live="polite"
      className={cn("relative", className)}
    >
      <span
        className={cn(
          "inline-block transition-opacity duration-200",
          shown ? "opacity-0" : "opacity-100",
        )}
      >
        {children}
      </span>
      <span
        aria-hidden={!shown}
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-opacity duration-200 pointer-events-none",
          shown ? "opacity-100" : "opacity-0",
        )}
      >
        {t("signin.comingSoon")}
      </span>
    </Button>
  );
}
