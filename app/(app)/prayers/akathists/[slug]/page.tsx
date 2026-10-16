import { notFound } from "next/navigation";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { PrayerRuleReader } from "@/components/prayers/PrayerRuleReader";
import { RecordPrayerOpened } from "@/components/prayers/RecordPrayerOpened";
import { akathistTitleKey, getAkathist, listAkathists } from "@/lib/prayers/akathists";

export const dynamicParams = false;

export function generateStaticParams() {
  return listAkathists().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const a = getAkathist(slug);
  if (!a) return { title: "Akathist" };
  return {
    title: a.title,
    description: a.intro.slice(0, 160),
  };
}

// An akathist is a prayer page like a rule's (components/prayers/
// PrayerRuleReader.tsx), stanza by stanza: each kontakion and ikos under the
// Church's own name for it, in the reader's language, with its refrain set
// on a line of its own. Back leads to the Akathists.
export default async function AkathistPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const akathist = getAkathist(slug);
  if (!akathist) notFound();
  const href = `/prayers/akathists/${slug}`;
  const titleKey = akathistTitleKey(slug);

  return (
    <>
      <MobileTopBar titleKey={titleKey} back backFallback="/prayers/akathists" revealTitleOn="prayer-title" />
      <section className="min-h-screen bg-night px-5 pb-16 pt-8 md:px-8 md:pt-14">
        <RecordPrayerOpened id={akathist.id} titleKey={titleKey} href={href} />
        <PrayerRuleReader rule={akathist} ruleHref={href} titleKey={titleKey} />
      </section>
    </>
  );
}
