"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { cn } from "@/lib/cn";

/**
 * "Secure checkout by Stripe", beside the buttons that open it (asked for
 * 2026-09-30: trust at the point of purchase, never fake scarcity).
 *
 * True as written: the buttons it sits under open Stripe's hosted checkout,
 * so card details are typed into Stripe's page and never reach Purify.
 */
export function SecureCheckoutNote({ className }: { className?: string }) {
  const { t } = useTranslate();
  return (
    <p className={cn("inline-flex items-center gap-1.5 font-sans text-caption text-paper/55", className)}>
      <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0">
        <rect x="3" y="7" width="10" height="7" rx="1.6" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M5.5 7V5.2a2.5 2.5 0 0 1 5 0V7" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      {t("shop.trustStripeCheckout")}
    </p>
  );
}
