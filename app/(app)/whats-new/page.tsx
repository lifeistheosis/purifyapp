import { BoardMessage } from "@/components/whats-new/BoardMessage";
import { ChangelogControls } from "@/components/whats-new/ChangelogControls";
import { getServerLocale } from "@/lib/i18n/server";
import { getMessages, t } from "@/lib/i18n";
import { TranslationDisclaimer } from "@/components/i18n/TranslationDisclaimer";
import { T } from "@/components/i18n/T";
import { ReleaseDetails } from "@/components/whats-new/ReleaseDetails";
import type { Entry } from "@/lib/whatsNew/entries";
import { getPatchNotes } from "@/lib/whatsNew/notes";

export const metadata = {
 title: "What's new",
 description:
 "Patch notes and a message from the Purify team about what the site offers today and what's coming next.",
};

const SECTION = "px-5 md:px-8 py-16 md:py-24";


// The changelog nests year > month > day > release. An entry carries only a
// human date string, "August 11, 2026", which is also its group key, so the
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

type DayGroup = { date: string; label: string; entries: Entry[] };
type MonthGroup = { key: string; label: string; days: DayGroup[]; count: number };
type YearGroup = { key: string; label: string; months: MonthGroup[]; count: number };

/**
 * Group entries into year > month > day, preserving array order at every
 * level, exactly as the flat date grouping did. The list is newest first and
 * stays that way; nothing here sorts, so a hand-ordered list is never
 * silently rearranged.
 *
 * A date this cannot parse does not vanish. It gets its own year and month
 * bucket labelled with the raw string and sits where the array already put
 * it, because a release dropping off the page is a worse failure than an
 * ugly heading.
 */
function groupByYearMonthDay(entries: Entry[]): YearGroup[] {
  const years: YearGroup[] = [];

  for (const e of entries) {
    const parsed = parseEntryDate(e.date);
    const yearKey = parsed ? String(parsed.year) : `unparsed:${e.date}`;
    const monthKey = parsed ? `${parsed.year}-${parsed.monthIndex}` : yearKey;

    let year = years[years.length - 1];
    if (!year || year.key !== yearKey) {
      year = {
        key: yearKey,
        label: parsed ? String(parsed.year) : e.date,
        months: [],
        count: 0,
      };
      years.push(year);
    }

    let month = year.months[year.months.length - 1];
    if (!month || month.key !== monthKey) {
      month = {
        key: monthKey,
        label: parsed ? MONTH_NAMES[parsed.monthIndex] : e.date,
        days: [],
        count: 0,
      };
      year.months.push(month);
    }

    let day = month.days[month.days.length - 1];
    if (!day || day.date !== e.date) {
      day = {
        date: e.date,
        // Inside "2026 > August" the year is already overhead, so the day row
        // carries "August 11" rather than repeating the whole string.
        label: parsed
          ? `${MONTH_NAMES[parsed.monthIndex]} ${parsed.day}`
          : e.date,
        entries: [],
      };
      month.days.push(day);
    }

    day.entries.push(e);
    month.count += 1;
    year.count += 1;
  }

  return years;
}

function updateCount(n: number, isDe: boolean): string {
  if (isDe) return `${n} ${n === 1 ? "Aktualisierung" : "Aktualisierungen"}`;
  return `${n} ${n === 1 ? "update" : "updates"}`;
}

export default async function WhatsNewPage() {
 // Live rows when the table answers, the committed file otherwise. See
 // lib/whatsNew/notes.ts for why the page never has to know which.
 const { entries } = await getPatchNotes();
 const years = groupByYearMonthDay(entries);
 const locale = await getServerLocale();
 const isDe = locale === "de";
 const m = getMessages(locale);

 return (
 <section className={`${SECTION} bg-night`}>
 <article className="mx-auto max-w-[760px] w-full">
 {!isDe && <TranslationDisclaimer />}
 {/* Eyebrow + version */}
 <div className="flex items-baseline justify-between flex-wrap gap-3 mb-6">
 <p className="font-sans text-detail font-semibold uppercase tracking-[1.5px] text-paper/55">
 {isDe ? "Was ist neu" : t(m, "whatsnew.eyebrow")}
 </p>
 <p className="font-sans text-caption uppercase tracking-[1.2px] text-paper/55">
 {t(m, "whatsnew.chip")}
 </p>
 </div>

 <h1 className="font-sans text-display-sm md:text-display-lg font-bold leading-[1.05] tracking-[-0.025em] text-paper">
 {t(m, "whatsnew.h1")}
 </h1>

 {/* The weekly note. Written into data/changelog/board.json, newest first.
 It replaced a hand-written block that only got rewritten on a big
 patch and so sat on Beta 1.7 for eight releases. */}
 <div className="mt-10">
 <BoardMessage />
 </div>

 {isDe ? (
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
 className="text-sky-400 underline underline-offset-2 decoration-sky-400/50 hover:decoration-sky-300 hover:text-sky-300"
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
 ) : (
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
 className="text-sky-400 underline underline-offset-2 decoration-sky-400/50 hover:decoration-sky-300 hover:text-sky-300"
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
 )}

 {/* Closing + signature */}
 <div className="mt-16 pt-10 border-t border-paper/10">
 <p className="font-serif text-lede md:text-lede text-paper/85 leading-[1.7]">
 {isDe
 ? "Danke, daß du mit uns gehst. Ehre sei Gott für alles."
                : "Thank you for walking this with us. Glory to God for all things."}
 </p>

 <p
 className="mt-10 font-serif italic text-lede md:text-title-sm tracking-wide text-gold"
 >
 {isDe ? "Von Edgar, dem Purify-Team." : "From Edgar, the Purify Team."}
 </p>
 </div>

 {/* Changelog: dates collapse, releases inside also collapse. */}
 <section className="mt-20 pt-10 border-t border-paper/10" data-changelog>
 <div className="flex items-baseline justify-between flex-wrap gap-3 mb-6">
 <p className="font-sans text-detail font-semibold uppercase tracking-[1.5px] text-paper/55">
 {isDe ? "Versionshinweise" : "Release notes"}
 </p>
 <ChangelogControls />
 </div>
 <p className="font-sans text-detail text-paper/55 mb-8 leading-[1.65]">
 {isDe
 ? "Nach Jahr, dann Monat, dann Tag gruppiert. Der jüngste Tag ist voreingestellt offen; tippe ein Jahr, einen Monat oder einen Tag an, um es aufzuklappen. Innerhalb eines Tages tippe auf eine Version, um ihre vollständige Liste zu lesen."
 : "Grouped by year, then month, then day. The most recent day is open by default; tap any year, month or day to expand it. Inside a day, tap a release to read its full item list."}
 </p>

 <div className="space-y-3">
          {years.map((y, yi) => (
            <details
              key={y.key}
              open={yi === 0}
              className="group/yr rounded-md border border-paper/12 bg-paper/[0.02] open:bg-paper/[0.04] transition-colors"
            >
              <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-3">
                <span className="flex items-baseline gap-3 min-w-0">
                  <span className="font-sans text-ui font-semibold text-paper truncate">
                    {y.label}
                  </span>
                  <span className="font-sans text-caption uppercase tracking-[1.2px] text-paper/55">
                    {updateCount(y.count, isDe)}
                  </span>
                </span>
                <span
                  aria-hidden
                  className="text-paper/55 group-open/yr:rotate-180 transition-transform duration-200 text-caption"
                >
                  ▾
                </span>
              </summary>

              <div className="px-3 pb-4 pt-1 space-y-2">
                {y.months.map((mo, mi) => (
                  <details
                    key={mo.key}
                    open={yi === 0 && mi === 0}
                    className="group/mo rounded-md border border-paper/10 bg-paper/[0.015] open:bg-paper/[0.03] transition-colors"
                  >
                    <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between gap-3">
                      <span className="flex items-baseline gap-3 min-w-0">
                        <span className="font-sans text-detail font-semibold text-paper/90 truncate">
                          {mo.label}
                        </span>
                        <span className="font-sans text-eyebrow uppercase tracking-[1.2px] text-paper/55">
                          {updateCount(mo.count, isDe)}
                        </span>
                      </span>
                      <span
                        aria-hidden
                        className="text-paper/55 group-open/mo:rotate-180 transition-transform duration-200 text-eyebrow"
                      >
                        ▾
                      </span>
                    </summary>

                    <div className="px-3 pb-3 pt-1 space-y-2">
                      {mo.days.map((d, di) => (
                        <details
                          key={d.date}
                          open={yi === 0 && mi === 0 && di === 0}
                          className="group/day rounded-md border border-paper/10 bg-night-soft/25 open:bg-night-soft/45 transition-colors"
                        >
                          <summary className="cursor-pointer list-none px-4 py-2.5 flex items-center justify-between gap-3">
                            <span className="flex items-baseline gap-3 min-w-0">
                              <span
                                title={d.date}
                                className="font-sans text-detail font-medium text-paper/85 truncate"
                              >
                                {d.label}
                              </span>
                              <span className="font-sans text-eyebrow uppercase tracking-[1.2px] text-paper/55">
                                {updateCount(d.entries.length, isDe)}
                              </span>
                            </span>
                            <span
                              aria-hidden
                              className="text-paper/55 group-open/day:rotate-180 transition-transform duration-200 text-eyebrow"
                            >
                              ▾
                            </span>
                          </summary>

                          <div className="px-3 pb-3 pt-1 space-y-2">
                            {d.entries.map((e) => (
                              <ReleaseDetails key={e.version} entry={e} />
                            ))}
                          </div>
                        </details>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </details>
          ))}
 </div>
 </section>
 </article>
 </section>
 );
}
