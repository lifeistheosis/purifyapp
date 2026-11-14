import Link from "next/link";
import { heroTitle } from "@/lib/saints/page";
import type { Saint } from "@/lib/saints/saints";
import { SaintIcon } from "./SaintIcon";
import { FeastDays } from "./FeastDays";
import { T } from "@/components/i18n/T";
import { ChevronRight } from "@/components/ui/icons/ChevronRight";

export function SaintCard({ saint }: { saint: Saint }) {
  return (
    <Link
      href={`/saints/${saint.slug}`}
      // No prefetch. Next prefetches every <Link> that enters the viewport,
      // and this card renders once per saint in a grid that can hold the full
      // 1,093-entry set. Scrolling the index therefore fires a continuous
      // stream of RSC fetches for lives the reader has not asked for, on the
      // same main thread that is trying to scroll. In the bundled Android app
      // there is no network latency for that prefetch to hide: the page is
      // already on the device, so the tap is fast either way.
      prefetch={false}
      // `press-card` owns the transition (transform + color + background on
      // the house curve), so the old `transition-all` is gone: it animated
      // every animatable property including layout ones, and the card had no
      // press response at all on a phone, where there is no hover.
      //
      // h-full, flex-col and a growing body: the grid stretches the .cv-card
      // wrapper to the tallest card in the row, and without these the card
      // stopped at its own content. A saint whose name fits on one line got a
      // shorter card, with its feast line riding higher than its neighbours'.
      className="press-card group flex h-full flex-col rounded-lg bg-night border border-paper/8 p-5 hover:border-paper/25"
    >
      <div className="flex grow gap-5">
        <SaintIcon saint={saint} size="md" />
        <div className="min-w-0 flex flex-col">
          {/* The gold line shows whole, on as many lines as it needs. It was cut
              at one, and it is the first thing a card says: for a card of several
              saints it is their names ("Daniel, Ananias, Azarias and Mi..."), and
              the gate's rule for a name cut short failed 29 cards at a phone's
              width and 68 on a tablet (2026-11-11). A second line is 20px; what
              that does to the grid is measured in notes/themes-fable.md, section
              56. Balanced, so two lines are two of a length and not one word
              left alone. */}
          {saint.byname && (
            <p lang="en" dir="ltr" className="font-serif text-detail italic text-gold/90 mb-1 text-balance rtl:text-right">
              &ldquo;{saint.byname}&rdquo;
            </p>
          )}
          <h3 lang="en" dir="ltr" className="font-sans text-lede font-semibold text-paper leading-tight rtl:text-right">
            {saint.name}
          </h3>
          {/* The line under the name is the saint's first title, whole: his office or his
              place, which is what his own page shows under his name (lib/saints/page.ts,
              heroTitle). It was every title he has, joined by dots and cut at one line, and
              it was cut on 212 of the 269 cards at a phone's width (2026-11-11; the arbiter's
              word on a still of two ways, notes/build-93/saints-grey-line-two-ways.png). For
              a card of several saints the first title is their names, and they are all said. */}
          <p lang="en" dir="ltr" className="font-sans text-detail text-paper/55 mt-1.5 rtl:text-right">
            {heroTitle(saint.epithet)}
          </p>
          <p lang="en" dir="ltr" className="mt-3 font-sans text-ui text-paper/70 leading-relaxed line-clamp-3">
            {saint.shortBio}
          </p>
        </div>
      </div>
      <div className="mt-5 pt-4 border-t border-paper/8 flex items-center justify-between gap-3 text-caption">
        <span className="font-sans font-semibold text-paper/45">
          <T k="saints.feastLabel" /> <FeastDays days={saint.feastDays.slice(0, 1)} brief />
        </span>
        {/* Said only when there is one. A saint who left no writing, a martyr most often,
            was given "0 works": 124 of the 270 cards (the arbiter's word of 2026-11-11, on
            the Fathers of Sinai and Raithu). The row spreads its parts between its two
            ends, so the feast keeps its start and Read its end with the count gone. */}
        {saint.works.length > 0 && (
          <span className="font-sans text-paper/55 tabular-nums">
            <T k="saints.workCount" count={saint.works.length} />
          </span>
        )}
        <span className="inline-flex items-center gap-1 font-sans text-paper/45 group-hover:text-paper transition-colors duration-150">
          <T k="saints.read" />
          <ChevronRight size={14} aria-hidden className="shrink-0 rtl:-scale-x-100" />
        </span>
      </div>
    </Link>
  );
}
