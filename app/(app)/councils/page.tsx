import Link from "next/link";
import { T } from "@/components/i18n/T";
import { CouncilMap } from "@/components/councils/CouncilMap";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { GalleryBand } from "@/components/ui/GalleryBand";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";
import { councilMap } from "@/lib/councils/map";
import { NUMERALS, councilFocus, councilLine, councilPicture, councilsInOrder, isCirca, placeOf, shortName } from "@/lib/councils/page";
import { IS_STATIC_EXPORT } from "@/lib/platform/buildTarget";

export const metadata = {
 title: "The Ecumenical Councils",
 description:
 "The seven Ecumenical Councils of the Orthodox Church, with their Definitions, Canons, and historical context.",
};

/**
 * The councils (1.8, the owner's pick of r3-03, 2026-10-30: "I like the
 * selection page for A"; the sheet is Homebase/boards/purify-master/
 * variants/r3-03-councils.png). The page names itself, then the seven as a
 * gallery of their icons, a band each, the way Theology and Discover are
 * galleries (components/ui/GalleryBand.tsx): each band its numeral and year
 * at the top, its name and History's one line on it at the foot. Under them
 * the local and regional councils, as rows by year. Then the posture the
 * pages keep, and the map of where they met, which stays where it was (its
 * own design round is next).
 *
 * Until 1.8 the page was nineteen text cards in one column, with no
 * pictures (his build 80 note 10: "the page where you pick a council").
 */
export default function CouncilsPage() {
 const { seven, local } = councilsInOrder();
 return (
 <>
 <MobileTopBar titleKey="councils.eyebrow" back backFallback="/discover" revealTitleOn="councils-title" />
 <section className="bg-night px-5 md:px-8 pt-6 pb-16 md:py-24">
 <div className="mx-auto max-w-[1200px] w-full">
 <p className="font-sans text-caption font-semibold text-paper/60">
 <T k="councils.eyebrow" />
 </p>
 <h1 id="councils-title" className="mt-2 max-w-[560px] font-serif text-[27px] font-bold leading-[1.13] tracking-[-0.01em] text-balance text-paper md:text-display-sm">
 <T k="councils.h1" />
 </h1>

 {/* The seven, a band each with its icon. */}
 <ul className="mt-6 grid grid-cols-1 gap-2.5 md:mt-10 md:grid-cols-2 md:gap-4">
 {seven.map((c, i) => {
 const picture = councilPicture(c.slug, IS_STATIC_EXPORT);
 if (!picture) return null;
 return (
 <li key={c.slug}>
 <GalleryBand
  href={`/councils/${c.slug}`}
  size="tall"
  picture={picture.src}
  preview={picture.preview}
  focus={councilFocus(c.slug)}
  credit={picture.credit}
  kicker={
  <span className="flex items-baseline gap-[7px]">
  <span className="font-serif text-detail font-semibold tracking-[0.08em] text-paper/65">{NUMERALS[c.ordinal ?? 0]}</span>
  <span className="font-sans text-caption font-semibold text-paper/50">{c.year}</span>
  </span>
  }
  title={c.byname}
  line={councilLine(c)}
  // The first three are on a phone's first screen.
  priority={i < 3}
 />
 </li>
 );
 })}
 </ul>

 {/* The local and regional councils, by year. */}
 {local.length > 0 && (
 <section aria-labelledby="local-councils" className="mt-12">
 <div className="flex items-baseline justify-between gap-4">
 <h2 id="local-councils" className="text-[19px] font-semibold leading-tight tracking-[-0.01em] text-paper md:text-title-sm">
 <T k="study.councils.localRegional" />
 </h2>
 <span className="font-sans text-detail text-paper/55 tabular-nums">{local.length}</span>
 </div>
 <p className="mt-2 max-w-[720px] font-sans text-detail leading-[1.6] text-paper/55">
 <T k="study.beyondTheSevenTheEarly" />
 </p>
 <ul className="mt-3 md:grid md:grid-cols-2 md:gap-x-10">
 {local.map((c) => (
 <li key={c.slug} className="border-t border-paper/8">
 <Link href={`/councils/${c.slug}`} className="press-card flex items-center gap-3.5 py-3">
 <span className="min-w-[52px] shrink-0 whitespace-nowrap font-sans text-detail font-semibold tabular-nums text-paper/50">
 {isCirca(c) ? <T k="councils.circa" replacements={{ year: c.year }} /> : c.year}
 </span>
 <span className="min-w-0 flex-1">
 <span className="block truncate font-sans text-[15px] font-semibold text-paper">{shortName(c.byname)}</span>
 <span className="mt-px block truncate font-sans text-caption text-paper/50">{placeOf(c.location)}</span>
 </span>
 <ChevronRight size={16} className="shrink-0 text-paper/40 rtl:-scale-x-100" />
 </Link>
 </li>
 ))}
 </ul>
 </section>
 )}

 {/* What the pages keep to, and where they come from. */}
 <div className="mt-12 max-w-[720px] space-y-3 border-t border-paper/8 pt-6">
 <p className="font-sans text-detail leading-[1.6] text-paper/55">
 <T k="study.theSevenCouncilsOfThe" />
 </p>
 <p className="font-sans text-detail leading-[1.6] text-paper/55">
 <T k="study.postureWhereTheFathersSpoke" /> <Link href="/about" className="underline underline-offset-2 decoration-paper/30 hover:decoration-paper"><T k="study.about" /></Link> <T k="study.councils.stanceTail" />
 </p>
 </div>

 <CouncilMap {...councilMap()} />
 </div>
 </section>
 </>
 );
}
