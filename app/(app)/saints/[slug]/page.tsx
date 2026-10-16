import { notFound } from "next/navigation";
import { SAINTS, getSaint } from "@/lib/saints/saints";
import { createClient } from "@/lib/supabase/server";
import { getEffectiveComplete } from "@/lib/admin/saintOverrides";
import { SaintHero } from "@/components/saints/SaintHero";
import { SaintStudyRail } from "@/components/saints/SaintStudyRail";
import { ContentShell } from "@/components/layout/ContentShell";
import { SectionTabs, type SectionTab } from "@/components/layout/SectionTabs";
import { SaintLife } from "@/components/saints/SaintLife";
import { SaintWritings } from "@/components/saints/SaintWritings";
import { MiraclesSection } from "@/components/saints/MiraclesSection";
import { LicensedWorksSection } from "@/components/saints/LicensedWorksSection";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { getLicensedWorks } from "@/lib/saints/licensedWorks";
import { heroSrc, saintHero } from "@/lib/saints/heroes";
import { saintTabs, type SaintTab } from "@/lib/saints/page";
import { cardFor } from "@/lib/reading/cards";
import { IS_STATIC_EXPORT } from "@/lib/platform/buildTarget";
import { getServerLocale } from "@/lib/i18n/server";
import { eventsForSaint } from "@/lib/history/events";
import { getSaintBioOverrides } from "@/lib/i18n/localizedContent";
import { saintJsonLd } from "@/lib/seo/jsonld";
import { sameAsFor } from "@/lib/saints/authority";
import { ContentNotYetTranslated } from "@/components/i18n/ContentNotYetTranslated";
import { RecordRead } from "@/components/reading/RecordRead";
import { KeepDay } from "@/components/streak/KeepDay";
import { SaintIntercession } from "@/components/saints/SaintIntercession";
import { SaintIconsRail } from "@/components/shop/SaintIconsRail";

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return SAINTS.map((s) => ({ slug: s.slug }));
}

// Web: ISR (hourly) so the veneration count stays fresh without per-request
// rendering; the per-user "bumped" state is loaded client-side regardless.
// This replaces force-dynamic so the page is compatible with the Android static
// export (output:export rejects force-dynamic; revalidate is ignored there and
// the page ships as a build-time snapshot). generateStaticParams pre-renders
// every saint for offline use.
export const revalidate = 3600;

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

/** The name of each part on the switch. */
const TAB_LABEL: Record<SaintTab, string> = {
  life: "saints.tab.life",
  writings: "saints.writings",
  miracles: "saints.miracles",
};

/**
 * A saint's page (1.7, the owner's note 19 of 2026-10-16), phone first: his
 * icon at the top (full width where a sharp picture of him exists), his name
 * with one line under it, the request and Save, then a switch between his
 * Life, his Writings and his Miracles, offering only the parts he has. The
 * top bar is the page's own: it starts clear over the picture and turns
 * solid with his name once the name has scrolled away, and its way back
 * returns to the list, or to the saints when there is nothing behind.
 */
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
  // works[] registry stay in English: those are either citations (kept in
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

  // sameAs only when an identity was resolved through the live authority
  // APIs; sameAsFor returns undefined otherwise, so an unverified saint
  // makes no identity claim rather than a guessed one.
  const jsonLd = saintJsonLd(effectiveSaint, sameAsFor(slug));

  // The picture at the top: the website's own file on the website, the
  // website's address in the apps, decided here by the build.
  const hero = saintHero(slug);
  const heroPicture = hero ? { src: heroSrc(hero, IS_STATIC_EXPORT), width: hero.width, height: hero.height } : null;

  const parts = saintTabs({
    works: saint.works.length,
    licensed: licensedWorks.length,
    miracles: Boolean(saint.hasMiracles),
  });
  const panel: Record<SaintTab, () => React.ReactNode> = {
    life: () => <SaintLife saint={effectiveSaint} events={eventsForSaint(saint.slug)} />,
    writings: () => (
      <div className="space-y-12">
        <SaintWritings
          saintSlug={saint.slug}
          saintName={saint.name}
          works={saint.works.map(({ slug: workSlug, title, subtitle, year, blurb, topics }) => {
            // The cover the reading room gives the book (1.7): one system.
            const card = cardFor(saint, workSlug, IS_STATIC_EXPORT);
            return {
              slug: workSlug,
              title,
              subtitle,
              year,
              blurb,
              topics,
              ...(card?.cover ? { cover: card.cover } : {}),
              ...(card ? { author: card.author } : {}),
            };
          })}
        />
        <LicensedWorksSection works={licensedWorks} />
      </div>
    ),
    miracles: () => <MiraclesSection slug={saint.slug} />,
  };
  const tabs: SectionTab[] = parts.map((id) => ({ id, labelKey: TAB_LABEL[id], panel: panel[id]() }));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <RecordRead
        kind="saint"
        href={`/saints/${saint.slug}`}
        label={saint.name}
        saintSlug={saint.slug}
      />
      {/* Reading a saint's life keeps the day for the streak. */}
      <KeepDay strand="day:saint" />
      <MobileTopBar
        title={saint.name}
        back
        backFallback="/saints"
        revealTitleOn="saint-name"
        overlay={Boolean(hero)}
      />
      <section className="bg-night px-5 md:px-8">
        <div className="mx-auto w-full max-w-[1100px]">
          <SaintHero saint={effectiveSaint} hero={heroPicture} bump={bump} />
          {locale !== "en" && !bioIsLocalized ? (
            <ContentNotYetTranslated locale={locale} kind="bio" />
          ) : null}
          <ContentShell rail={<SaintStudyRail saint={effectiveSaint} />}>
            <SectionTabs idBase="saint" labelKey="saints.sectionSwitcher" tabs={tabs} />
            <SaintIconsRail saintSlug={saint.slug} saintName={saint.name} />
          </ContentShell>
          <SaintIntercession saint={saint} />
        </div>
      </section>
    </>
  );
}
