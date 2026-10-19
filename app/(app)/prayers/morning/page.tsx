import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { PrayerRuleReader, type Rule } from "@/components/prayers/PrayerRuleReader";
import { RecordPrayerOpened } from "@/components/prayers/RecordPrayerOpened";
import morningRule from "@/data/prayers/rules/morning.json";
import { getServerLocale } from "@/lib/i18n/server";
import { getLocalizedPrayerJson } from "@/lib/i18n/localizedContent";

export const metadata = {
  title: "Morning Rule",
  description:
    "A short Orthodox morning prayer rule for daily use, prayer by prayer.",
};

// The prayer page (components/prayers/PrayerRuleReader.tsx). Its own bar
// takes the name once the heading has scrolled away; back leads to Prayers
// when there is nothing behind. In the apps the words are the English file's
// (a static export has no reader's language to choose by), and the page says
// so on the device when the reader's language is another.
export default async function MorningRulePage() {
  const locale = await getServerLocale();
  const loaded = await getLocalizedPrayerJson<Rule>("rules/morning.json", locale);
  const rule = loaded?.data ?? (morningRule as Rule);
  const contentLocale = loaded?.isLocalized ? locale : "en";
  return (
    <>
      <MobileTopBar titleKey="prayers.rule.morning.title" back backFallback="/prayers" revealTitleOn="prayer-title" />
      <section className="min-h-screen bg-night px-5 pb-16 pt-8 md:px-8 md:pt-14">
        <RecordPrayerOpened id="morning" titleKey="today.prayNow.morningFallback" href="/prayers/morning" />
        <PrayerRuleReader
          rule={rule}
          ruleHref="/prayers/morning"
          titleKey="prayers.rule.morning.title"
          contentLocale={contentLocale}
        />
      </section>
    </>
  );
}
