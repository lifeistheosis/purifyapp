import { notFound } from "next/navigation";
import { SAINTS, getSaint } from "@/lib/saints/saints";
import { createClient } from "@/lib/supabase/server";
import { getEffectiveComplete } from "@/lib/admin/saintOverrides";
import { SaintHero } from "@/components/saints/SaintHero";
import { SaintStudyRail } from "@/components/saints/SaintStudyRail";
import { ContentShell } from "@/components/layout/ContentShell";
import { SaintDoors, type SaintDoorPanels } from "@/components/saints/SaintDoors";
import { SaintLife } from "@/components/saints/SaintLife";
import { SaintWritings } from "@/components/saints/SaintWritings";
import { MiraclesSection } from "@/components/saints/MiraclesSection";
import { LicensedWorksSection } from "@/components/saints/LicensedWorksSection";
import { HymnsSection } from "@/components/saints/HymnsSection";
import { BookmarkSaintButton } from "@/components/saints/BookmarkSaintButton";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { getLicensedWorks } from "@/lib/saints/licensedWorks";
import { heroSrc, saintHero } from "@/lib/saints/heroes";
import { saintDoors, saintTabs } from "@/lib/saints/page";
import { hymnsOf } from "@/lib/saints/hymns";
import { hasWeb } from "@/lib/saints/web";
import { listAkathists } from "@/lib/prayers/akathists";
import { cardFor } from "@/lib/reading/cards";
import { IS_STATIC_EXPORT } from "@/lib/platform/buildTarget";
import { eventsForSaint } from "@/lib/history/events";
import { saintJsonLd } from "@/lib/seo/jsonld";
import { sameAsFor } from "@/lib/saints/authority";
import { SaintInReadersLanguage, SaintNotInLanguage } from "@/components/saints/SaintInReadersLanguage";
import { RecordRead } from "@/components/reading/RecordRead";
import { KeepDay } from "@/components/streak/KeepDay";
import { SaintIntercession } from "@/components/saints/SaintIntercession";
import { SaintIconsRail } from "@/components/shop/SaintIconsRail";

type Params = Promise<{ slug: string }>;

export function generateStaticParams() {
  return SAINTS.map((s) => ({ slug: s.slug }));
}

// Only the library's saints are pages (1.9): on the website an address made
// up or mistyped (/saints/zzz-not-a-saint) answers a true 404. Without this the
// page began streaming its outline (loading.tsx) before it knew there was no
// saint, so the not-found came inside a 200, a page to a search engine. The
// apps ship the same pages either way: the export builds only these.
export const dynamicParams = false;

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

/**
 * A saint's page, phone first: the 1.7 page of the owner's note 19 of
 * 2026-10-16, with the top he locked on 2026-10-27, round 3b D, "Fade and
 * doors": his icon fading in at the top (full width where a sharp picture of
 * him exists), his name over its foot with one line under it, the row with
 * the request and Share, then four doors, Life, Writings, Web and Hymns,
 * offering only those he has. Life, Writings and Hymns switch what is below;
 * Web opens his saint web. His miracles are read at the end of his Life. The
 * top bar is the page's own: it starts clear over the picture with the way
 * back and Save on round plates, turns solid with his name once the name has
 * scrolled away, and its way back returns to the list, or to the saints when
 * there is nothing behind.
 */
export default async function SaintPage({ params }: { params: Params }) {
  const { slug } = await params;
  const saint = getSaint(slug);
  if (!saint) notFound();

  // Apply admin-set `complete` override on top of the registry value. Falls
  // back to the registry on any error; the public site never breaks if the
  // override table is unreachable.
  const [bump, effectiveComplete, licensedWorks] = await Promise.all([
    loadBumpState(slug),
    getEffectiveComplete(slug, Boolean(saint.complete)),
    getLicensedWorks(slug),
  ]);

  // The page writes his life in English. A life written in the reader's
  // language (55 in German) is drawn on the device from its own file
  // (components/saints/SaintInReadersLanguage.tsx, components/saints/
  // lifeLoaders.ts); the page carries none of it. Until 1.9 it chose on the
  // server, which in the apps knows no reader. Quotes, disciples and the works
  // stay in English: citations kept in their own form, or works with their
  // own languages.
  const effectiveSaint = { ...saint, complete: effectiveComplete };

  // sameAs only when an identity was resolved through the live authority
  // APIs; sameAsFor returns undefined otherwise, so an unverified saint
  // makes no identity claim rather than a guessed one.
  const jsonLd = saintJsonLd(effectiveSaint, sameAsFor(slug));

  // The picture at the top: the website's own file on the website, the
  // website's address in the apps, decided here by the build.
  const hero = saintHero(slug);
  const heroPicture = hero ? { src: heroSrc(hero, IS_STATIC_EXPORT), width: hero.width, height: hero.height } : null;

  const doors = saintDoors({
    works: saint.works.length,
    licensed: licensedWorks.length,
    web: hasWeb(saint.slug),
    hymns: hymnsOf(saint.slug).length + listAkathists().filter((a) => a.slug === saint.slug).length,
  });
  const panel = {
    life: () => (
      <SaintLife
        saint={effectiveSaint}
        events={eventsForSaint(saint.slug)}
        miracles={saint.hasMiracles ? <MiraclesSection slug={saint.slug} /> : undefined}
      />
    ),
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
    hymns: () => <HymnsSection slug={saint.slug} />,
  };
  const panels: SaintDoorPanels = {};
  for (const id of saintTabs(doors)) panels[id] = panel[id]();
  // Save rides in the top bar on a phone, beside the way back (round 3b D).
  const save = <BookmarkSaintButton slug={saint.slug} name={saint.name} variant="bar" />;

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
        trailing={save}
      />
      <section className="bg-night px-5 md:px-8">
        <SaintInReadersLanguage slug={saint.slug}>
        <div className="mx-auto w-full max-w-[1100px]">
          <SaintHero saint={effectiveSaint} hero={heroPicture} bump={bump} />
          <SaintNotInLanguage />
          <ContentShell rail={<SaintStudyRail saint={effectiveSaint} />}>
            <SaintDoors
              doors={doors}
              panels={panels}
              webHref={doors.includes("web") ? `/saints/${saint.slug}/web` : undefined}
              saintName={saint.name}
            />
            <SaintIconsRail saintSlug={saint.slug} saintName={saint.name} />
          </ContentShell>
          <SaintIntercession saint={saint} />
        </div>
        </SaintInReadersLanguage>
      </section>
    </>
  );
}
