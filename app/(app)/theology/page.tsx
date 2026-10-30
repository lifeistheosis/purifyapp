import Link from "next/link";

import { APOLOGETICS_TOPICS } from "@/lib/apologetics/topics";
import { COUNCILS } from "@/lib/councils/councils";
import { TILE_PREVIEWS } from "@/lib/discover/tilePreviews.generated";
import { HERESIES } from "@/lib/heresies/heresies";
import { getSaint } from "@/lib/saints/saints";
import { loadTopicBody, saintsCitedIn } from "@/lib/theology/load";
import { THEOLOGY_TOPICS, getTopicMeta } from "@/lib/theology/topics";
import { loadAllTopics } from "@/lib/topics/topics";
import { Book } from "@/components/ui/icons/Book";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { Cross } from "@/components/ui/icons/Cross";
import { Scroll } from "@/components/ui/icons/Scroll";
import { Shield } from "@/components/ui/icons/Shield";
import { GalleryBand } from "@/components/ui/GalleryBand";
import { T } from "@/components/i18n/T";
import { FaithMap } from "@/components/theology/FaithMap";
import { FathersShelf } from "@/components/theology/FathersShelf";
import { TheologySearch } from "@/components/theology/TheologySearch";

export const metadata = {
  title: "Theology",
  description:
    "The Orthodox theological study library: long-form Doctrine, focused Topics, the Heresies the Church condemned, and Apologetics, one connected research surface drawn verbatim from the Fathers and the Councils.",
};

export const revalidate = 3600;

/**
 * The four ways into the study library, as tiles: each mode's name, the kind
 * of writing it holds and how many (round 3 r3-04, part 3, C). The names
 * and kinds are the app's own, from the catalogs.
 */
const MODES = [
  { key: "doctrine", label: "study.doctrine", kicker: "study.theology.kicker.doctrine", href: "/theology/doctrine", Icon: Cross },
  { key: "topics", label: "discover.tile.topics", kicker: "study.theology.kicker.topics", href: "/topics", Icon: Book },
  { key: "heresies", label: "discover.tile.heresies", kicker: "study.theology.kicker.heresies", href: "/heresies", Icon: Scroll },
  { key: "apologetics", label: "discover.tile.apologetics", kicker: "study.theology.kicker.apologetics", href: "/apologetics", Icon: Shield },
] as const;

// The flagship study and the question it settles: Begin here.
const FLAGSHIP = {
  slug: "filioque",
  question: "Does the Holy Spirit proceed from the Father alone?",
};

const BEGIN_PICTURE = "/discover/tiles/theology.v2.webp";
const HISTORY_PICTURE = "/discover/tiles/history.v2.webp";

/**
 * Theology (1.8). The head is the owner's pick of 2026-10-27 (round 12, A, "A
 * gallery"): the name, then the subjects of the faith as bands that open
 * where they stand (FaithMap). The foot is his pick of 2026-10-30 for round
 * 3 r3-04, part 3, C (Homebase/boards/purify-master/variants/r3-04-theology):
 * his note 24 of build 80 asked for everything from "One connected study of
 * the Faith" down to be designed again, and for "Search the library" to stop
 * being the very last thing.
 *
 * The foot as shelves: the library's line; Begin here as a band like the
 * subjects above it; the four ways in as tiles with how many each holds;
 * then the Ecumenical Councils by year. The Fathers the studies quote and
 * Church History, which the foot had, are kept as shelves after them. The
 * search is a pill floating above the tab bar on every Theology screen
 * (TheologySearch), in reach of the thumb.
 *
 * Left out, as the design draws the foot: the search field and its scope
 * pills (the pill's sheet has them as rows), Featured studies, Recently
 * added, Doctrinal categories, and the closing line with Read the Doctrine.
 */
export default async function TheologyHubPage() {
  const [topics, doctrine] = await Promise.all([
    loadAllTopics(),
    Promise.all(
      THEOLOGY_TOPICS.filter((t) => !t.planned).map(async (meta) => ({
        meta,
        body: await loadTopicBody(meta.slug),
      })),
    ),
  ]);

  const counts: Record<(typeof MODES)[number]["key"], number> = {
    doctrine: doctrine.length,
    topics: topics.length,
    heresies: HERESIES.length,
    apologetics: APOLOGETICS_TOPICS.filter((t) => !t.planned).length,
  };

  const flagship = getTopicMeta(FLAGSHIP.slug);

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

  const ecumenical = COUNCILS.filter((c) => c.kind !== "local").slice(0, 7);

  return (
    <section className="bg-night px-5 md:px-8 pt-6 pb-10 md:py-14">
      <div className="mx-auto w-full max-w-[920px]">
        {/* ── Title ─────────────────────────────────────────────────────────
            The owner's pick of 2026-10-27 (round 12, A, "A gallery"): the
            name, then the subjects as bands. On a phone the name is set at
            the size the mockup draws it, so the first screen is the gallery;
            the computer keeps its display size. */}
        <header>
          <p className="font-sans text-caption font-semibold text-paper/45">
            <T k="study.theology.studyLibrary" />
          </p>
          <h1 className="mt-1.5 font-serif text-title md:mt-3 md:text-display-lg font-bold leading-[1.02] tracking-[-0.025em] text-paper">
            <T k="nav.discoverMenu.theology" />
          </h1>
        </header>

        {/* ── The faith, by subject (1.8), a gallery since round 12 ─────── */}
        <FaithMap className="mt-5 md:mt-8" />

        {/* ── The foot, as shelves (round 3 r3-04, part 3, C) ───────────── */}
        <section aria-labelledby="theology-foot" className="mt-5 md:mt-12">
          <h2 id="theology-foot" className="font-serif text-[22px] font-bold leading-[1.22] text-paper">
            <T k="study.theology.footHead" />
          </h2>
          <p className="mt-2 max-w-[60ch] font-sans text-[13.5px] leading-[1.55] text-paper/60">
            <T k="study.theology.footLine" />
          </p>

          {/* Begin here, as a band like the subjects above it. */}
          {flagship ? (
            <div className="mt-3.5" data-theology-begin="">
              <GalleryBand
                href={`/theology/${FLAGSHIP.slug}`}
                size="tall"
                heading="h3"
                picture={BEGIN_PICTURE}
                focus="50% 35%"
                preview={TILE_PREVIEWS[BEGIN_PICTURE]?.src}
                // The band is Begin here, as drawn: its question fills it, so
                // its name is said to a screen reader and not drawn.
                title={
                  <>
                    <span className="sr-only">
                      <T k="study.theology.beginHere" />:{" "}
                    </span>
                    {FLAGSHIP.question}
                  </>
                }
                line={
                  <>
                    {flagship.title}
                    {flagship.estimatedMinutes ? (
                      <>
                        {" · "}
                        <T k="bible.minRead" replacements={{ minutes: flagship.estimatedMinutes }} />
                      </>
                    ) : null}
                  </>
                }
              />
            </div>
          ) : null}

          {/* The four ways in, as tiles, with how many each holds. */}
          <ul className="mt-3.5 grid grid-cols-2 gap-2.5 md:grid-cols-4" data-theology-ways="">
            {MODES.map((m) => (
              <li key={m.key}>
                <Link
                  href={m.href}
                  className="theology-tile press-card flex h-[86px] flex-col justify-between rounded-[18px] px-3.5 pb-3 pt-[13px]"
                >
                  <span className="theology-glyph text-paper">
                    <m.Icon size={22} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-serif text-[16.5px] font-bold leading-tight text-paper">
                      <T k={m.label} />
                    </span>
                    <span className="block truncate font-sans text-[11.5px] text-paper/50">
                      <T k={m.kicker} /> · <span className="tabular-nums">{counts[m.key]}</span>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {/* The Ecumenical Councils, by year. */}
          <section className="mt-5" data-theology-councils="">
            <Link href="/councils" className="tap-press flex items-baseline justify-between gap-3">
              <h3 className="font-serif text-[17px] font-bold leading-tight text-paper">
                <T k="study.theology.ecumenicalCouncils" />
              </h3>
              <span className="flex shrink-0 items-center gap-1 font-sans text-[12.5px] tabular-nums text-paper/50">
                {ecumenical.length}
                <ChevronRight size={13} className="rtl:-scale-x-100" />
              </span>
            </Link>
            <ul className="no-scrollbar -mx-5 mt-2.5 flex gap-2.5 overflow-x-auto px-5 pb-1 md:mx-0 md:px-0">
              {ecumenical.map((c) => (
                <li key={c.slug} className="shrink-0">
                  <Link
                    href={`/councils/${c.slug}`}
                    className="theology-tile press-card block h-full w-[132px] rounded-[16px] px-3 pb-3 pt-[11px]"
                  >
                    <span className="block font-serif text-[20px] font-bold tabular-nums leading-tight text-paper">{c.year}</span>
                    <span className="mt-[3px] block font-sans text-[11.5px] leading-[1.35] text-paper/55">{c.byname}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* Kept from the old foot: the Fathers the studies quote, now by face. */}
          <FathersShelf fathers={fathers} />

          {/* Kept from the old foot: Church History, as a band. */}
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
        </section>
      </div>

      {/* Search the library: a pill above the tab bar, on every Theology screen. */}
      <TheologySearch />
    </section>
  );
}
