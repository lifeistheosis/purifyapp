import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { PrayerRuleReader, type Rule } from "@/components/prayers/PrayerRuleReader";
import { RecordPrayerOpened } from "@/components/prayers/RecordPrayerOpened";
import eveningRule from "@/data/prayers/rules/evening.json";
import { getServerLocale } from "@/lib/i18n/server";
import { getLocalizedPrayerJson } from "@/lib/i18n/localizedContent";

export const metadata = {
  title: "Evening Rule",
  description:
    "A short Orthodox evening prayer rule with examination of the day, prayer by prayer.",
};

// The prayer page, as the morning rule's (app/(app)/prayers/morning/page.tsx).
export default async function EveningRulePage() {
  const locale = await getServerLocale();
  const loaded = await getLocalizedPrayerJson<Rule>("rules/evening.json", locale);
  const rule = loaded?.data ?? (eveningRule as Rule);
  const contentLocale = loaded?.isLocalized ? locale : "en";
  return (
    <>
      <MobileTopBar titleKey="prayers.rule.evening.title" back backFallback="/prayers" revealTitleOn="prayer-title" />
      <section className="min-h-screen bg-night px-5 pb-16 pt-8 md:px-8 md:pt-14">
        <RecordPrayerOpened id="evening" titleKey="today.prayNow.eveningFallback" href="/prayers/evening" />
        <PrayerRuleReader
          rule={rule}
          ruleHref="/prayers/evening"
          titleKey="prayers.rule.evening.title"
          contentLocale={contentLocale}
        />
      </section>
    </>
  );
}
