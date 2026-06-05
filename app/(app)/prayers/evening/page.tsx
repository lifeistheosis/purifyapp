import { PrayerRuleReader, type Rule } from "@/components/prayers/PrayerRuleReader";
import { RecordPrayerOpened } from "@/components/prayers/RecordPrayerOpened";
import eveningRule from "@/data/prayers/rules/evening.json";
import { getServerLocale } from "@/lib/i18n/server";
import { getLocalizedPrayerJson } from "@/lib/i18n/localizedContent";
import { ContentNotYetTranslated } from "@/components/i18n/ContentNotYetTranslated";

export const metadata = {
  title: "Evening Rule",
  description:
    "A short Orthodox evening prayer rule with examination of the day, prayer by prayer.",
};

export default async function EveningRulePage() {
  const locale = await getServerLocale();
  const loaded = await getLocalizedPrayerJson<Rule>(
    "rules/evening.json",
    locale,
  );
  const rule = loaded?.data ?? (eveningRule as Rule);
  const isLocalized = loaded?.isLocalized ?? false;
  return (
    <section className="bg-night min-h-screen px-6 md:px-8 py-16 md:py-24">
      {locale !== "en" && !isLocalized ? (
        <div className="mx-auto mb-10 w-full max-w-[640px]">
          <ContentNotYetTranslated locale={locale} kind="prayer" />
        </div>
      ) : null}
      <RecordPrayerOpened id="evening" title="Evening prayers" href="/prayers/evening" />
      <PrayerRuleReader rule={rule} ruleHref="/prayers/evening" />
    </section>
  );
}
