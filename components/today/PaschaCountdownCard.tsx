"use client";

import Link from "next/link";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * Final card in the mobile Today timeline: the Pascha countdown.
 * Same card shape, with a small three-bar cross above the count.
 * Client so both lines follow the active locale on native.
 */
export function PaschaCountdownCard({
  daysAway,
  year,
}: {
  daysAway: number;
  /** The Pascha year being counted toward. */
  year: number;
}) {
  const { t, tn } = useTranslate();
  const primary =
    daysAway === 0
      ? t("today.paschaPrimaryToday")
      : daysAway > 0
        ? tn("today.paschaDays", daysAway)
        : t("today.paschaPrimaryPassed");
  const secondary =
    daysAway > 0
      ? t("today.untilPascha", { year })
      : daysAway === 0
        ? t("today.paschaToday")
        : t("today.paschaPassed");
  return (
    <Link
      href="/calendar"
      className="press-card flex items-center gap-3 rounded-2xl border border-paper/10 bg-paper/[0.03] p-3.5 hover:bg-paper/[0.06]"
    >
      <ThreeBarCross />
      <div className="min-w-0 flex-1">
        <p className="font-sans text-caption text-paper/55">{t("today.paschaEyebrow")}</p>
        <h3 className="mt-0.5 font-serif text-ui leading-[1.2] text-paper">
          {primary}
        </h3>
        <p className="mt-0.5 font-sans text-caption text-paper/55">{secondary}</p>
      </div>
    </Link>
  );
}

function ThreeBarCross() {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      className="text-gold/80 shrink-0"
      aria-hidden
    >
      <line x1="12" y1="2.5" x2="12" y2="21.5" />
      <line x1="8.5" y1="6" x2="15.5" y2="6" />
      <line x1="5.5" y1="9.5" x2="18.5" y2="9.5" />
      <line x1="8" y1="16.5" x2="16" y2="14" />
    </svg>
  );
}
