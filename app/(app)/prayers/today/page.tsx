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
import { PrayerIcon } from "@/components/prayers/PrayerIcon";
import { getServerLocale } from "@/lib/i18n/server";
import { getMessages, t } from "@/lib/i18n";
import { TodayDiptychs } from "@/components/prayers/TodayDiptychs";

export const metadata = {
  title: "Today's prayer",
  description:
    "Daily prayer: today's date, saint, fast, the appointed readings, the prayer rope, and one-tap links into the morning rule, evening rule, and Jesus Prayer.",
};

export const revalidate = 3600;

const FAST_CHIP: Record<FastKind, string> = {
  strict: "bg-crimson/15 border-crimson/40 text-crimson-soft",
  "wine-oil": "bg-gold/15 border-gold/45 text-gold-pale",
  fish: "bg-sage/15 border-sage/45 text-sage-soft",
  fast: "bg-paper/[0.06] border-paper/20 text-paper/80",
  "fast-free": "bg-emerald-500/15 border-emerald-500/40 text-emerald-200",
  normal: "bg-paper/[0.04] border-paper/15 text-paper/70",
};

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
    <div className="bg-night min-h-screen">
      {/* HERO STRIP */}
      <section className="px-5 md:px-8 pt-10 md:pt-14 pb-8 border-b border-white/8">
        <div className="mx-auto max-w-[1080px] w-full">
          <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55 mb-3">
            {t(m, "prayers.today.eyebrow")}
          </p>
          <h1 className="font-sans text-title md:text-display-sm font-bold text-paper leading-[1.1] tracking-[-0.02em]">
            {formatLongDate(today)}
          </h1>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Fast */}
            <div className={`rounded-md border p-4 ${FAST_CHIP[fast.kind]}`}>
              <p className="font-sans text-eyebrow uppercase tracking-[1.5px] opacity-70 mb-1">
                {t(m, "prayers.today.fast")}
              </p>
              <p className="font-sans text-body font-semibold leading-tight">
                {fast.label}
              </p>
              <p className="mt-1.5 font-sans text-caption opacity-90 leading-[1.55]">
                {fast.rule}
              </p>
            </div>

            {/* Saint of the day */}
            <div className="rounded-md border border-paper/12 bg-paper/[0.03] p-4 flex gap-4 items-start">
              {headlineSaint ? (
                <SaintIcon saint={headlineSaint} size="sm" />
              ) : (
                <span
                  aria-hidden
                  className="shrink-0 h-12 w-12 rounded-full flex items-center justify-center bg-gold/15 text-gold-pale border border-gold/35 text-lede"
                >
                  {headline?.kind === "feast" ? "✦" : "+"}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-sans text-eyebrow uppercase tracking-[1.5px] text-paper/55 mb-1">
                  {t(m, "prayers.today.commemoratedToday")}
                </p>
                <p className="font-sans text-ui font-semibold text-paper leading-tight">
                  {headline ? (
                    headlineSaint ? (
                      <Link
                        href={`/saints/${headlineSaint.slug}`}
                        className="hover:underline underline-offset-2"
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
                  <p className="mt-1 font-serif italic text-detail text-paper/65 leading-[1.45]">
                    {headline.note}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRAYER RULES + ROPE */}
      <section className="px-5 md:px-8 py-10 md:py-12">
        <div className="mx-auto max-w-[1080px] w-full">
          <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55 mb-5">
            {t(m, "prayers.today.pray")}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Link
              href="/prayers/morning"
              className="group flex gap-4 rounded-lg border border-paper/12 bg-paper/[0.03] hover:border-gold/55 hover:bg-gold/[0.06] transition-colors p-5"
            >
              <PrayerIcon slug="anastasis" size="sm" />
              <div className="min-w-0 flex-1">
                <p className="font-sans text-eyebrow uppercase tracking-[1.5px] text-gold/85 mb-2">
                  {t(m, "prayers.morningRule")}
                </p>
                <h2 className="font-serif text-title-sm text-paper leading-tight">
                  {t(m, "prayers.today.morningTitle")}
                </h2>
                <p className="mt-3 font-sans text-detail text-paper/65 leading-[1.6]">
                  {t(m, "prayers.today.morningBlurb")}
                </p>
                <p className="mt-4 font-sans text-detail font-medium text-paper/75 group-hover:text-gold transition-colors">
                  {t(m, "prayers.today.openRule")}
                </p>
              </div>
            </Link>

            <Link
              href="/prayers/evening"
              className="group flex gap-4 rounded-lg border border-paper/12 bg-paper/[0.03] hover:border-gold/55 hover:bg-gold/[0.06] transition-colors p-5"
            >
              <PrayerIcon slug="theotokos-of-vladimir" size="sm" />
              <div className="min-w-0 flex-1">
                <p className="font-sans text-eyebrow uppercase tracking-[1.5px] text-gold/85 mb-2">
                  {t(m, "prayers.eveningRule")}
                </p>
                <h2 className="font-serif text-title-sm text-paper leading-tight">
                  {t(m, "prayers.today.eveningTitle")}
                </h2>
                <p className="mt-3 font-sans text-detail text-paper/65 leading-[1.6]">
                  {t(m, "prayers.today.eveningBlurb")}
                </p>
                <p className="mt-4 font-sans text-detail font-medium text-paper/75 group-hover:text-gold transition-colors">
                  {t(m, "prayers.today.openRule")}
                </p>
              </div>
            </Link>
          </div>

          {/* The Jesus Prayer + Rope card */}
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-paper/12 bg-paper/[0.03] p-5">
              <p className="font-sans text-eyebrow uppercase tracking-[1.5px] text-gold/85 mb-2">
                {t(m, "prayers.jesusPrayer")}
              </p>
              <p className="font-serif text-lede md:text-title-sm text-paper leading-[1.4]">
                {t(m, "prayers.today.jesusPrayerText")}
              </p>
              <p className="mt-3 font-sans text-detail text-paper/65 leading-[1.6]">
                {t(m, "prayers.today.jesusPrayerBlurb")}{" "}
                <Link
                  href="/prayers/learning/jesus-prayer"
                  className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
                >
                  {t(m, "prayers.today.learnHow")}
                </Link>
              </p>
            </div>

            <Link
              href="/prayers/rope"
              className="group rounded-lg border border-paper/12 bg-paper/[0.03] hover:border-gold/55 hover:bg-gold/[0.06] transition-colors p-5 flex flex-col justify-between"
            >
              <div>
                <p className="font-sans text-eyebrow uppercase tracking-[1.5px] text-gold/85 mb-2">
                  {t(m, "prayers.rope")}
                </p>
                <p className="font-sans text-detail text-paper/65 leading-[1.6]">
                  {t(m, "prayers.today.ropeBlurb")}
                </p>
              </div>
              <p className="mt-4 font-sans text-detail font-medium text-paper/75 group-hover:text-gold transition-colors">
                {t(m, "prayers.today.openRope")}
              </p>
            </Link>
          </div>

          {/* Diptychs: client-rendered so it reads localStorage. Quiet
              when nothing matches today. */}
          <TodayDiptychs
            heading={t(m, "prayers.today.diptychHeading")}
            namedayLabel={t(m, "prayers.today.namedayNote")}
            anniversaryLabel={t(m, "prayers.today.anniversaryNote")}
          />
        </div>
      </section>

      {/* READINGS */}
      {readings.length > 0 && (
        <section className="px-5 md:px-8 py-10 md:py-12 border-t border-white/8 bg-night-soft">
          <div className="mx-auto max-w-[1080px] w-full">
            <p className="font-sans text-caption font-semibold uppercase tracking-[1.5px] text-paper/55 mb-5">
              {t(m, "prayers.today.readings")}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {readings.map((r, i) => {
                const kindLabel =
                  r.kind === "epistle"
                    ? "Epistle"
                    : r.kind === "ot"
                      ? "Old Testament"
                      : "Gospel";
                return (
                  <Link
                    key={i}
                    href={`/bible/${r.book}/${r.chapter}#v${r.from}`}
                    className="group rounded-md border border-paper/12 bg-paper/[0.03] hover:border-gold/55 hover:bg-gold/[0.05] transition-colors p-4"
                  >
                    <p className="font-sans text-eyebrow uppercase tracking-[1.5px] text-paper/55 mb-1.5">
                      {kindLabel}
                    </p>
                    <p className="font-sans text-ui font-semibold text-paper">
                      {r.label}
                    </p>
                    <p className="mt-2 font-sans text-caption text-paper/55 group-hover:text-gold transition-colors">
                      {t(m, "prayers.today.readPassage")}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* FOOTER STRIP */}
      <section className="px-5 md:px-8 py-10 border-t border-white/8">
        <div className="mx-auto max-w-[1080px] w-full grid grid-cols-1 sm:grid-cols-3 gap-3 text-center sm:text-left">
          <Link
            href="/bible/psalms/1"
            className="rounded-md border border-paper/10 bg-paper/[0.02] hover:bg-paper/[0.06] hover:border-paper/30 transition-colors px-4 py-3 font-sans text-ui text-paper/75 hover:text-paper"
          >
            {t(m, "prayers.today.psalter")}
          </Link>
          <Link
            href="/saints"
            className="rounded-md border border-paper/10 bg-paper/[0.02] hover:bg-paper/[0.06] hover:border-paper/30 transition-colors px-4 py-3 font-sans text-ui text-paper/75 hover:text-paper"
          >
            {t(m, "prayers.today.browseSaints")}
          </Link>
          <Link
            href="/prayers/learning"
            className="rounded-md border border-paper/10 bg-paper/[0.02] hover:bg-paper/[0.06] hover:border-paper/30 transition-colors px-4 py-3 font-sans text-ui text-paper/75 hover:text-paper"
          >
            {t(m, "prayers.today.learnLink")}
          </Link>
        </div>
        <p className="mx-auto max-w-[1080px] mt-6 font-sans text-eyebrow text-paper/35">
          {pascha.daysAway > 0
            ? t(m, "prayers.today.paschaInDays").replace(
                "{days}",
                String(pascha.daysAway),
              )
            : pascha.label}
        </p>
      </section>
    </div>
  );
}
