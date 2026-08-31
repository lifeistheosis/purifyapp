import { PrayerRuleReader, type Rule } from "@/components/prayers/PrayerRuleReader";
import { RecordPrayerOpened } from "@/components/prayers/RecordPrayerOpened";
import morningRule from "@/data/prayers/rules/morning.json";
import { getServerLocale } from "@/lib/i18n/server";
import { getMessages, t } from "@/lib/i18n";
import { getLocalizedPrayerJson } from "@/lib/i18n/localizedContent";
import { ContentNotYetTranslated } from "@/components/i18n/ContentNotYetTranslated";

export const metadata = {
  title: "Morning Rule",
  description:
    "A short Orthodox morning prayer rule for daily use, prayer by prayer.",
};

export default async function MorningRulePage() {
  const locale = await getServerLocale();
  const m = getMessages(locale);
  const loaded = await getLocalizedPrayerJson<Rule>(
    "rules/morning.json",
    locale,
  );
  const rule = loaded?.data ?? (morningRule as Rule);
  const isLocalized = loaded?.isLocalized ?? false;
  return (
    <section className="bg-night min-h-screen px-6 md:px-8 py-16 md:py-24">
      {locale !== "en" && !isLocalized ? (
        <div className="mx-auto mb-10 w-full max-w-[640px]">
          <ContentNotYetTranslated locale={locale} kind="prayer" />
        </div>
      ) : null}
      <RecordPrayerOpened id="morning" title={t(m, "today.prayNow.morningFallback")} href="/prayers/morning" />
      <PrayerRuleReader rule={rule} ruleHref="/prayers/morning" />
    </section>
  );
}
