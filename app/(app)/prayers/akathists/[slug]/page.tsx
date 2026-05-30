import { notFound } from "next/navigation";
import { PrayerRuleReader } from "@/components/prayers/PrayerRuleReader";
import { getAkathist, listAkathists } from "@/lib/prayers/akathists";

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

const SECTION = "px-5 md:px-8 py-16 md:py-20";

export default async function AkathistPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const akathist = getAkathist(slug);
  if (!akathist) notFound();

  return (
    <section className={`${SECTION} bg-night`}>
      <PrayerRuleReader rule={akathist} />
    </section>
  );
}
