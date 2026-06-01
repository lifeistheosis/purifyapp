import Link from "next/link";
import {
  commemorationsOn,
  fastingStatus,
  readingsOn,
  paschaInfo,
  startOfDayUtc,
  formatMonthDay,
} from "@/lib/calendar/orthodox";
import { getSaint } from "@/lib/saints/saints";
import { SaintIcon } from "@/components/saints/SaintIcon";
import { FAST_META } from "@/components/calendar/fastMeta";
import { Cross } from "@/components/ui/icons/Cross";
import { Halo } from "@/components/ui/icons/Halo";

/**
 * "Today" rail on the home page: four small live tiles that turn the landing
 * from pure marketing into something closer to a dashboard. Server component;
 * the host page's ISR keeps it fresh once an hour.
 *
 *   1. Saint of the day  (with the haloed SaintIcon when a profile exists)
 *   2. Today's fast      (bespoke icon + label, tinted by the fast's colour)
 *   3. Read today        (the day's Gospel ref, link into the Bible reader)
 *   4. Pascha            (days away, then the date)
 */
export function TodayStrip() {
  const today = startOfDayUtc(new Date());
  const commemorations = commemorationsOn(today);
  const fast = fastingStatus(today);
  const readings = readingsOn(today);
  const pascha = paschaInfo(today);

  const headline =
    commemorations.find((c) => c.kind === "feast") ?? commemorations[0] ?? null;
  const headlineSaint =
    headline?.saint ?? (headline?.slug ? getSaint(headline.slug) : null) ?? null;
  const isFeast = headline?.kind === "feast";

  // Prefer the Gospel if any; else first reading; else nothing.
  const gospelRef =
    readings.find((r) => r.kind === "gospel") ?? readings[0] ?? null;

  const fastMeta = FAST_META[fast.kind];
  const FastIcon = fastMeta.Icon;

  const paschaPrimary =
    pascha.daysAway === 0
      ? "Today"
      : pascha.daysAway > 0
        ? `${pascha.daysAway} days`
        : "Passed";
  const paschaSecondary =
    pascha.daysAway > 0
      ? `${formatMonthDay(pascha.date)}, ${pascha.date.getUTCFullYear()}`
      : pascha.label;

  return (
    <section className="px-5 md:px-8 py-8 md:py-10 border-y border-white/8 bg-night">
      <div className="mx-auto max-w-[1280px] w-full">
        <div className="flex items-baseline justify-between flex-wrap gap-3 mb-5">
          <p className="inline-flex items-center gap-2 font-sans text-eyebrow font-semibold uppercase tracking-[2px] text-gold/75">
            <Cross size={13} className="text-gold/70" />
            Today
          </p>
          <Link
            href="/calendar"
            className="font-sans text-caption font-medium text-paper/55 hover:text-paper transition-colors"
          >
            Open the calendar →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Saint of the day */}
          <TileLink
            href={headlineSaint ? `/saints/${headlineSaint.slug}` : "/calendar"}
            eyebrow="Saint of the day"
          >
            <div className="flex items-center gap-3">
              {headlineSaint ? (
                <SaintIcon saint={headlineSaint} size="sm" />
              ) : (
                <span
                  aria-hidden
                  className={
                    "shrink-0 h-9 w-9 rounded-full flex items-center justify-center border " +
                    (isFeast
                      ? "border-gold/40 text-gold bg-gold/10"
                      : "border-paper/15 text-paper/55 bg-paper/[0.04]")
                  }
                >
                  {isFeast ? <Halo size={18} /> : <Cross size={15} />}
                </span>
              )}
              <p className="min-w-0 font-serif text-ui text-paper leading-snug line-clamp-2">
                {headline?.name ?? "Browse the calendar"}
              </p>
            </div>
          </TileLink>

          {/* 2. Today's fast */}
          <TileLink href="/calendar" eyebrow="Today's fast">
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="shrink-0 h-9 w-9 rounded-full flex items-center justify-center border"
                style={{
                  color: `rgb(${fastMeta.rgb})`,
                  borderColor: `rgb(${fastMeta.rgb} / 0.4)`,
                  backgroundColor: `rgb(${fastMeta.rgb} / 0.08)`,
                }}
              >
                {FastIcon ? <FastIcon size={18} /> : <Cross size={15} />}
              </span>
              <p
                className="min-w-0 font-serif text-ui leading-snug line-clamp-2"
                style={{ color: `rgb(${fastMeta.rgb})` }}
              >
                {fast.label}
              </p>
            </div>
          </TileLink>

          {/* 3. A reading */}
          <TileLink
            href={
              gospelRef
                ? `/bible/${gospelRef.book}/${gospelRef.chapter}#v${gospelRef.from}`
                : "/bible/john/1"
            }
            eyebrow="Read today"
          >
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="shrink-0 h-9 w-9 rounded-full flex items-center justify-center border border-gold/35 text-gold bg-gold/[0.06]"
              >
                <Cross size={15} />
              </span>
              <p className="min-w-0 font-serif text-ui text-paper leading-snug line-clamp-2">
                {gospelRef
                  ? gospelRef.label
                  : "The Gospel of John"}
              </p>
            </div>
          </TileLink>

          {/* 4. Pascha */}
          <TileLink href="/calendar" eyebrow="Pascha">
            <div className="min-w-0">
              <p className="font-display-serif text-lede md:text-title-sm text-paper leading-tight">
                {paschaPrimary}
              </p>
              <p className="mt-0.5 font-sans text-caption text-paper/55 leading-[1.4] line-clamp-1">
                {paschaSecondary}
              </p>
            </div>
          </TileLink>
        </div>
      </div>
    </section>
  );
}

/** A single Today tile: clickable, quiet hover lift. */
function TileLink({
  href,
  eyebrow,
  children,
}: {
  href: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-lg border border-paper/10 bg-paper/[0.025] hover:bg-paper/[0.05] hover:border-paper/20 transition-colors p-4"
    >
      <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-gold/65 mb-2.5">
        {eyebrow}
      </p>
      {children}
    </Link>
  );
}
