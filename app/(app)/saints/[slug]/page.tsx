import { notFound } from "next/navigation";
import { SAINTS, getSaint } from "@/lib/saints/saints";
import { createClient } from "@/lib/supabase/server";
import { getEffectiveComplete } from "@/lib/admin/saintOverrides";
import { SaintHero } from "@/components/saints/SaintHero";
import { SaintStudyRail } from "@/components/saints/SaintStudyRail";
import { ContentShell } from "@/components/layout/ContentShell";
import { LifeSection } from "@/components/saints/LifeSection";
import { TitlesSection } from "@/components/saints/TitlesSection";
import { GreatFeastsSection } from "@/components/saints/GreatFeastsSection";
import { QuotesSection } from "@/components/saints/QuotesSection";
import { MiraclesSection } from "@/components/saints/MiraclesSection";
import { DisciplesSection } from "@/components/saints/DisciplesSection";
import { SaintWorksBrowser } from "@/components/saints/SaintWorksBrowser";
import { LicensedWorksSection } from "@/components/saints/LicensedWorksSection";
import { getLicensedWorks } from "@/lib/saints/licensedWorks";
import { getServerLocale } from "@/lib/i18n/server";
import { getSaintBioOverrides } from "@/lib/i18n/localizedContent";
import { ContentNotYetTranslated } from "@/components/i18n/ContentNotYetTranslated";

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
  const locale = await getServerLocale();
  const [bump, effectiveComplete, licensedWorks, bioOverrides] = await Promise.all([
    loadBumpState(slug),
    getEffectiveComplete(slug, Boolean(saint.complete)),
    getLicensedWorks(slug),
    getSaintBioOverrides(slug, locale),
  ]);

  // Merge locale overrides over English defaults. Quotes, disciples, and the
  // works[] registry stay in English — those are either citations (kept in
  // their authoritative form) or hand off to per-work locale variants.
  const localized = bioOverrides ?? {};
  const effectiveSaint = {
    ...saint,
    shortBio: localized.shortBio ?? saint.shortBio,
    epithet: localized.epithet ?? saint.epithet,
    byname: localized.byname ?? saint.byname,
    life: localized.life ?? saint.life,
    titles: localized.titles ?? saint.titles,
    greatFeasts: localized.greatFeasts ?? saint.greatFeasts,
    complete: effectiveComplete,
  };
  const bioIsLocalized = Boolean(bioOverrides);

  return (
    <section className="bg-night px-5 md:px-8">
      <div className="mx-auto max-w-[1100px] w-full">
        <SaintHero saint={effectiveSaint} bump={bump} compactFacts />
        {locale !== "en" && !bioIsLocalized ? (
          <ContentNotYetTranslated locale={locale} kind="bio" />
        ) : null}
        <ContentShell rail={<SaintStudyRail saint={effectiveSaint} />}>
          {effectiveSaint.titles?.length ? (
            <TitlesSection titles={effectiveSaint.titles} pronoun={saint.pronoun} />
          ) : null}
          <LifeSection paragraphs={effectiveSaint.life} pronoun={saint.pronoun} />
          {effectiveSaint.greatFeasts?.length ? (
            <div className="lg:hidden">
              <GreatFeastsSection feasts={effectiveSaint.greatFeasts} pronoun={saint.pronoun} />
            </div>
          ) : null}
          {saint.quotes?.length ? <QuotesSection quotes={saint.quotes} pronoun={saint.pronoun} /> : null}
          {saint.hasMiracles ? <MiraclesSection slug={saint.slug} /> : null}
          {saint.disciples?.length ? (
            <DisciplesSection saint={saint} disciples={saint.disciples} />
          ) : null}
          {saint.works.length > 0 && <SaintWorksBrowser saint={saint} />}
          <LicensedWorksSection works={licensedWorks} />
        </ContentShell>
      </div>
    </section>
  );
}
