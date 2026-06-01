import { PrayerRuleReader, type Rule } from "@/components/prayers/PrayerRuleReader";
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
    <section className="bg-night px-5 md:px-8 py-12 md:py-16 min-h-screen">
      <div className="mx-auto max-w-[760px] w-full">
        {locale !== "en" && !isLocalized ? (
          <ContentNotYetTranslated locale={locale} kind="prayer" />
        ) : null}
      </div>
      <PrayerRuleReader rule={rule} />
    </section>
  );
}
