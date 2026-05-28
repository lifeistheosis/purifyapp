import { notFound } from "next/navigation";
import { SAINTS, getSaint } from "@/lib/saints/saints";
import { createClient } from "@/lib/supabase/server";
import { getEffectiveComplete } from "@/lib/admin/saintOverrides";
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

// Force dynamic so the bump count + per-user bumped state are always fresh.
// generateStaticParams still keeps the slug list discoverable for sitemaps.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const saint = getSaint(slug);
  if (!saint) return { title: "Saint" };
  return {
    title: saint.name,
    description: saint.shortBio,
  };
}

async function loadBumpState(slug: string) {
  try {
    const supa = await createClient();
    const {
      data: { user },
    } = await supa.auth.getUser();

    const [{ data: agg }, mine] = await Promise.all([
      supa
        .from("saint_bump_counts")
        .select("bumps")
        .eq("saint_slug", slug)
        .maybeSingle(),
      user
        ? supa
            .from("saint_bumps")
            .select("id")
            .eq("user_id", user.id)
            .eq("saint_slug", slug)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    return {
      total: agg?.bumps ?? 0,
      bumped: Boolean(mine?.data),
      signedIn: Boolean(user),
    };
  } catch {
    return { total: 0, bumped: false, signedIn: false };
  }
}

export default async function SaintPage({ params }: { params: Params }) {
  const { slug } = await params;
  const saint = getSaint(slug);
  if (!saint) notFound();

  // Apply admin-set `complete` override on top of the registry value. Falls
  // back to the registry on any error; the public site never breaks if the
  // override table is unreachable.
  const [bump, effectiveComplete] = await Promise.all([
    loadBumpState(slug),
    getEffectiveComplete(slug, Boolean(saint.complete)),
  ]);
  const effectiveSaint = { ...saint, complete: effectiveComplete };

  return (
    <section className="bg-night px-5 md:px-8">
      <div className="mx-auto max-w-[1100px] w-full">
        <SaintHero saint={effectiveSaint} bump={bump} />
        {saint.titles?.length ? (
          <TitlesSection titles={saint.titles} pronoun={saint.pronoun} />
        ) : null}
        <LifeSection paragraphs={saint.life} pronoun={saint.pronoun} />
        {saint.greatFeasts?.length ? (
          <GreatFeastsSection feasts={saint.greatFeasts} pronoun={saint.pronoun} />
        ) : null}
        {saint.quotes?.length ? <QuotesSection quotes={saint.quotes} pronoun={saint.pronoun} /> : null}
        {saint.disciples?.length ? (
          <DisciplesSection saint={saint} disciples={saint.disciples} />
        ) : null}
        {saint.works.length > 0 && <SaintWorksBrowser saint={saint} />}
      </div>
    </section>
  );
}
