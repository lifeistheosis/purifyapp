import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { ChantInBar } from "@/components/player/ChantInBar";
import type { Rule } from "@/components/prayers/PrayerRuleReader";
import { RecordPrayerOpened } from "@/components/prayers/RecordPrayerOpened";
import morningRule from "@/data/prayers/rules/morning.json";
import { RuleInReadersLanguage } from "@/components/prayers/RuleInReadersLanguage";

export const metadata = {
  title: "Morning Rule",
  description:
    "A short Orthodox morning prayer rule for daily use, prayer by prayer.",
};

// The prayer page (components/prayers/PrayerRuleReader.tsx). Its own bar
// takes the name once the heading has scrolled away; back leads to Prayers
// when there is nothing behind. Its words are in every language the rule is
// written in, the reader's chosen on the device (1.9,
// components/prayers/RuleInReadersLanguage.tsx); the page says so on the device
// when the reader's language has none and the words are the English.
export default async function MorningRulePage() {
  return (
    <>
      <MobileTopBar titleKey="prayers.rule.morning.title" back backFallback="/prayers" revealTitleOn="prayer-title" beforeSearch={<ChantInBar />} />
      <section className="min-h-screen bg-night px-5 pb-16 pt-8 md:px-8 md:pt-14">
        <RecordPrayerOpened id="morning" titleKey="today.prayNow.morningFallback" href="/prayers/morning" />
        <RuleInReadersLanguage rule={morningRule as Rule} file="rules/morning.json" ruleHref="/prayers/morning" titleKey="prayers.rule.morning.title" />
      </section>
    </>
  );
}
