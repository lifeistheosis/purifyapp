import { notFound } from "next/navigation";
import { SAINTS, getSaint } from "@/lib/saints/saints";
import { SaintHero } from "@/components/saints/SaintHero";
import { LifeSection } from "@/components/saints/LifeSection";
import { TitlesSection } from "@/components/saints/TitlesSection";
import { GreatFeastsSection } from "@/components/saints/GreatFeastsSection";
import { QuotesSection } from "@/components/saints/QuotesSection";
import { DisciplesSection } from "@/components/saints/DisciplesSection";
import { SaintWorksBrowser } from "@/components/saints/SaintWorksBrowser";

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return SAINTS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const saint = getSaint(slug);
  if (!saint) return { title: "Saint" };
  return {
    title: saint.name,
    description: saint.shortBio,
  };
}

export default async function SaintPage({ params }: { params: Params }) {
  const { slug } = await params;
  const saint = getSaint(slug);
  if (!saint) notFound();

  return (
    <section className="bg-night px-5 md:px-8">
      <div className="mx-auto max-w-[1100px] w-full">
        <SaintHero saint={saint} />
        {saint.titles?.length ? <TitlesSection titles={saint.titles} /> : null}
        <LifeSection paragraphs={saint.life} />
        {saint.greatFeasts?.length ? (
          <GreatFeastsSection feasts={saint.greatFeasts} />
        ) : null}
        {saint.quotes?.length ? <QuotesSection quotes={saint.quotes} /> : null}
        {saint.disciples?.length ? (
          <DisciplesSection saint={saint} disciples={saint.disciples} />
        ) : null}
        {saint.works.length > 0 && <SaintWorksBrowser saint={saint} />}
      </div>
    </section>
  );
}
