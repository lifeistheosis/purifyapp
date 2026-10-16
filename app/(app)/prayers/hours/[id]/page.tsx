import { notFound } from "next/navigation";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { PrayerRuleReader } from "@/components/prayers/PrayerRuleReader";
import { RecordPrayerOpened } from "@/components/prayers/RecordPrayerOpened";
import { getHour, listHours } from "@/lib/prayers/hours";

export const dynamicParams = false;

export function generateStaticParams() {
  return listHours().map((h) => ({ id: h.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const h = getHour(id);
  if (!h) return { title: "Hour" };
  return { title: h.title, description: h.intro.slice(0, 160) };
}

// An Hour is a prayer page like a rule's (components/prayers/
// PrayerRuleReader.tsx), named by the catalog in the reader's language, kept
// in Continue praying and in Saved like any rule. Its words are English (the
// Horologion's, with Brenton's psalms), and the page says so on the device to
// a reader in another language. Back leads to the Hours.
export default async function HourPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const hour = getHour(id);
  if (!hour) notFound();
  const href = `/prayers/hours/${id}`;
  const titleKey = `prayers.rule.${id}.title`;

  return (
    <>
      <MobileTopBar titleKey={titleKey} back backFallback="/prayers/hours" revealTitleOn="prayer-title" />
      <section className="min-h-screen bg-night px-5 pb-16 pt-8 md:px-8 md:pt-14">
        <RecordPrayerOpened id={id} titleKey={titleKey} href={href} />
        <PrayerRuleReader rule={hour} ruleHref={href} titleKey={titleKey} />
      </section>
    </>
  );
}
