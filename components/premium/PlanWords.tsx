"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { PLUS_TRIAL_DAYS } from "@/lib/premium/plans";
import { percentWords, planPrice, yearlySaving } from "@/lib/premium/planWords";

// The two lines of the Plus page that carry a figure, in the reader's
// language and written the reader's way (lib/premium/planWords.ts): the
// figure comes from lib/premium/plans.ts, never typed into the sentence.
// Islands, so the page around them can stay a server page and they follow the
// app's language when it changes, as <T> does.

/** A plan's monthly price, or "or" and its yearly one. */
export function PlanPrice({ cents, per }: { cents: number; per: "month" | "orYear" }) {
  const { t, locale } = useTranslate();
  return <>{t(per === "month" ? "premium.perMonth" : "premium.orPerYear", { price: planPrice(cents, locale) })}</>;
}

/** What the yearly plan saves, and its free trial on a first subscription. */
export function PlusTrialLine() {
  const { tn, locale } = useTranslate();
  return <>{tn("premium.plusTrial", PLUS_TRIAL_DAYS, { pct: percentWords(yearlySaving(), locale) })}</>;
}
