import Link from "next/link";
import { LESSONS } from "@/lib/prayers/learning";
import { MobileTopBar } from "@/components/nav/MobileTopBar";
import {
  commemorationsOn,
  fastingStatus,
  formatMonthDay,
  paschaInfo,
  startOfDayUtc,
  type FastKind,
} from "@/lib/calendar/orthodox";
import { PrayerIcon } from "@/components/prayers/PrayerIcon";
import { PrayerSlideshowHero } from "@/components/prayers/PrayerSlideshow";
import { PrayersMobile } from "@/components/mobile/PrayersMobile";
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
  RULE_CATEGORY_LABEL,
  rulesByCategory,
  popularRules,
  type RuleMeta,
} from "@/lib/prayers/rules";
import { seasonFor, isFastDay } from "@/lib/prayers/season";
import { getServerLocale } from "@/lib/i18n/server";

function titleOf(r: RuleMeta, isDe: boolean): string {
  return isDe ? r.titleDe ?? r.title : r.title;
}

function descriptionOf(r: RuleMeta, isDe: boolean): string | undefined {
  return isDe ? r.descriptionDe ?? r.description : r.description;
}

export const metadata = {
  title: "Prayer",
  description:
    "Daily prayer in the Orthodox tradition: today's rule, morning and evening rules, the prayer of the heart, akathists, the liturgical hours, and a beginner's path.",
};

// Hourly ISR so the day strip rolls forward without a redeploy.
export const revalidate = 3600;

const FAST_DOT: Record<FastKind, string> = {
  strict: "bg-crimson",
  "wine-oil": "bg-gold",
  fish: "bg-sage",
  fast: "bg-paper/40",
  "fast-free": "bg-emerald-400",
  normal: "bg-paper/30",
};

export default async function PrayersPage() {
  const locale = await getServerLocale();
  const isDe = locale === "de";
  const today = startOfDayUtc(new Date());
  const fast = fastingStatus(today);
  const pascha = paschaInfo(today);
  const season = seasonFor(today);
  const isFast = isFastDay(today);
  const commemorations = commemorationsOn(today);
  const headline =
    commemorations.find((c) => c.kind === "feast") ?? commemorations[0];

  const paschaLine =
    pascha.daysAway > 0
      ? isDe
        ? `${pascha.daysAway} Tage bis Pascha`
        : `${pascha.daysAway} days to Pascha`
      : pascha.daysAway === 0
        ? isDe
          ? "Pascha ist heute"
          : "Pascha is today"
        : pascha.label;

  // "Also in this book" — the surfaces with their own dedicated UI, shown as
  // tiles on the desktop grid.
  const alsoEntries: {
    href: string;
    title: string;
    description: string;
    meta?: string;
  }[] = [
    {
      href: "/prayers/today",
      title: isDe ? "Heute" : "Today",
      description: isDe
        ? "Fasten, Gedächtnisse und Namenstage des heutigen Tages."
        : "Today's fast, commemorations, and namedays.",
    },
    {
      href: "/prayers/hours",
      title: isDe ? "Die Horen" : "The Hours",
      description: isDe
        ? "Kurze Gebete, die den Tag heiligen."
        : "Short prayers that sanctify the daylight.",
    },
    {
      href: "/prayers/akathists",
      title: isDe ? "Die Akathiste" : "The Akathists",
      description: isDe
        ? "Lange Lobgesänge, im Stehen gebetet."
        : "Long hymns of praise, prayed standing throughout.",
    },
    {
      href: "/prayers/rope",
      title: isDe ? "Das Gebetsseil" : "The prayer rope",
      description: isDe
        ? "Zähle das Jesusgebet am Knotenseil."
        : "Tell the Jesus Prayer on the knotted rope.",
    },
    // Anthem deliberately omitted from `alsoEntries` — it has its own
    // featured band immediately under the hero so it doesn't hide
    // behind the long category list.
    {
      href: "/prayers/learning",
      title: isDe ? "Beten lernen" : "Learn to pray",
      description: isDe
        ? "Ein kurzer Einsteiger-Weg durch das Gebet."
        : "A short, beginner's path through Orthodox prayer.",
      meta: isDe ? `${LESSONS.length} Lektionen` : `${LESSONS.length} lessons`,
    },
  ];

  return (
    <>
      <PrayersMobile />
      <div className="hidden md:block">
        <MobileTopBar title={isDe ? "Gebete" : "Prayers"} />
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
              eyebrow={isDe ? "Das Gebet" : "The Prayer"}
              title={isDe ? "Betet ohne Unterlaß." : "Pray without ceasing."}
              scripture={
                isDe ? "1. Thessalonicher 5,17" : "1 Thessalonians 5:17"
              }
              intro={
                <p className="mx-auto max-w-[46ch] text-center">
                  {isDe
                    ? "Schlag die Seite auf, wenn du aufstehst; schlag sie auf, wenn du dich niederlegst."
                    : "Open the page when you rise; open it when you lie down."}
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
                  {isDe ? "Das Gebet des Herzens" : "The prayer of the heart"}
                </p>
                <p className="font-serif text-title-sm lg:text-title leading-[1.5] text-paper/90">
                  {isDe ? (
                    <>
                      Herr Jesus Christus,
                      <br />
                      Sohn Gottes,
                      <br />
                      erbarme Dich meiner, eines Sünders.
                    </>
                  ) : (
                    <>
                      Lord Jesus Christ,
                      <br />
                      Son of God,
                      <br />
                      have mercy on me, a sinner.
                    </>
                  )}
                </p>
                <p className="mx-auto mt-6 max-w-[44ch] font-serif italic text-detail text-paper/55 leading-[1.7]">
                  {isDe
                    ? "Bete es im Atem, mit dem Herzen, zu jeder Zeit. Die Väter sagen, das Zurückbringen sei die halbe Arbeit."
                    : "Pray it in the breath, with the heart, at any time. The Fathers say the bringing-back is half the work."}
                </p>
                <p className="mt-6">
                  <Link
                    href="/prayers/learning/jesus-prayer"
                    className="font-sans text-detail font-medium text-gold/80 underline decoration-gold/30 underline-offset-4 transition-colors hover:text-paper hover:decoration-paper"
                  >
                    {isDe ? "Lerne, es zu beten →" : "Learn how to pray it →"}
                  </Link>
                </p>
              </div>

              {/* The day, as a card. */}
              <Link
                href="/prayers/today"
                className="group flex flex-col justify-between rounded-xl border border-paper/12 bg-paper/[0.03] px-7 py-8 transition-colors hover:border-paper/30"
              >
                <div>
                  <p className="mb-5 font-sans text-eyebrow uppercase tracking-[2.5px] text-gold/70">
                    {isDe ? "Heute" : "Today"}
                  </p>
                  <div className="flex items-baseline gap-3">
                    <span className="font-serif text-display-sm text-paper leading-none tabular-nums">
                      {today.getUTCDate()}
                    </span>
                    <span className="font-serif text-title-sm text-paper/70">
                      {formatMonthDay(today).split(" ")[0]}
                    </span>
                  </div>
                  <p className="mt-5 font-serif text-ui text-paper leading-snug">
                    {headline?.name ??
                      (isDe ? "Mit der Kirche beten" : "Pray with the Church")}
                  </p>
                  <p className="mt-2.5 flex items-center gap-2 font-sans text-caption text-paper/45">
                    <span
                      aria-hidden
                      className={`inline-block h-1.5 w-1.5 rounded-full ${FAST_DOT[fast.kind]}`}
                    />
                    <span>
                      {fast.label}
                      <span className="text-paper/25"> · </span>
                      {paschaLine}
                    </span>
                  </p>
                </div>
                <span className="mt-8 inline-flex items-center gap-1.5 font-sans text-detail font-medium text-gold/80 transition-colors group-hover:text-paper">
                  {isDe ? "Heute öffnen" : "Open today"}
                  <span
                    aria-hidden
                    className="transition-transform duration-200 group-hover:translate-x-0.5"
                  >
                    →
                  </span>
                </span>
              </Link>
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
                    {isDe ? "Eine Hymne · für das Gebetsseil" : "A hymn · for the prayer rope"}
                  </p>
                  <h2 className="mt-2 font-display-serif text-title-sm text-paper leading-snug transition-colors group-hover:text-paper md:text-title">
                    {isDe ? "Die Gebetsseil-Hymne" : "The Prayer Rope Anthem"}
                  </h2>
                  <p className="mt-2 font-serif italic text-detail text-paper/65 leading-[1.65] md:text-ui">
                    {isDe
                      ? "Gesungen Knoten für Knoten, an die Heilige Dreifaltigkeit, an Christus, an die Allheilige, an die Heiligen. Spielen, leise wiederholen, dem Text folgen."
                      : "Sung knot by knot. To the Holy Trinity, to Christ, to the Theotokos, to all the saints. Play it, loop it, follow the lyrics."}
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
                <ContinuePraying
                  label={isDe ? "Weiterbeten" : "Continue praying"}
                />
              </div>
              <div>
                <SuggestedToday
                  season={season}
                  isFast={isFast}
                  label={isDe ? "Für heute empfohlen" : "Suggested for today"}
                />
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
                  {isDe ? "Häufig gebetet" : "Popular prayer rules"}
                </PrayerSectionLabel>
                <PrayerIndex>
                  {popularRules().map((r) => (
                    <PrayerIndexRow
                      key={r.id}
                      href={r.href}
                      title={titleOf(r, isDe)}
                      description={descriptionOf(r, isDe)}
                      meta={
                        r.estimatedMinutes
                          ? isDe
                            ? `~${r.estimatedMinutes} Min.`
                            : `~${r.estimatedMinutes} min`
                          : undefined
                      }
                    />
                  ))}
                </PrayerIndex>
              </div>
            )}

            {/* The book proper — every prayer rule, by category, two columns. */}
            <div className="mt-8 grid gap-x-12 gap-y-10 md:grid-cols-2">
              {RULE_CATEGORY_ORDER.map((category) => {
                const rules = rulesByCategory(category);
                if (rules.length === 0) return null;
                const cat = RULE_CATEGORY_LABEL[category];
                return (
                  <div key={category}>
                    <PrayerSectionLabel>
                      {isDe ? cat.de : cat.en}
                    </PrayerSectionLabel>
                    <PrayerIndex>
                      {rules.map((r) => (
                        <PrayerIndexRow
                          key={r.id}
                          href={r.href}
                          title={titleOf(r, isDe)}
                          description={descriptionOf(r, isDe)}
                          planned={r.planned}
                          plannedLabel={isDe ? "Geplant" : "Planned"}
                          meta={
                            r.estimatedMinutes
                              ? isDe
                                ? `~${r.estimatedMinutes} Min.`
                                : `~${r.estimatedMinutes} min`
                              : undefined
                          }
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
                {isDe ? "Auch in diesem Buch" : "Also in this book"}
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
              {isDe
                ? "Deine Lesezeichen, Notizen und Markierungen leben auf diesem Gerät. Melde dich an, um sie über Geräte hinweg zu behalten."
                : "Your bookmarks, notes, and highlights live on this device. Sign in to keep them across devices."}{" "}
              <Link
                href="/account"
                className="text-paper/55 underline decoration-paper/25 underline-offset-2 hover:text-paper"
              >
                {isDe ? "Dein Konto →" : "Your account →"}
              </Link>
            </PrayerNote>
          </div>
        </section>
      </div>
    </>
  );
}
