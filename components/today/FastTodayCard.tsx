"use client";

import Link from "next/link";
import type { FastingStatus } from "@/lib/calendar/orthodox";
import { FAST_DOT } from "@/lib/calendar/fastDot";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { fastView, type FastingRule } from "@/lib/onboarding/space";

/**
 * Third card in the mobile Today timeline: today's fast in plain words.
 * Mirrors the reference's card shape (eyebrow + bold title + short body).
 * Links to /fasting, the tracker, where the reader keeps the day and sees
 * their streak (the full menologion is one tap further, from there).
 *
 * Client so the label/rule strings resolve from the live catalog via the
 * fast's stable ruleId (calendar.fast.*) and follow native locale
 * switches; the English fields on FastingStatus stay the canonical text.
 */
export function FastTodayCard({ fast, rule = "strict" }: { fast: FastingStatus; rule?: FastingRule }) {
  const { t } = useTranslate();
  const dot = FAST_DOT;
  // The reader's fasting rule (Settings, "Your space"). Hidden never reaches
  // here: the rail leaves the card out. The simpler rule reads every fast day
  // the same plain way and leaves oil, wine and fish to their priest.
  const view = fastView(fast.kind, rule);
  const plain = view?.mode === "plain";
  return (
    <Link
      href="/fasting"
      className="press-card block rounded-2xl border border-paper/10 bg-paper/[0.03] p-3.5 hover:bg-paper/[0.06]"
    >
      <p className="font-sans text-caption text-paper/55">{t("today.fastEyebrow")}</p>
      <h3 className="mt-1 font-serif text-ui leading-[1.2] text-paper">
        {plain ? t("today.fastPlain.label") : t(`calendar.fast.${fast.ruleId}.label`)}
      </h3>
      <p className="mt-2 flex items-center gap-2 font-sans text-detail text-paper/70">
        <span aria-hidden className={`inline-block h-2 w-2 rounded-full ${dot[fast.kind]}`} />
        <span>{plain ? t("today.fastPlain.rule") : t(`calendar.fast.${fast.ruleId}.rule`)}</span>
      </p>
    </Link>
  );
}
