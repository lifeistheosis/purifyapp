import { notFound } from "next/navigation";
import { PrayerRuleReader, type Rule } from "@/components/prayers/PrayerRuleReader";
import { RecordPrayerOpened } from "@/components/prayers/RecordPrayerOpened";
import { getRuleMeta, planIdParams } from "@/lib/prayers/rules";
import { getServerLocale } from "@/lib/i18n/server";
import { getLocalizedPrayerJson } from "@/lib/i18n/localizedContent";
import { ContentNotYetTranslated } from "@/components/i18n/ContentNotYetTranslated";

// Generic reader for every registry rule that carries a data file and is not
// a planned (unseeded) entry, minus the few rules with dedicated routes
// (morning, evening). The pure-data registry lives in lib/prayers/rules.ts;
// the verbatim text is read at request time from data/prayers via the file
// reference on each rule's meta.

export const dynamicParams = false;

export function generateStaticParams() {
  return planIdParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  const meta = getRuleMeta(planId);
  if (!meta) return { title: "Prayer" };
  return {
    title: meta.title,
    description: meta.description ?? `An Orthodox prayer rule: ${meta.title}.`,
  };
}

const SECTION = "bg-night min-h-screen px-6 md:px-8 py-16 md:py-24";

export default async function PrayerRulePage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  const meta = getRuleMeta(planId);
  if (!meta || !meta.file || meta.planned) notFound();

  const locale = await getServerLocale();
  const loaded = await getLocalizedPrayerJson<Rule>(meta.file, locale);
  if (!loaded) notFound();
  const rule = loaded.data;
  const isLocalized = loaded.isLocalized;

  return (
    <section className={SECTION}>
      <RecordPrayerOpened id={meta.id} title={meta.title} href={meta.href} />
      {locale !== "en" && !isLocalized ? (
        <div className="mx-auto mb-10 w-full max-w-[640px]">
          <ContentNotYetTranslated locale={locale} kind="prayer" />
        </div>
      ) : null}
      <PrayerRuleReader rule={rule} ruleHref={meta.href} />
    </section>
  );
}
