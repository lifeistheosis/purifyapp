// The Plus page (/premium) and Your plan (/plan) in all twenty-one languages
// (his yes of 2026-11-10, "All recommendations. Start."; found by Updates 2 in
// build 90's note 4). Their words were lib/premium/plans.ts's English and
// German, which the apps resolved once, when the app was built, in English:
// a reader in Athens, and in the apps a reader in Berlin too, read them in
// English. Now each is a catalog key, and the screens say it in the reader's
// own language, as every other screen does.
//
// The English and German in the catalogs are plans.ts's own, letter for letter
// (lib/premium/__tests__/planWords.test.ts): plans.ts stays the approved text.
// Prices, the trial and the saving are never typed into a sentence: they come
// from PLAN_PRICE_CENTS and PLUS_TRIAL_DAYS, written the reader's way.
//
// Pure, so the tests can read it under node.

import { campaignsEnabled } from "@/lib/campaigns/flags";
import { dateLocale } from "@/lib/i18n/deviceDates";

import { PLAN_PRICE_CENTS } from "./plans";

/** What Standard holds, in plans.ts's order (freeItems). */
export const FREE_KEYS = [
  "premium.free.scriptures",
  "premium.free.saints",
  "premium.free.theology",
  "premium.free.history",
  "premium.free.prayers",
  "premium.free.calendar",
  "premium.free.journal",
  "premium.free.campaigns",
] as const;

/** The line that names Prayer Campaigns: shown only while campaigns are, as plans.ts's filter did. */
export const CAMPAIGNS_FREE_KEY = "premium.free.campaigns";

/** What Standard holds today. */
export function freeKeys(): string[] {
  return FREE_KEYS.filter((k) => k !== CAMPAIGNS_FREE_KEY || campaignsEnabled());
}

/**
 * The Plus list, in plans.ts's order (plusItems): each feature's name and
 * line. A name the app already says in the same words is the catalog's own
 * key for it; the rest are the page's.
 */
export const PLUS_ITEM_KEYS: ReadonlyArray<{ id: string; title: string; sub: string }> = [
  { id: "cross-refs", title: "bible.crossRefs", sub: "premium.plus.crossRefs.sub" },
  { id: "word-study", title: "plus.active.wordstudy", sub: "premium.plus.wordStudy.sub" },
  { id: "ambience", title: "premium.plus.ambience.title", sub: "premium.plus.ambience.sub" },
  { id: "journal", title: "plus.active.journal", sub: "premium.plus.journal.sub" },
  { id: "plans", title: "plus.active.plans", sub: "premium.plus.plans.sub" },
  { id: "remember", title: "premium.plus.remember.title", sub: "premium.plus.remember.sub" },
  { id: "reading-modes", title: "premium.plus.readingModes.title", sub: "premium.plus.readingModes.sub" },
  { id: "florilegium", title: "premium.plus.florilegium.title", sub: "premium.plus.florilegium.sub" },
  { id: "sync", title: "premium.plus.sync.title", sub: "premium.plus.sync.sub" },
  { id: "immersive-history", title: "premium.plus.history.title", sub: "premium.plus.history.sub" },
  { id: "supporter-mark", title: "plus.mark.name", sub: "premium.plus.mark.sub" },
  { id: "discord-frames", title: "premium.plus.discord.title", sub: "premium.plus.discord.sub" },
];

/** A plan's price the reader's way: US dollars, whole dollars without cents ("$199", "199 $"). */
export function planPrice(cents: number, locale: string): string {
  const digits = cents % 100 === 0 ? 0 : 2;
  try {
    return new Intl.NumberFormat(dateLocale(locale), {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(cents / 100);
  } catch {
    return "$" + (cents / 100).toFixed(digits);
  }
}

/** What the yearly plan saves against twelve months of the monthly, as a whole percent. */
export function yearlySaving(): number {
  return Math.round((1 - PLAN_PRICE_CENTS.plusYearly / (PLAN_PRICE_CENTS.plusMonthly * 12)) * 100);
}

/** A whole percent the reader's way: "40%", "40 %", "%40". */
export function percentWords(pct: number, locale: string): string {
  try {
    return new Intl.NumberFormat(dateLocale(locale), { style: "percent", maximumFractionDigits: 0 }).format(pct / 100);
  } catch {
    return String(pct) + "%";
  }
}
