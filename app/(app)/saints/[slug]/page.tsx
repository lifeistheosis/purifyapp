import { notFound } from "next/navigation";
import { SAINTS, getSaint } from "@/lib/saints/saints";
import { SaintHero } from "@/components/saints/SaintHero";
import { LifeSection } from "@/components/saints/LifeSection";
import { WritingsList } from "@/components/saints/WritingsList";

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return SAINTS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const saint = getSaint(slug);
  if (!saint) return { title: "Saint - Purify" };
  return {
    title: `${saint.name} - Purify`,
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
        <LifeSection paragraphs={saint.life} />
        <WritingsList saint={saint} />
      </div>
    </section>
  );
}
