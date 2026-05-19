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

export const metadata = {
  title: "Today's prayer",
  description:
    "Daily prayer: today's date, saint, fast, the appointed readings, and one-tap links into the morning rule, evening rule, and Jesus Prayer.",
};

export const revalidate = 3600;

const FAST_CHIP: Record<FastKind, string> = {
  strict: "bg-[#c1272d]/15 border-[#c1272d]/40 text-[#f8cac7]",
  "wine-oil": "bg-[#d4af37]/15 border-[#d4af37]/45 text-[#f4dc91]",
  fish: "bg-[#7b9b8f]/15 border-[#7b9b8f]/45 text-[#bfd6cc]",
  fast: "bg-paper/[0.06] border-paper/20 text-paper/80",
  "fast-free": "bg-emerald-500/15 border-emerald-500/40 text-emerald-200",
  normal: "bg-paper/[0.04] border-paper/15 text-paper/70",
};

export default function PrayersTodayPage() {
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
          <p className="font-sans text-[12px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-3">
            Today
          </p>
          <h1 className="font-sans text-[28px] md:text-[36px] font-bold text-paper leading-[1.1] tracking-[-0.02em]">
            {formatLongDate(today)}
          </h1>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Fast */}
            <div className={`rounded-md border p-4 ${FAST_CHIP[fast.kind]}`}>
              <p className="font-sans text-[11px] uppercase tracking-[1.5px] opacity-70 mb-1">
                Fast
              </p>
              <p className="font-sans text-[16px] font-semibold leading-tight">
                {fast.label}
              </p>
              <p className="mt-1.5 font-sans text-[12.5px] opacity-90 leading-[1.55]">
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
                  className="shrink-0 h-12 w-12 rounded-full flex items-center justify-center bg-[#d4af37]/15 text-[#f4dc91] border border-[#d4af37]/35 text-[18px]"
                >
                  {headline?.kind === "feast" ? "✦" : "+"}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-sans text-[11px] uppercase tracking-[1.5px] text-paper/55 mb-1">
                  Commemorated today
                </p>
                <p className="font-sans text-[15px] font-semibold text-paper leading-tight">
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
                    "No saint indexed for this day"
                  )}
                </p>
                {headline?.note && (
                  <p className="mt-1 font-serif italic text-[13px] text-paper/65 leading-[1.45]">
                    {headline.note}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRAYER RULES */}
      <section className="px-5 md:px-8 py-10 md:py-12">
        <div className="mx-auto max-w-[1080px] w-full">
          <p className="font-sans text-[12px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-5">
            Pray
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Link
              href="/prayers/morning"
              className="group flex gap-4 rounded-lg border border-paper/12 bg-paper/[0.03] hover:border-[#d4af37]/55 hover:bg-[#d4af37]/[0.06] transition-colors p-5"
            >
              <PrayerIcon slug="anastasis" size="sm" />
              <div className="min-w-0 flex-1">
                <p className="font-sans text-[11px] uppercase tracking-[1.5px] text-[#d4af37]/85 mb-2">
                  Morning rule
                </p>
                <h2 className="font-serif text-[24px] text-paper leading-tight">
                  Begin the day with God
                </h2>
                <p className="mt-3 font-sans text-[13px] text-paper/65 leading-[1.6]">
                  Sign of the Cross, O Heavenly King, the Trisagion, the
                  Lord&rsquo;s Prayer, Rising from Sleep, the Jesus Prayer,
                  the Theotokos hymn, and the dismissal. About 8 minutes.
                </p>
                <p className="mt-4 font-sans text-[13px] font-medium text-paper/75 group-hover:text-[#d4af37] transition-colors">
                  Open the rule →
                </p>
              </div>
            </Link>

            <Link
              href="/prayers/evening"
              className="group flex gap-4 rounded-lg border border-paper/12 bg-paper/[0.03] hover:border-[#d4af37]/55 hover:bg-[#d4af37]/[0.06] transition-colors p-5"
            >
              <PrayerIcon slug="theotokos-of-vladimir" size="sm" />
              <div className="min-w-0 flex-1">
                <p className="font-sans text-[11px] uppercase tracking-[1.5px] text-[#d4af37]/85 mb-2">
                  Evening rule
                </p>
                <h2 className="font-serif text-[24px] text-paper leading-tight">
                  Lay the day down
                </h2>
                <p className="mt-3 font-sans text-[13px] text-paper/65 leading-[1.6]">
                  The Trisagion, the Lord&rsquo;s Prayer, a brief examination
                  of the day, the Jesus Prayer, Into Thy hands, and the
                  dismissal. About 8 minutes.
                </p>
                <p className="mt-4 font-sans text-[13px] font-medium text-paper/75 group-hover:text-[#d4af37] transition-colors">
                  Open the rule →
                </p>
              </div>
            </Link>
          </div>

          {/* The Jesus Prayer — quiet card, no counter, no streak.
              Body invites the reader to pray it without telling them how
              many times. */}
          <div className="mt-3 rounded-lg border border-paper/12 bg-paper/[0.03] p-5">
            <p className="font-sans text-[11px] uppercase tracking-[1.5px] text-[#d4af37]/85 mb-2">
              The Jesus Prayer
            </p>
            <p className="font-serif text-[20px] md:text-[22px] text-paper leading-[1.4]">
              Lord Jesus Christ, Son of God, have mercy on me, a sinner.
            </p>
            <p className="mt-3 font-sans text-[13px] text-paper/65 leading-[1.6] max-w-[640px]">
              Pray it in the breath, with the heart, at any time. The
              monastics call it the prayer of the heart; the Fathers say
              the bringing-back is half the work.{" "}
              <Link
                href="/prayers/learning/jesus-prayer"
                className="text-paper underline underline-offset-2 decoration-paper/30 hover:decoration-paper"
              >
                Learn how →
              </Link>
            </p>
          </div>
        </div>
      </section>

      {/* READINGS */}
      {readings.length > 0 && (
        <section className="px-5 md:px-8 py-10 md:py-12 border-t border-white/8 bg-night-soft">
          <div className="mx-auto max-w-[1080px] w-full">
            <p className="font-sans text-[12px] font-semibold uppercase tracking-[1.5px] text-paper/55 mb-5">
              Today&rsquo;s readings
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
                    className="group rounded-md border border-paper/12 bg-paper/[0.03] hover:border-[#d4af37]/55 hover:bg-[#d4af37]/[0.05] transition-colors p-4"
                  >
                    <p className="font-sans text-[11px] uppercase tracking-[1.5px] text-paper/55 mb-1.5">
                      {kindLabel}
                    </p>
                    <p className="font-sans text-[15px] font-semibold text-paper">
                      {r.label}
                    </p>
                    <p className="mt-2 font-sans text-[12px] text-paper/55 group-hover:text-[#d4af37] transition-colors">
                      Read passage →
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
            className="rounded-md border border-paper/10 bg-paper/[0.02] hover:bg-paper/[0.06] hover:border-paper/30 transition-colors px-4 py-3 font-sans text-[14px] text-paper/75 hover:text-paper"
          >
            Pray the Psalter →
          </Link>
          <Link
            href="/saints"
            className="rounded-md border border-paper/10 bg-paper/[0.02] hover:bg-paper/[0.06] hover:border-paper/30 transition-colors px-4 py-3 font-sans text-[14px] text-paper/75 hover:text-paper"
          >
            Browse all saints →
          </Link>
          <Link
            href="/prayers/learning"
            className="rounded-md border border-paper/10 bg-paper/[0.02] hover:bg-paper/[0.06] hover:border-paper/30 transition-colors px-4 py-3 font-sans text-[14px] text-paper/75 hover:text-paper"
          >
            Learn to pray →
          </Link>
        </div>
        <p className="mx-auto max-w-[1080px] mt-6 font-sans text-[11px] text-paper/35">
          Pascha {pascha.daysAway > 0 ? `is in ${pascha.daysAway} days` : pascha.label}.
        </p>
      </section>
    </div>
  );
}
