import { notFound } from "next/navigation";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { PrayerRuleReader, type Rule } from "@/components/prayers/PrayerRuleReader";
import { RecordPrayerOpened } from "@/components/prayers/RecordPrayerOpened";
import { getRuleMeta, planIdParams } from "@/lib/prayers/rules";
import { getServerLocale } from "@/lib/i18n/server";
import { getLocalizedPrayerJson } from "@/lib/i18n/localizedContent";

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
  // Every registry rule has its name in the catalogs
  // (lib/prayers/__tests__/suggest.test.ts holds that), so the page, its bar
  // and Continue praying all name it in the reader's language.
  const titleKey = `prayers.rule.${meta.id}.title`;

  return (
    <>
      <MobileTopBar titleKey={titleKey} back backFallback="/prayers" revealTitleOn="prayer-title" />
      <section className="min-h-screen bg-night px-5 pb-16 pt-8 md:px-8 md:pt-14">
        <RecordPrayerOpened id={meta.id} titleKey={titleKey} href={meta.href} />
        <PrayerRuleReader
          rule={loaded.data}
          ruleHref={meta.href}
          titleKey={titleKey}
          contentLocale={loaded.isLocalized ? locale : "en"}
        />
      </section>
    </>
  );
}
