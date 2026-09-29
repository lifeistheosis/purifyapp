"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { Close } from "@/components/ui/icons/Close";
import { CARD_BG } from "@/components/ui/Graphite";
import {
  ONBOARDING_EVENT,
  dismissNudge,
  isNudgeDismissed,
  isNudgeEligible,
} from "@/lib/onboarding/state";
import { dayOneFor } from "@/lib/onboarding/space";
import { useSpace } from "@/lib/onboarding/useSpace";

/**
 * "Your Day 1": the first step the onboarding handoff chose for this reader
 * (lib/onboarding/space.ts, dayOneFor), waiting at the top of Today once the
 * overlay has gone. It rises in and a band of light crosses it once, so the
 * eye lands on it after the slate. One suggestion, dismissible, gone once
 * taken.
 */
export function FirstStepsNudge() {
  const { t } = useTranslate();
  const { level, intent } = useSpace();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const check = () => setReady(isNudgeEligible() && !isNudgeDismissed());
    check();
    window.addEventListener(ONBOARDING_EVENT, check);
    return () => window.removeEventListener(ONBOARDING_EVENT, check);
  }, []);

  if (!ready) return null;
  const step = dayOneFor(level, intent);

  return (
    <div
      className="ob-day1-in ob-sheen lm-card relative mb-4 overflow-hidden rounded-[22px] p-5 ring-1 ring-inset ring-premium/30 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.6)]"
      style={CARD_BG}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-premium-ink">
            {t("onboard.day1.eyebrow")}
          </p>
          <p className="mt-2 font-heading text-title-sm font-bold leading-tight text-paper">
            {t(`onboard.day1.${step.key}.title`)}
          </p>
          <p className="mt-1.5 font-sans text-detail leading-[1.55] text-paper/65">
            {t(`onboard.day1.${step.key}.body`)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => dismissNudge()}
          aria-label={t("onboard.nudge.dismiss")}
          className="-mr-2 -mt-2 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-paper/50 transition-colors hover:text-paper"
        >
          <Close size={14} />
        </button>
      </div>
      <Link
        href={step.href}
        onClick={() => dismissNudge()}
        className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-pill bg-paper px-5 font-sans text-ui font-semibold text-night transition-[transform,background-color] hover:bg-paper/90 active:scale-[0.98]"
      >
        {t("onboard.day1.open")}
        <span aria-hidden>{"→"}</span>
      </Link>
    </div>
  );
}
