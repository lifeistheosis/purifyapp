import { PrayerRuleReader, type Rule } from "@/components/prayers/PrayerRuleReader";
import morningRule from "@/data/prayers/rules/morning.json";
import { getServerLocale } from "@/lib/i18n/server";
import { getLocalizedPrayerJson } from "@/lib/i18n/localizedContent";
import { ContentNotYetTranslated } from "@/components/i18n/ContentNotYetTranslated";

export const metadata = {
  title: "Morning Rule",
  description:
    "A short Orthodox morning prayer rule for daily use, prayer by prayer with a streak counter.",
};

export default async function MorningRulePage() {
  const locale = await getServerLocale();
  const loaded = await getLocalizedPrayerJson<Rule>(
    "rules/morning.json",
    locale,
  );
  const rule = loaded?.data ?? (morningRule as Rule);
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
