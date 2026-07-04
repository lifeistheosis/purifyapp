import Link from "next/link";
import {
  commemorationsOn,
  fastingStatus,
  formatLongDate,
  paschaInfo,
  readingsOn,
  startOfDayUtc,
  type FastKind,
} from "@/lib/calendar/orthodox";
import { SaintIcon } from "@/components/saints/SaintIcon";
import { getSaint } from "@/lib/saints/saints";
import { getServerLocale } from "@/lib/i18n/server";
import { getMessages, t } from "@/lib/i18n";
import { TodayDiptychs } from "@/components/prayers/TodayDiptychs";
import { TodayGreeting } from "@/components/prayers/TodayGreeting";
import { TodayPersonalRail } from "@/components/prayers/TodayPersonalRail";
import { OnThisDayHistory } from "@/components/history/OnThisDayHistory";
import {
  PrayerMasthead,
  PrayerSectionLabel,
  PrayerIndex,
  PrayerIndexRow,
  PrayerNote,
} from "@/components/prayers/PrayerBook";

export const metadata = {
  title: "Today's prayer",
  description:
    "Daily prayer: today's date, saint, fast, the appointed readings, the prayer rope, and one-tap links into the morning rule, evening rule, and Jesus Prayer.",
};

export const revalidate = 3600;

const FAST_DOT: Record<FastKind, string> = {
  strict: "bg-crimson",
  "wine-oil": "bg-gold",
  fish: "bg-sage",
  fast: "bg-paper/40",
  "fast-free": "bg-emerald-400",
  normal: "bg-paper/30",
};

const QUIET_LINK =
  "font-sans text-detail text-paper/55 underline decoration-paper/20 underline-offset-4 transition-colors hover:text-paper hover:decoration-paper/50";

export default async function PrayersTodayPage() {
  const locale = await getServerLocale();
  const m = getMessages(locale);
  const today = startOfDayUtc(new Date());
  const fast = fastingStatus(today);
  const pascha = paschaInfo(today);
  const commemorations = commemorationsOn(today);
  const readings = readingsOn(today);
  const headline =
    commemorations.find((c) => c.kind === "feast") ?? commemorations[0];
  const headlineSaint =
    headline?.saint ?? (headline?.slug ? getSaint(headline.slug) : null);

  return (
    <section className="relative isolate min-h-screen overflow-hidden bg-night">
      <div className="relative z-10 mx-auto w-full max-w-[680px] px-6 py-16 md:px-8 md:py-24 lg:max-w-[1160px]">
        {/* Masthead + the personal line: the page greets its reader. */}
        <div className="mx-auto w-full max-w-[680px] lg:mx-0 lg:max-w-none">
          <PrayerMasthead
            eyebrow={t(m, "prayers.today.eyebrow")}
            title={formatLongDate(today)}
          />
          <div className="lg:max-w-[720px]">
            <TodayGreeting />
          </div>
        </div>

        <div className="mt-10 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-14">
          {/* ── Main column: the day itself ─────────────────────────────── */}
          <div className="min-w-0">
            {/* Fast + commemoration, a calm two-up, no chunky chips. */}
            <div className="grid grid-cols-1 gap-x-10 gap-y-7 border-y border-paper/10 py-7 sm:grid-cols-2">
              <div>
                <p className="font-sans text-eyebrow uppercase tracking-[2px] text-paper/40 mb-2">
                  {t(m, "prayers.today.fast")}
                </p>
                <p className="flex items-center gap-2 font-serif text-body text-paper">
                  <span
                    aria-hidden
                    className={`inline-block h-1.5 w-1.5 rounded-full ${FAST_DOT[fast.kind]}`}
                  />
                  {fast.label}
                </p>
                <p className="mt-1.5 font-sans text-caption text-paper/55 leading-[1.55]">
                  {fast.rule}
                </p>
              </div>

              <div className="flex items-start gap-4">
                {headlineSaint && <SaintIcon saint={headlineSaint} size="sm" />}
                <div className="min-w-0">
                  <p className="font-sans text-eyebrow uppercase tracking-[2px] text-paper/40 mb-2">
                    {t(m, "prayers.today.commemoratedToday")}
                  </p>
                  <p className="font-serif text-body text-paper leading-snug">
                    {headline ? (
                      headlineSaint ? (
                        <Link
                          href={`/saints/${headlineSaint.slug}`}
                          className="underline decoration-paper/25 underline-offset-2 hover:decoration-paper"
                        >
                          {headline.name}
                        </Link>
                      ) : (
                        headline.name
                      )
                    ) : (
                      t(m, "prayers.today.noSaint")
                    )}
                  </p>
                  {headline?.note && (
                    <p className="mt-1.5 font-serif italic text-detail text-paper/55 leading-[1.45]">
                      {headline.note}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Pray */}
            <PrayerSectionLabel>{t(m, "prayers.today.pray")}</PrayerSectionLabel>
            <PrayerIndex>
              <PrayerIndexRow
                href="/prayers/morning"
                title={t(m, "prayers.morningRule")}
                description={t(m, "prayers.today.morningBlurb")}
              />
              <PrayerIndexRow
                href="/prayers/evening"
                title={t(m, "prayers.eveningRule")}
                description={t(m, "prayers.today.eveningBlurb")}
              />
              <PrayerIndexRow
                href="/prayers/rope"
                title={t(m, "prayers.rope")}
                description={t(m, "prayers.today.ropeBlurb")}
              />
            </PrayerIndex>

            {/* Readings */}
            {readings.length > 0 && (
              <>
                <PrayerSectionLabel>
                  {t(m, "prayers.today.readings")}
                </PrayerSectionLabel>
                <PrayerIndex>
                  {readings.map((r, i) => {
                    const kindLabel =
                      r.kind === "epistle"
                        ? "Epistle"
                        : r.kind === "ot"
                          ? "Old Testament"
                          : "Gospel";
                    return (
                      <PrayerIndexRow
                        key={i}
                        href={`/bible/${r.book}/${r.chapter}#v${r.from}`}
                        title={r.label}
                        description={kindLabel}
                      />
                    );
                  })}
                </PrayerIndex>
              </>
            )}

            {/* The prayer of the heart */}
            <div className="my-12 rounded-lg border border-paper/10 bg-paper/[0.02] px-6 py-8 text-center">
              <p className="mb-5 font-sans text-eyebrow uppercase tracking-[2.5px] text-paper/40">
                {t(m, "prayers.jesusPrayer")}
              </p>
              <p className="font-serif text-title-sm leading-[1.5] text-paper/90">
                {t(m, "prayers.today.jesusPrayerText")}
              </p>
              <p className="mx-auto mt-5 max-w-[44ch] font-serif italic text-detail text-paper/55 leading-[1.7]">
                {t(m, "prayers.today.jesusPrayerBlurb")}{" "}
                <Link
                  href="/prayers/learning/jesus-prayer"
                  className="font-sans not-italic font-medium text-gold/80 underline decoration-gold/30 underline-offset-4 transition-colors hover:text-paper hover:decoration-paper"
                >
                  {t(m, "prayers.today.learnHow")}
                </Link>
              </p>
            </div>

            {/* On this day in Church history, quiet when no firmly dated
                event matches today. */}
            <OnThisDayHistory date={today} />
          </div>

          {/* ── Rail: the reader's own thread through the app ───────────── */}
          <aside className="mt-12 lg:mt-0">
            <div className="space-y-10 lg:sticky lg:top-[88px]">
              <TodayPersonalRail />

              {/* Diptychs: client-rendered so it reads localStorage. Quiet
                  when nothing matches today. */}
              <TodayDiptychs
                heading={t(m, "prayers.today.diptychHeading")}
                namedayLabel={t(m, "prayers.today.namedayNote")}
                anniversaryLabel={t(m, "prayers.today.anniversaryNote")}
              />

              <div>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  <Link href="/bible/psalms/1" className={QUIET_LINK}>
                    {t(m, "prayers.today.psalter")}
                  </Link>
                  <Link href="/saints" className={QUIET_LINK}>
                    {t(m, "prayers.today.browseSaints")}
                  </Link>
                  <Link href="/prayers/learning" className={QUIET_LINK}>
                    {t(m, "prayers.today.learnLink")}
                  </Link>
                </div>
                <PrayerNote>
                  {pascha.daysAway > 0
                    ? t(m, "prayers.today.paschaInDays").replace(
                        "{days}",
                        String(pascha.daysAway),
                      )
                    : pascha.label}
                </PrayerNote>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
