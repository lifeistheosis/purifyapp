import type { ReactNode } from "react";
import Link from "next/link";
import { T } from "@/components/i18n/T";
import { LESSONS } from "@/lib/prayers/learning";
import { PrayerIcon } from "@/components/prayers/PrayerIcon";
import { PrayerSlideshowHero } from "@/components/prayers/PrayerSlideshow";
import { PrayersMobile } from "@/components/mobile/PrayersMobile";
import { PrayersDayCard } from "@/components/prayers/PrayersDayCard";
import {
  PrayerMasthead,
  PrayerSectionLabel,
  PrayerIndex,
  PrayerIndexRow,
  PrayerNote,
} from "@/components/prayers/PrayerBook";
import { PrayerSearch } from "@/components/prayers/PrayerSearch";
import { ContinuePraying } from "@/components/prayers/ContinuePraying";
import { SuggestedToday } from "@/components/prayers/SuggestedToday";
import {
  RULE_CATEGORY_ORDER,
  indexRules,
  popularRules,
  type RuleMeta,
} from "@/lib/prayers/rules";
import { getServerLocale } from "@/lib/i18n/server";

/**
 * Catalog key for each rule category. The registry still carries a
 * legacy { en, de } label pair, which only ever covered two languages;
 * the section headings read the catalog instead so they render in every
 * locale. The registry table itself is left alone.
 */
const CATEGORY_KEY = {
  daily: "prayers.category.daily",
  "daily-life": "prayers.category.dailyLife",
  "church-year": "saints.theChurchYear",
  devotional: "prayers.category.devotional",
} as const;

function titleOf(r: RuleMeta, isDe: boolean): string {
  return isDe ? r.titleDe ?? r.title : r.title;
}

function descriptionOf(r: RuleMeta, isDe: boolean): string | undefined {
  return isDe ? r.descriptionDe ?? r.description : r.description;
}

/** "~8 min", as one interpolated catalog string rather than a concatenation. */
function minutesMeta(minutes: number | undefined): ReactNode {
  if (!minutes) return undefined;
  return <T k="prayers.aboutMinutes" replacements={{ minutes }} />;
}

export const metadata = {
  title: "Prayer",
  description:
    "Daily prayer in the Orthodox tradition: today's rule, morning and evening rules, the prayer of the heart, akathists, the liturgical hours, and a beginner's path.",
};

// No `revalidate`: getServerLocale() awaits cookies(), so this page is
// already dynamic on the web, and under `output: "export"` ISR does not
// exist. Everything day-dependent now resolves on the device.

export default async function PrayersPage() {
  const locale = await getServerLocale();
  const isDe = locale === "de";
  // "Also in this book" — the surfaces with their own dedicated UI, shown as
  // tiles on the desktop grid.
  const alsoEntries: {
    href: string;
    title: ReactNode;
    description: ReactNode;
    meta?: ReactNode;
  }[] = [
    {
      href: "/prayers/today",
      title: <T k="prayers.tabs.today" />,
      description: <T k="prayers.also.todayDesc" />,
    },
    {
      href: "/prayers/hours",
      title: <T k="prayers.hours" />,
      description: <T k="prayers.also.hoursDesc" />,
    },
    {
      href: "/prayers/akathists",
      title: <T k="prayers.also.akathistsTitle" />,
      description: <T k="prayers.also.akathistsDesc" />,
    },
    {
      href: "/prayers/rope",
      title: <T k="prayers.also.ropeTitle" />,
      description: <T k="prayers.also.ropeDesc" />,
    },
    // Anthem deliberately omitted from `alsoEntries` — it has its own
    // featured band immediately under the hero so it doesn't hide
    // behind the long category list.
    {
      href: "/prayers/learning",
      title: <T k="ui.learnToPray" />,
      description: <T k="prayers.also.learningDesc" />,
      meta: <T k="prayers.lessonCount" count={LESSONS.length} />,
    },
  ];

  return (
    <>
      <PrayersMobile />
      <div className="hidden md:block">
        <section className="relative isolate overflow-hidden bg-night min-h-screen">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-[460px]"
            aria-hidden
          >
            <PrayerSlideshowHero priority className="opacity-[0.16]" />
            <div className="absolute inset-0 bg-gradient-to-b from-night/55 via-night/80 to-night" />
          </div>

          <div className="relative z-10 mx-auto w-full max-w-[1200px] px-8 lg:px-12 py-16 lg:py-20">
            <PrayerMasthead
              align="center"
              eyebrow={<T k="footer.prayer" />}
              title={<T k="ui.prayWithoutCeasing" />}
              scripture={<T k="ui.1Thessalonians517" />}
              intro={
                <p className="mx-auto max-w-[46ch] text-center">
                  <T k="prayers.index.intro" />
                </p>
              }
            >
              <PrayerIcon slug="christ-pantocrator" size="md" priority />
            </PrayerMasthead>

            {/* Hero band: the prayer of the heart beside the day, two columns. */}
            <div className="grid items-stretch gap-6 lg:grid-cols-[1.55fr_1fr] lg:gap-8">
              {/* The prayer of the heart — a calm feature panel. */}
              <div className="flex flex-col justify-center rounded-xl border border-paper/12 bg-paper/[0.02] px-8 py-12 text-center">
                <p className="mb-6 font-sans text-eyebrow uppercase tracking-[2.5px] text-paper/40">
                  <T k="prayers.heart.eyebrow" />
                </p>
                <p className="font-serif text-title-sm lg:text-title leading-[1.5] text-paper/90">
                  <>
                    <T k="prayers.heart.line1" />
                    <br />
                    <T k="prayers.heart.line2" />
                    <br />
                    <T k="prayers.heart.line3" />
                  </>
                </p>
                <p className="mx-auto mt-6 max-w-[44ch] font-serif italic text-detail text-paper/55 leading-[1.7]">
                  <T k="prayers.heart.note" />
                </p>
                <p className="mt-6">
                  <Link
                    href="/prayers/learning/jesus-prayer"
                    className="font-sans text-detail font-medium text-gold/80 underline decoration-gold/30 underline-offset-4 transition-colors hover:text-paper hover:decoration-paper"
                  >
                    <T k="ui.learnHowToPrayIt" />
                  </Link>
                </p>
              </div>

              {/* The day, as a card. Client-side: this tree ships into
                  the Android export, where a server component freezes the
                  date at build time. */}
              <PrayersDayCard />
            </div>

            {/* Featured: The Prayer Rope Anthem, a hymn to accompany
                the rope, lifted out of the long "Also in this book"
                tile grid so it doesn't hide at the foot of the page.
                Sits as a quiet emphasized band right under the hero,
                between the prayer of the heart and the discovery
                rails, the natural place a hymn for the rope belongs.
                Neutral paper-toned palette throughout, no gold accents,
                so the card emphasizes through size and position rather
                than colour. */}
            <Link
              href="/prayers/anthem"
              className="group mt-8 block overflow-hidden rounded-xl border border-paper/20 bg-paper/[0.02] px-7 py-7 transition-colors hover:border-paper/40 hover:bg-paper/[0.04] md:px-10 md:py-8"
            >
              <div className="flex items-center gap-5 md:gap-7">
                {/* Decorative play-triangle inside a paper-ringed disc,
                    the hymn-feature's only icon. */}
                <span
                  aria-hidden
                  className="shrink-0 inline-flex h-14 w-14 items-center justify-center rounded-full border border-paper/30 bg-paper/[0.04] text-paper/85 transition-transform duration-200 group-hover:scale-[1.04] md:h-16 md:w-16"
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="translate-x-[1px]"
                  >
                    <path d="M7 5.5v13l11-6.5L7 5.5z" />
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-sans text-eyebrow uppercase tracking-[2.5px] text-paper/50">
                    <T k="prayers.anthem.bandKicker" />
                  </p>
                  <h2 className="mt-2 font-display-serif text-title-sm text-paper leading-snug transition-colors group-hover:text-paper md:text-title">
                    <T k="today.prayNow.anthemTitle" />
                  </h2>
                  <p className="mt-2 font-serif italic text-detail text-paper/65 leading-[1.65] md:text-ui">
                    <T k="prayers.anthem.bandBody" />
                  </p>
                </div>
                <span
                  aria-hidden
                  className="hidden shrink-0 self-center font-serif text-lede text-paper/40 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-paper md:inline-flex"
                >
                  →
                </span>
              </div>
            </Link>

            {/* Discovery rails — resume + today's context, side by side. */}
            <div className="mt-6 grid gap-x-12 lg:grid-cols-2">
              <div>
                <ContinuePraying label={<T k="ui.continuePraying" />} />
              </div>
              <div>
                <SuggestedToday label={<T k="ui.suggestedForToday" />} />
              </div>
            </div>

            {/* Search wraps the index sections so a typed query replaces
                the popular + categorized + "Also in this book" lists with a
                filtered, grouped result list. When the input is empty the
                children render unchanged. */}
            <div className="mt-16">
              <PrayerSearch
                placeholder={
                  isDe
                    ? "Gebete, das Seil, die Horen durchsuchen"
                    : "Search prayers, the rope, the hours"
                }
              >
            {popularRules().length > 0 && (
              <div>
                <PrayerSectionLabel>
                  <T k="ui.popularPrayerRules" />
                </PrayerSectionLabel>
                <PrayerIndex>
                  {popularRules().map((r) => (
                    <PrayerIndexRow
                      key={r.id}
                      href={r.href}
                      title={titleOf(r, isDe)}
                      description={descriptionOf(r, isDe)}
                      meta={minutesMeta(r.estimatedMinutes)}
                    />
                  ))}
                </PrayerIndex>
              </div>
            )}

            {/* The book proper — every prayer rule, by category, two columns. */}
            <div className="mt-8 grid gap-x-12 gap-y-10 md:grid-cols-2">
              {RULE_CATEGORY_ORDER.map((category) => {
                const rules = indexRules(category);
                if (rules.length === 0) return null;
                return (
                  <div key={category}>
                    <PrayerSectionLabel>
                      <T k={CATEGORY_KEY[category]} />
                    </PrayerSectionLabel>
                    <PrayerIndex>
                      {rules.map((r) => (
                        <PrayerIndexRow
                          key={r.id}
                          href={r.href}
                          title={titleOf(r, isDe)}
                          description={descriptionOf(r, isDe)}
                          planned={r.planned}
                          plannedLabel={<T k="study.planned" />}
                          meta={minutesMeta(r.estimatedMinutes)}
                        />
                      ))}
                    </PrayerIndex>
                  </div>
                );
              })}
            </div>

            {/* Also in this book — surfaces with their own UI, as tiles. */}
            <div className="mt-16">
              <PrayerSectionLabel>
                <T k="prayers.alsoInThisBook" />
              </PrayerSectionLabel>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {alsoEntries.map((e) => (
                  <Link
                    key={e.href}
                    href={e.href}
                    className="group flex flex-col rounded-lg border border-paper/12 bg-paper/[0.02] px-5 py-5 transition-colors hover:border-paper/30 hover:bg-paper/[0.04]"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <h2 className="font-serif text-title-sm text-paper/90 leading-snug transition-colors group-hover:text-paper">
                        {e.title}
                      </h2>
                      {e.meta && (
                        <span className="shrink-0 font-sans text-caption text-paper/35 tabular-nums">
                          {e.meta}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 font-sans text-detail text-paper/50 leading-[1.6]">
                      {e.description}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
              </PrayerSearch>
            </div>

            <PrayerNote>
              <T k="prayers.deviceNote" />{" "}
              <Link
                href="/account"
                className="text-paper/55 underline decoration-paper/25 underline-offset-2 hover:text-paper"
              >
                <T k="prayers.yourAccountLink" />
              </Link>
            </PrayerNote>
          </div>
        </section>
      </div>
    </>
  );
}
