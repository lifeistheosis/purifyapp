import { APOLOGETICS_TOPICS } from "@/lib/apologetics/topics";
import { COUNCILS } from "@/lib/councils/councils";
import { councilFocus, councilPicture } from "@/lib/councils/page";
import { TILE_PREVIEWS } from "@/lib/discover/tilePreviews.generated";
import { HERESIES } from "@/lib/heresies/heresies";
import { IS_STATIC_EXPORT } from "@/lib/platform/buildTarget";
import { getSaint } from "@/lib/saints/saints";
import { loadTopicBody, saintsCitedIn } from "@/lib/theology/load";
import { fatherGroups } from "@/lib/theology/page";
import { pathSteps } from "@/lib/theology/pathSteps";
import { THEOLOGY_TOPICS } from "@/lib/theology/topics";
import { loadAllTopics } from "@/lib/topics/topics";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { GalleryBand } from "@/components/ui/GalleryBand";
import { T } from "@/components/i18n/T";
import { FathersShelf } from "@/components/theology/FathersShelf";
import { RecentStudies, type RecentStudy } from "@/components/theology/RecentStudies";
import { TheologyHub } from "@/components/theology/TheologyHub";
import { CouncilFilm, WaysRows, WaysTiles, type FilmCouncil, type WayCounts } from "@/components/theology/TheologyLibrary";

export const metadata = {
  title: "Theology",
  description:
    "The Orthodox theological study library: a path through the faith in the order of the Creed, long-form Doctrine, focused Topics, the Heresies the Church condemned, and Apologetics, drawn verbatim from the Fathers and the Councils.",
};

export const revalidate = 3600;

const HISTORY_PICTURE = "/discover/tiles/history.v2.webp";

/**
 * Theology (1.8, round 3 r3-13): the owner's pick of 2026-10-30, a hybrid of
 * B and C, not A (Homebase/boards/purify-master/variants/
 * r3-13-theology-revamp; his note 47 of build 80 asked for the whole section
 * to be revamped). His words: "For a reader who is learning is good. 9
 * plates is also good. The library after the 9th and the paths end, then go
 * deeper. Is really good ... I like the images that are on B, but I like
 * C's design."
 *
 * This shell draws what is the same for every reader, on the server: the
 * path's nine steps from the registries, the four ways with how many each
 * holds, the Seven Councils by their pictures, the studies added last, the
 * Fathers the studies quote and Church History. The hub itself
 * (components/theology/TheologyHub.tsx) chooses the head on the device, by
 * the reader's answer to Familiarity, and sets these where that head puts
 * them.
 *
 * The bar names the page and its search opens turned to Theology
 * (lib/search/open.ts): the app's one search, the owner's pick of r3-12. The
 * floating search pill of round 3 r3-04 is gone from here, as the design
 * draws it.
 *
 * Left out, as the design draws the hub: the subjects as bands that open to
 * a tray (FaithMap, round 12 and r3-04), and Begin here, the Filioque's band,
 * whose place the path's first step takes (the Filioque is the first study
 * of step I).
 */
export default async function TheologyHubPage() {
  const [steps, topics, doctrine] = await Promise.all([
    pathSteps(IS_STATIC_EXPORT),
    loadAllTopics(),
    Promise.all(
      THEOLOGY_TOPICS.filter((t) => !t.planned).map(async (meta) => ({
        meta,
        body: await loadTopicBody(meta.slug),
      })),
    ),
  ]);

  const counts: WayCounts = {
    doctrine: doctrine.length,
    topics: topics.length,
    heresies: HERESIES.length,
    apologetics: APOLOGETICS_TOPICS.filter((t) => !t.planned).length,
  };

  // The studies added last, by the day the editors curated them; studies of
  // one day keep the library's order.
  const recent: RecentStudy[] = doctrine
    .filter((d) => d.body)
    .map((d, order) => ({ ...d, order }))
    .sort((a, b) => (b.body?.curatedOn ?? "").localeCompare(a.body?.curatedOn ?? "") || a.order - b.order)
    .slice(0, 3)
    .map(({ meta, body }) => {
      const top = fatherGroups(body!.florilegium).find((g) => g.saintSlug);
      const saint = top?.saintSlug ? getSaint(top.saintSlug) : null;
      return {
        slug: meta.slug,
        title: meta.title,
        ...(meta.estimatedMinutes ? { minutes: meta.estimatedMinutes } : {}),
        ...(saint ? { father: { slug: saint.slug, name: saint.name, ...(saint.iconUrl ? { iconUrl: saint.iconUrl } : {}) } } : {}),
      };
    });

  // The Fathers cited across the doctrine studies, in the order they are first quoted.
  const fatherSlugs: string[] = [];
  for (const { body } of doctrine) {
    if (!body) continue;
    for (const s of saintsCitedIn(body)) if (!fatherSlugs.includes(s.saintSlug)) fatherSlugs.push(s.saintSlug);
  }
  const fathers = fatherSlugs
    .map((slug) => getSaint(slug))
    .filter((s): s is NonNullable<typeof s> => Boolean(s))
    .slice(0, 8)
    .map((s) => ({ slug: s.slug, name: s.name, ...(s.iconUrl ? { iconUrl: s.iconUrl } : {}) }));

  const seven: FilmCouncil[] = COUNCILS.filter((c) => c.kind !== "local")
    .sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0))
    .slice(0, 7)
    .map((c) => {
      const picture = councilPicture(c.slug, IS_STATIC_EXPORT);
      return {
        slug: c.slug,
        ordinal: c.ordinal ?? 0,
        year: c.year,
        byname: c.byname,
        picture: picture
          ? { src: picture.src, ...(picture.preview ? { preview: picture.preview } : {}), focus: councilFocus(c.slug), credit: picture.credit }
          : null,
      };
    });

  return (
    <>
      <MobileTopBar titleKey="nav.discoverMenu.theology" back backFallback="/discover" searchPlace="theology" />
      <section className="bg-night px-5 pb-10 pt-5 md:px-8 md:py-14">
        <div className="mx-auto w-full max-w-[640px]">
          {/* On a computer, the page names itself; a phone's bar does. */}
          <header className="mb-8 hidden md:block native-md-hidden">
            <p className="font-sans text-caption font-semibold text-paper/45">
              <T k="study.theology.studyLibrary" />
            </p>
            <h1 className="mt-3 font-serif text-display-lg font-bold leading-[1.02] tracking-[-0.025em] text-paper">
              <T k="nav.discoverMenu.theology" />
            </h1>
          </header>

          <TheologyHub
            steps={steps}
            slots={{
              waysRows: <WaysRows counts={counts} />,
              waysTiles: <WaysTiles counts={counts} />,
              councils: <CouncilFilm councils={seven} />,
              recent: <RecentStudies studies={recent} />,
              more: (
                <>
                  <FathersShelf fathers={fathers} />
                  <div className="mt-7">
                    <GalleryBand
                      href="/history"
                      heading="h3"
                      picture={HISTORY_PICTURE}
                      focus="50% 40%"
                      preview={TILE_PREVIEWS[HISTORY_PICTURE]?.src}
                      title={<T k="study.theology.exploreHistory" />}
                      line={<T k="study.everyDoctrineHereWasConfessed" />}
                    />
                  </div>
                </>
              ),
            }}
          />
        </div>
      </section>
    </>
  );
}
