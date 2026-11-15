"use client";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { PLUS_TRIAL_DAYS } from "@/lib/premium/plans";
import { percentWords, planPrice, yearlySaving } from "@/lib/premium/planWords";

// The two lines of the Plus page that carry a figure, in the reader's
// language and written the reader's way (lib/premium/planWords.ts): the
// figure comes from lib/premium/plans.ts, never typed into the sentence.
// Islands, so the page around them can stay a server page and they follow the
// app's language when it changes, as <T> does.

/**
 * A plan's monthly price, or "or" and its yearly one. The yearly line stands
 * under the price on the plan card's lit gradient, and at the card's 50 of
 * the ink it read 4.49:1 on Dark and Black and 4.40:1 on Monastery where its
 * Arabic runs onto the card's lit head at 1032 (Gate 4b, 2026-11-15). It is
 * drawn at 65 (lib/premium/__tests__/yearlyLine.test.ts holds it).
 */
export function PlanPrice({ cents, per }: { cents: number; per: "month" | "orYear" }) {
  const { t, locale } = useTranslate();
  if (per === "month") return <>{t("premium.perMonth", { price: planPrice(cents, locale) })}</>;
  return <span className="text-paper/65">{t("premium.orPerYear", { price: planPrice(cents, locale) })}</span>;
}

/** What the yearly plan saves, and its free trial on a first subscription. */
export function PlusTrialLine() {
  const { tn, locale } = useTranslate();
  return <>{tn("premium.plusTrial", PLUS_TRIAL_DAYS, { pct: percentWords(yearlySaving(), locale) })}</>;
}
