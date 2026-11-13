import { BoardMessage } from "@/components/whats-new/BoardMessage";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import { ChangelogControls } from "@/components/whats-new/ChangelogControls";
import { WhatsNewCount, WhatsNewDisclaimer, WhatsNewWelcome, WhatsNewWord } from "@/components/whats-new/WhatsNewInReadersLanguage";
import { T } from "@/components/i18n/T";
import { ReleaseDetails } from "@/components/whats-new/ReleaseDetails";
import { ReleaseHighlights } from "@/components/whats-new/ReleaseHighlights";
import { TakeTheTour } from "@/components/whats-new/TakeTheTour";
import type { Entry } from "@/lib/whatsNew/entries";
import { RELEASE_HIGHLIGHTS } from "@/lib/whatsNew/highlights";
import { getPatchNotes } from "@/lib/whatsNew/notes";
import { releaseName } from "@/lib/whatsNew/releaseName";
import { ChevronDown } from "@/components/ui/icons/ChevronDown";

// The page's own English words, and their German in data/pages/whats-new.de.json (1.9).
const CLOSING = "Thank you for walking this with us. Glory to God for all things.";
const SIGNATURE = "From Edgar, the Purify Team.";
const RELEASE_NOTES = "Release notes";
const GROUPED = "Newest first, by month. The latest month is open; tap any other to see its releases, and tap a release to read its full list.";

export const metadata = {
 title: "What's new",
 description:
 "Patch notes and a message from the Purify team about what the site offers today and what's coming next.",
};

const SECTION = "px-5 md:px-8 py-16 md:py-24";


// The changelog is one level (the arbiter, 2026-11-11: "What's new's old
// notes sit inside four nested boxes; one level"): the year is a heading,
// each month a row that opens, and a release the one box, wearing its own
// date. An entry carries only a human date string, "August 11, 2026", so the
// year and month are read back out of that one field rather than stored a
// second time. One release, one date, written once.
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type ParsedDate = { year: number; monthIndex: number; day: number };

function parseEntryDate(date: string): ParsedDate | null {
  const m = /^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/.exec(date.trim());
  if (!m) return null;
  const monthIndex = MONTH_NAMES.findIndex(
    (name) => name.toLowerCase() === m[1].toLowerCase(),
  );
  if (monthIndex < 0) return null;
  return { year: Number(m[3]), monthIndex, day: Number(m[2]) };
}

type Dated = { entry: Entry; when: string };
type MonthGroup = { key: string; label: string; entries: Dated[] };
type YearGroup = { key: string; label: string; months: MonthGroup[]; count: number };

/**
 * Group entries into year > month, preserving array order at every level.
 * The list is newest first and stays that way; nothing here sorts, so a
 * hand-ordered list is never silently rearranged.
 *
 * A date this cannot parse does not vanish. It gets its own year and month
 * bucket labelled with the raw string and sits where the array already put
 * it, because a release dropping off the page is a worse failure than an
 * ugly heading.
 */
function groupByYearMonth(entries: Entry[]): YearGroup[] {
  const years: YearGroup[] = [];

  for (const e of entries) {
    const parsed = parseEntryDate(e.date);
    const yearKey = parsed ? String(parsed.year) : `unparsed:${e.date}`;
    const monthKey = parsed ? `${parsed.year}-${parsed.monthIndex}` : yearKey;

    let year = years[years.length - 1];
    if (!year || year.key !== yearKey) {
      year = { key: yearKey, label: parsed ? String(parsed.year) : e.date, months: [], count: 0 };
      years.push(year);
    }

    let month = year.months[year.months.length - 1];
    if (!month || month.key !== monthKey) {
      month = { key: monthKey, label: parsed ? MONTH_NAMES[parsed.monthIndex] : e.date, entries: [] };
      year.months.push(month);
    }

    // Under "2026" and "August" the release says "August 11", not the whole string again.
    month.entries.push({ entry: e, when: parsed ? `${MONTH_NAMES[parsed.monthIndex]} ${parsed.day}` : e.date });
    year.count += 1;
  }

  return years;
}

async function WhatsNewContent() {
 // Live rows when the table answers, the committed file otherwise. See
 // lib/whatsNew/notes.ts for why the page never has to know which.
 const { entries } = await getPatchNotes();
 const years = groupByYearMonth(entries);
 // The page writes the English; the words it has in German are drawn on the
 // device (components/whats-new/WhatsNewInReadersLanguage.tsx).

 return (
 <section className={`${SECTION} bg-night`}>
 <article className="mx-auto max-w-[760px] w-full">
 <WhatsNewDisclaimer />
 {/* Eyebrow + version */}
 <div className="flex items-baseline justify-between flex-wrap gap-3 mb-6">
 <p className="font-sans text-detail font-semibold text-paper/55">
 <WhatsNewWord k="eyebrow"><T k="whatsnew.eyebrow" /></WhatsNewWord>
 </p>
 <p className="font-sans text-caption text-paper/55">
 <T k="whatsnew.chip" />
 </p>
 </div>

 <h1 id="whats-new-title" className="font-sans text-display-sm md:text-display-lg font-bold leading-[1.05] tracking-[-0.025em] text-paper">
 <T k="whatsnew.h1" />
 </h1>
 
 {/* The current release, a pill per feature; a tap shows what it looks
 like. The same pills as its announcement image. Its name, when it has
 one, is read from the notes here and handed down. */}
 <div className="mt-10">
 <ReleaseHighlights name={releaseName(RELEASE_HIGHLIGHTS.version, entries)} />
 </div>

 {/* The release's guided tour, again or for the first time (1.8). The
 tour's end card names this row. Draws nothing for a release with no
 tour. */}
 <div className="mt-4">
 <TakeTheTour />
 </div>

 {/* The weekly note. Written into data/changelog/board.json, newest first.
 It replaced a hand-written block that only got rewritten on a big
 patch and so sat on Beta 1.7 for eight releases. */}
 <div className="mt-10">
 <BoardMessage />
 </div>

 <WhatsNewWelcome
 german={
 <>
 <p className="mt-8 font-serif text-lede md:text-lede text-paper/85 leading-[1.7]">
 <T k="ui.wennDuNeuHierBist" />
 </p>

 <p className="mt-5 font-serif text-lede md:text-lede text-paper/85 leading-[1.7]">
 <T k="ui.derMitAbstandBesteOrt" />{" "}
 <a
 href="https://discord.gg/VzBYYUsNJ6"
 target="_blank"
 rel="noopener noreferrer"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 <T k="ui.hier" />
 </a>{" "}
 <T k="ui.bei" />
 </p>

 <p className="mt-5 font-serif text-lede md:text-lede text-paper/85 leading-[1.7]">
 <T k="ui.dieArbeitDarunterBleibtDieselbe" />
 </p>

 <p className="mt-5 font-serif text-lede md:text-lede text-paper/85 leading-[1.7]">
 <T k="ui.dasVollstNdigeVersionsprotokollLebt" />
 </p>
 </>
 }
 >
 <>
 <p className="mt-8 font-serif text-lede md:text-lede text-paper/85 leading-[1.7]">
 <T k="ui.ifYouAreNewHere" />
 </p>

 <p className="mt-5 font-serif text-lede md:text-lede text-paper/85 leading-[1.7]">
 <T k="ui.theSingleBestPlaceTo" />{" "}
 <a
 href="https://discord.gg/VzBYYUsNJ6"
 target="_blank"
 rel="noopener noreferrer"
 className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
 >
 <T k="ui.here" />
 </a>
 .
 </p>

 <p className="mt-5 font-serif text-lede md:text-lede text-paper/85 leading-[1.7]">
 <T k="ui.theWorkUnderneathStaysThe" />
 </p>

 <p className="mt-5 font-serif text-lede md:text-lede text-paper/85 leading-[1.7]">
 <T k="ui.theFullReleaseByRelease" />
 </p>
 </>
 </WhatsNewWelcome>

 {/* Closing + signature */}
 <div className="mt-16 pt-10 border-t border-paper/10">
 <p className="font-serif text-lede md:text-lede text-paper/85 leading-[1.7]">
 <WhatsNewWord k="closing"><span lang="en" dir="ltr">{CLOSING}</span></WhatsNewWord>
 </p>

 <p
 className="mt-10 font-serif italic text-lede md:text-title-sm tracking-wide text-gold"
 >
 <WhatsNewWord k="signature"><span lang="en" dir="ltr">{SIGNATURE}</span></WhatsNewWord>
 </p>
 </div>

 {/* Changelog: a month opens to its releases, and a release to its list. */}
 <section className="mt-20 pt-10 border-t border-paper/10" data-changelog>
 <div className="flex items-baseline justify-between flex-wrap gap-3 mb-6">
 <p className="font-sans text-detail font-semibold text-paper/55">
 <WhatsNewWord k="releaseNotes"><span lang="en" dir="ltr">{RELEASE_NOTES}</span></WhatsNewWord>
 </p>
 <ChangelogControls />
 </div>
 <p className="font-sans text-detail text-paper/55 mb-8 leading-[1.65]">
 <WhatsNewWord k="grouped"><span lang="en" dir="ltr">{GROUPED}</span></WhatsNewWord>
 </p>

 <div>
          {/* One level: the year a heading, a month a row that opens (no box
              round it, a hairline above it), a release the one box. */}
          {years.map((y, yi) => (
            <section key={y.key} aria-labelledby={`changelog-${y.key}`} className={yi > 0 ? "mt-10" : undefined}>
              <h3 id={`changelog-${y.key}`} className="flex items-baseline gap-3 pb-2">
                <span lang="en" dir="ltr" className="font-sans text-ui font-semibold text-paper">
                  {y.label}
                </span>
                <span className="font-sans text-caption text-paper/55">
                  <WhatsNewCount n={y.count} />
                </span>
              </h3>
              {y.months.map((mo, mi) => (
                <details key={mo.key} open={yi === 0 && mi === 0} className="group/mo border-t border-paper/10">
                  <summary className="cursor-pointer list-none min-h-11 py-3 flex items-center justify-between gap-3">
                    <span className="flex items-baseline gap-3 min-w-0">
                      <span lang="en" dir="ltr" className="font-sans text-detail font-semibold text-paper/90 truncate">
                        {mo.label}
                      </span>
                      <span className="font-sans text-caption text-paper/55">
                        <WhatsNewCount n={mo.entries.length} />
                      </span>
                    </span>
                    <span
                      aria-hidden
                      className="text-paper/55 group-open/mo:rotate-180 transition-transform motion-reduce:transition-none duration-200 text-eyebrow"
                    >
                      <ChevronDown size={12} className="block" />
                    </span>
                  </summary>

                  <div className="pb-5 space-y-2">
                    {mo.entries.map(({ entry, when }) => (
                      <ReleaseDetails key={entry.version} entry={entry} when={when} />
                    ))}
                  </div>
                </details>
              ))}
            </section>
          ))}
 </div>
 </section>
 </article>
 </section>
 );
}

/*
 * On a phone the page wears the bar every screen under You wears (1.8): the
 * way back, and the page's name once its own heading has gone up under the
 * bar. It is a row of Settings, and wore the apps' plain back bar until then.
 */
export default async function WhatsNewPage() {
  return (
    <>
      <MobileTopBar titleKey="nav.whatsNew" back backFallback="/settings" revealTitleOn="whats-new-title" />
      <WhatsNewContent />
    </>
  );
}
