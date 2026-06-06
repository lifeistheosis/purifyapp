import Link from "next/link";
import { PrayerSlideshow } from "@/components/prayers/PrayerSlideshow";
import {
  PrayerSectionLabel,
  PrayerIndex,
  PrayerIndexRow,
  PrayerNote,
} from "@/components/prayers/PrayerBook";
import { ContinuePraying } from "@/components/prayers/ContinuePraying";
import { SuggestedToday } from "@/components/prayers/SuggestedToday";
import {
  RULE_CATEGORY_ORDER,
  RULE_CATEGORY_LABEL,
  rulesByCategory,
  type RuleMeta,
  type Season,
} from "@/lib/prayers/rules";
import { formatMonthDay, type FastKind } from "@/lib/calendar/orthodox";

/**
 * Desktop-only Prayers hub. A genuine desktop layout — an asymmetric hero
 * (title + scripture beside a framed icon panel) over a main-column "book"
 * (the daily rule as cards, the other categories as quiet indexes) and a
 * sticky contextual rail (today, the prayer of the heart, resume + suggestions,
 * and the dedicated surfaces). Deliberately unlike the mobile single-column
 * stack. Rail modules stack and null-collapse, so an empty "Continue praying"
 * never leaves a blank column.
 */

const FAST_DOT: Record<FastKind, string> = {
  strict: "bg-crimson",
  "wine-oil": "bg-gold",
  fish: "bg-sage",
  fast: "bg-paper/40",
  "fast-free": "bg-emerald-400",
  normal: "bg-paper/30",
};

function titleOf(r: RuleMeta, isDe: boolean): string {
  return isDe ? r.titleDe ?? r.title : r.title;
}
function descriptionOf(r: RuleMeta, isDe: boolean): string | undefined {
  return isDe ? r.descriptionDe ?? r.description : r.description;
}
function metaOf(r: RuleMeta, isDe: boolean): string | undefined {
  if (!r.estimatedMinutes) return undefined;
  return isDe ? `~${r.estimatedMinutes} Min.` : `~${r.estimatedMinutes} min`;
}

export function PrayerHubDesktop({
  isDe,
  today,
  fast,
  headlineName,
  paschaLine,
  season,
  isFast,
}: {
  isDe: boolean;
  today: Date;
  fast: { kind: FastKind; label: string };
  headlineName?: string;
  paschaLine: string;
  season: Season;
  isFast: boolean;
}) {
  const daily = rulesByCategory("daily");
  const otherCategories = RULE_CATEGORY_ORDER.filter((c) => c !== "daily");

  const moreEntries: { href: string; title: string }[] = [
    { href: "/prayers/today", title: isDe ? "Heute" : "Today" },
    { href: "/prayers/hours", title: isDe ? "Die Horen" : "The Hours" },
    {
      href: "/prayers/akathists",
      title: isDe ? "Die Akathiste" : "The Akathists",
    },
    {
      href: "/prayers/rope",
      title: isDe ? "Das Gebetsseil" : "The prayer rope",
    },
    {
      href: "/prayers/anthem",
      title: isDe ? "Die Gebetsseil-Hymne" : "The Prayer Rope Anthem",
    },
    {
      href: "/prayers/learning",
      title: isDe ? "Beten lernen" : "Learn to pray",
    },
  ];

  return (
    <section className="bg-night min-h-screen">
      <div className="mx-auto w-full max-w-[1180px] px-8 lg:px-12 py-14 lg:py-20">
        {/* Asymmetric hero — title beside a framed icon panel. */}
        <header className="grid items-center gap-10 lg:grid-cols-[1fr_minmax(0,360px)] lg:gap-16">
          <div>
            <p className="font-sans text-eyebrow uppercase tracking-[2.5px] text-paper/40 mb-5">
              {isDe ? "Das Gebet" : "The Prayer"}
            </p>
            <h1 className="font-display-serif text-display-sm lg:text-display leading-[1.05] text-paper">
              {isDe ? "Betet ohne Unterlaß." : "Pray without ceasing."}
            </h1>
            <p className="mt-4 font-serif italic text-detail text-paper/45">
              {isDe ? "1. Thessalonicher 5,17" : "1 Thessalonians 5:17"}
            </p>
            <div aria-hidden className="mt-7 h-px w-10 bg-gold/50" />
            <p className="mt-7 max-w-[46ch] font-serif text-body text-paper/70 leading-[1.8]">
              {isDe
                ? "Schlag die Seite auf, wenn du aufstehst; schlag sie auf, wenn du dich niederlegst."
                : "Open the page when you rise; open it when you lie down."}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <HeroLink href="/prayers/morning">
                {isDe ? "Morgengebet" : "Morning rule"}
              </HeroLink>
              <HeroLink href="/prayers/evening">
                {isDe ? "Abendgebet" : "Evening rule"}
              </HeroLink>
              <HeroLink href="/prayers/jesus-prayer">
                {isDe ? "Das Jesusgebet" : "The Jesus Prayer"}
              </HeroLink>
            </div>
          </div>
          <div className="hidden justify-self-center lg:block">
            <PrayerSlideshow width={340} height={440} />
          </div>
        </header>

        {/* Main book + sticky contextual rail (single column below lg). */}
        <div className="mt-16 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-14 lg:items-start">
          {/* MAIN — the book proper. */}
          <div className="min-w-0">
            {daily.length > 0 && (
              <section>
                <PrayerSectionLabel>
                  {isDe
                    ? RULE_CATEGORY_LABEL.daily.de
                    : RULE_CATEGORY_LABEL.daily.en}
                </PrayerSectionLabel>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {daily.map((r) => (
                    <DailyCard key={r.id} r={r} isDe={isDe} />
                  ))}
                </div>
              </section>
            )}

            {otherCategories.map((category) => {
              const rules = rulesByCategory(category);
              if (rules.length === 0) return null;
              const cat = RULE_CATEGORY_LABEL[category];
              return (
                <section key={category}>
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
                        meta={metaOf(r, isDe)}
                      />
                    ))}
                  </PrayerIndex>
                </section>
              );
            })}

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

          {/* RAIL — today, the heart, resume, suggestions, more. */}
          <aside className="mt-12 lg:mt-0">
            <div className="lg:sticky lg:top-[88px] lg:max-h-[calc(100dvh-104px)] lg:overflow-y-auto scrollbar-thin lg:pb-8">
              {/* Today */}
              <Link
                href="/prayers/today"
                className="group block rounded-xl border border-paper/12 bg-paper/[0.03] px-6 py-6 transition-colors hover:border-paper/30"
              >
                <p className="mb-4 font-sans text-eyebrow uppercase tracking-[2.5px] text-gold/70">
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
                <p className="mt-4 font-serif text-ui text-paper leading-snug">
                  {headlineName ??
                    (isDe ? "Mit der Kirche beten" : "Pray with the Church")}
                </p>
                <p className="mt-2 flex items-center gap-2 font-sans text-caption text-paper/45">
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
                <span className="mt-5 inline-flex items-center gap-1.5 font-sans text-detail font-medium text-gold/80 transition-colors group-hover:text-paper">
                  {isDe ? "Heute öffnen" : "Open today"}
                  <span
                    aria-hidden
                    className="transition-transform duration-200 group-hover:translate-x-0.5"
                  >
                    →
                  </span>
                </span>
              </Link>

              {/* The prayer of the heart */}
              <div className="mt-6 rounded-xl border border-paper/12 bg-paper/[0.02] px-6 py-6">
                <p className="mb-3 font-sans text-eyebrow uppercase tracking-[2.5px] text-paper/40">
                  {isDe ? "Das Gebet des Herzens" : "The prayer of the heart"}
                </p>
                <p className="font-serif text-ui text-paper/90 leading-[1.6]">
                  {isDe
                    ? "Herr Jesus Christus, Sohn Gottes, erbarme Dich meiner, eines Sünders."
                    : "Lord Jesus Christ, Son of God, have mercy on me, a sinner."}
                </p>
                <Link
                  href="/prayers/learning/jesus-prayer"
                  className="mt-4 inline-block font-sans text-detail font-medium text-gold/80 underline decoration-gold/30 underline-offset-4 transition-colors hover:text-paper hover:decoration-paper"
                >
                  {isDe ? "Lerne, es zu beten →" : "Learn how to pray it →"}
                </Link>
              </div>

              {/* Resume + suggestions (null-collapse). */}
              <ContinuePraying label={isDe ? "Weiterbeten" : "Continue praying"} />
              <SuggestedToday
                season={season}
                isFast={isFast}
                label={isDe ? "Für heute empfohlen" : "Suggested for today"}
              />

              {/* The dedicated surfaces. */}
              <PrayerSectionLabel>
                {isDe ? "Mehr Wege zu beten" : "More ways to pray"}
              </PrayerSectionLabel>
              <ul className="border-t border-paper/10">
                {moreEntries.map((e) => (
                  <li key={e.href} className="border-b border-paper/10">
                    <Link
                      href={e.href}
                      className="group flex items-center justify-between gap-3 py-3"
                    >
                      <span className="font-serif text-detail text-paper/85 transition-colors group-hover:text-paper">
                        {e.title}
                      </span>
                      <span
                        aria-hidden
                        className="font-serif text-detail text-paper/25 transition-all duration-200 group-hover:text-gold/70 group-hover:translate-x-0.5"
                      >
                        →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function HeroLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-1.5 font-sans text-detail font-medium text-paper/75 transition-colors hover:text-paper"
    >
      {children}
      <span
        aria-hidden
        className="text-paper/30 transition-all duration-200 group-hover:text-gold/70 group-hover:translate-x-0.5"
      >
        →
      </span>
    </Link>
  );
}

function DailyCard({ r, isDe }: { r: RuleMeta; isDe: boolean }) {
  const title = titleOf(r, isDe);
  const description = descriptionOf(r, isDe);
  const meta = metaOf(r, isDe);

  if (r.planned) {
    return (
      <div className="rounded-lg border border-paper/10 bg-paper/[0.015] px-5 py-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-serif text-title-sm text-paper/45 leading-snug">
            {title}
          </h3>
          <span className="shrink-0 font-sans text-eyebrow uppercase tracking-[1.5px] text-paper/30">
            {isDe ? "Geplant" : "Planned"}
          </span>
        </div>
        {description && (
          <p className="mt-2 font-sans text-detail text-paper/35 leading-[1.6]">
            {description}
          </p>
        )}
      </div>
    );
  }

  return (
    <Link
      href={r.href}
      className="group flex flex-col rounded-lg border border-paper/12 bg-paper/[0.02] px-5 py-5 transition-colors hover:border-paper/30 hover:bg-paper/[0.04]"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-serif text-title-sm text-paper/90 leading-snug transition-colors group-hover:text-paper">
          {title}
        </h3>
        {meta && (
          <span className="shrink-0 font-sans text-caption text-paper/35 tabular-nums">
            {meta}
          </span>
        )}
      </div>
      {description && (
        <p className="mt-2 font-sans text-detail text-paper/50 leading-[1.6]">
          {description}
        </p>
      )}
    </Link>
  );
}
