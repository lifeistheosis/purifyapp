"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Close } from "@/components/ui/icons/Close";
import {
  ONBOARDING_EVENT,
  dismissNudge,
  firstStepFor,
  isNudgeDismissed,
  isNudgeEligible,
  readFocus,
} from "@/lib/onboarding/state";

/**
 * A single quiet pointer toward a first action, shown on Today only to a
 * user who just finished onboarding. Deliberately NOT a checklist or a
 * progress tracker (Purify is a prayer book, not a productivity app):
 * one calm suggestion, dismissible, gone for good once acted on.
 */
export function FirstStepsNudge() {
  const { t } = useTranslate();
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState<{ key: string; href: string } | null>(null);

  useEffect(() => {
    const check = () => {
      if (isNudgeEligible() && !isNudgeDismissed()) {
        setStep(firstStepFor(readFocus()));
        setReady(true);
      } else {
        setReady(false);
      }
    };
    check();
    window.addEventListener(ONBOARDING_EVENT, check);
    return () => window.removeEventListener(ONBOARDING_EVENT, check);
  }, []);

  if (!ready || !step) return null;

  return (
    <div className="mb-4 rounded-2xl border border-gold/35 bg-gold/[0.06] p-4 flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="font-sans text-eyebrow uppercase tracking-[1.5px] text-gold/85 mb-1">
          {t("onboard.nudge.eyebrow")}
        </p>
        <Link
          href={step.href}
          onClick={() => dismissNudge()}
          className="font-serif text-body font-semibold text-paper hover:underline underline-offset-2"
        >
          {t(`onboard.nudge.${step.key}`)} →
        </Link>
      </div>
      <button
        type="button"
        onClick={() => dismissNudge()}
        aria-label={t("onboard.nudge.dismiss")}
        className="shrink-0 h-8 w-8 inline-flex items-center justify-center rounded-pill text-paper/55 hover:text-paper transition-colors"
      >
        <Close size={14} />
      </button>
    </div>
  );
}
