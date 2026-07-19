"use client";

import Link from "next/link";
import type { FastingStatus, FastKind } from "@/lib/calendar/orthodox";
import { useTranslate } from "@/components/i18n/MessagesProvider";

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
export function FastTodayCard({ fast }: { fast: FastingStatus }) {
  const { t } = useTranslate();
  const dot: Record<FastKind, string> = {
    strict: "bg-crimson",
    "wine-oil": "bg-gold",
    fish: "bg-sage",
    fast: "bg-paper/40",
    "fast-free": "bg-emerald-400",
    normal: "bg-paper/30",
  };
  return (
    <Link
      href="/fasting"
      className="block rounded-2xl border border-paper/10 bg-paper/[0.03] p-3.5 transition-colors hover:bg-paper/[0.06]"
    >
      <p className="font-sans text-caption text-paper/55">{t("today.fastEyebrow")}</p>
      <h3 className="mt-1 font-serif text-ui leading-[1.2] text-paper">
        {t(`calendar.fast.${fast.ruleId}.label`)}
      </h3>
      <p className="mt-2 flex items-center gap-2 font-sans text-detail text-paper/70">
        <span aria-hidden className={`inline-block h-2 w-2 rounded-full ${dot[fast.kind]}`} />
        <span>{t(`calendar.fast.${fast.ruleId}.rule`)}</span>
      </p>
    </Link>
  );
}
