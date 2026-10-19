"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";

/**
 * The one Plus mark (1.7): a small padlock and "Purify Plus" in a quiet pill,
 * in sentence case and the screen's own ink, never gold.
 *
 * The owner's rule for Plus (2026-09-28, and the 1.4 note before it): a Plus
 * feature is never hidden from a reader without Plus. It is shown with this
 * mark, and using it opens the upgrade sheet named for it
 * (components/billing/UpgradeModal.tsx). Until 1.7 Remember a verse and the
 * history timeline each drew a padlock of their own, and the reader settings
 * wrote the words after a label; the ambience sheet would have been a fourth.
 */
export function PlusMark({ className }: { className?: string }) {
  const { t } = useTranslate();
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-pill border border-paper/15 px-2 py-0.5 font-sans text-[11px] font-semibold text-paper/60",
        className,
      )}
    >
      <PlusLock />
      {t("plus.badge")}
    </span>
  );
}

/** The mark's padlock alone, on a control that is there but not yet the reader's. */
export function PlusLock({ size = 12, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
