import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { ChantInBar } from "@/components/player/ChantInBar";
import type { Rule } from "@/components/prayers/PrayerRuleReader";
import { RecordPrayerOpened } from "@/components/prayers/RecordPrayerOpened";
import eveningRule from "@/data/prayers/rules/evening.json";
import { RuleInReadersLanguage } from "@/components/prayers/RuleInReadersLanguage";

export const metadata = {
  title: "Evening Rule",
  description:
    "A short Orthodox evening prayer rule with examination of the day, prayer by prayer.",
};

// The prayer page, as the morning rule's (app/(app)/prayers/morning/page.tsx).
// Its words in every language the rule is written in (1.9, RuleInReadersLanguage).
export default async function EveningRulePage() {
  return (
    <>
      <MobileTopBar titleKey="prayers.rule.evening.title" back backFallback="/prayers" revealTitleOn="prayer-title" beforeSearch={<ChantInBar />} />
      <section className="min-h-screen bg-night px-5 pb-16 pt-8 md:px-8 md:pt-14">
        <RecordPrayerOpened id="evening" titleKey="today.prayNow.eveningFallback" href="/prayers/evening" />
        <RuleInReadersLanguage rule={eveningRule as Rule} file="rules/evening.json" ruleHref="/prayers/evening" titleKey="prayers.rule.evening.title" />
      </section>
    </>
  );
}
