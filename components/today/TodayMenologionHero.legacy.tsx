import Link from "next/link";
import {
  commemorationsOn,
  currentSeason,
  fastingStatus,
  formatLongDate,
  paschaInfo,
  readingsOn,
  startOfDayUtc,
  type FastKind,
} from "@/lib/calendar/orthodox";
import { calendarPageVars, toneFor } from "@/lib/calendar/tone";
import { getSaint } from "@/lib/saints/saints";
import { createClient } from "@/lib/supabase/server";
import { DropCap } from "@/components/calendar/DropCap";
import { OrnamentHeadpiece } from "@/components/calendar/OrnamentHeadpiece";
import { Cross } from "@/components/ui/icons/Cross";
import sayingsData from "@/data/today/sayings.json";

/**
 * Mobile-only Today hero, menologion register (v6.4.2).
 *
 * Replaces the previous TodayMobileHero, that surface had drifted into
 * a Hallow-style five-chip nav + generic quote card + blurred saint
 * photo. This rebuild aligns Today with the calendar's printed-book
 * vocabulary: drop caps, three-cross ornament dividers, rubric tones,
 * appointed readings inline, a patristic pull-quote, plain-words fast
 * instruction, and a Pascha countdown under a small cross.
 *
 * Hidden on `md+`; the marketing home stays the desktop landing.
 * Server component, all data pure and cacheable.
 */

type Saying = { text: string; attribution: string };
const SAYINGS: Saying[] = sayingsData.sayings as Saying[];

function dayOfYear(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  const diff = d.getTime() - start;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function greetingForHour(h: number): string {
  if (h < 5) return "Peace be with you";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Peace this night";
}

/** Tone for the date eyebrow: rubric red on fast days, gold otherwise. */
const DATE_TONE: Record<FastKind, string> = {
  strict: "text-crimson",
  "wine-oil": "text-gold",
  fish: "text-gold",
  fast: "text-crimson/85",
  "fast-free": "text-emerald-300/85",
  normal: "text-gold/85",
};

export async function TodayMenologionHero() {
  const today = startOfDayUtc(new Date());
  const fast = fastingStatus(today);
  const commemorations = commemorationsOn(today);
  const headline =
    commemorations.find((c) => c.kind === "feast") ?? commemorations[0];
  const headlineSaint =
    headline?.saint ?? (headline?.slug ? getSaint(headline.slug) : null);
  const readings = readingsOn(today);
  const pascha = paschaInfo(today);
  const season = currentSeason(today);

  // Tone wash for the page, same system the calendar uses.
  const tone = toneFor({ hasFeast: !!commemorations.find((c) => c.kind === "feast"), fast: fast.kind });
  const pageVars = calendarPageVars(tone, season);

  // Patristic pull-quote: prefer the headline saint's first quote;
  // fall back to a rotated Desert Fathers saying on plain days.
  const sourceQuote = headlineSaint?.quotes?.[0];
  const fallbackIdx = dayOfYear(today) % SAYINGS.length;
  const fallback = SAYINGS[fallbackIdx];
  const quoteText = sourceQuote?.text ?? fallback.text;
  const quoteCite = sourceQuote
    ? `${headlineSaint?.name ?? ""}${sourceQuote.source ? ` · ${sourceQuote.source}` : ""}`
    : fallback.attribution;
  const quoteHref = sourceQuote?.href;

  // Signed-in greeting. Silently falls back to nothing if the user is
  // unsigned, so the unauth surface stays anonymous and quiet.
  let firstName: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();
      const displayName =
        (profile?.display_name as string | undefined) ??
        (user.user_metadata?.display_name as string | undefined) ??
        user.email?.split("@")[0] ??
        null;
      if (displayName) firstName = displayName.split(/\s+/)[0];
    }
  } catch {
    // Auth lookups shouldn't break the page.
  }
  const greeting = firstName
    ? `${greetingForHour(new Date().getHours())}, ${firstName}.`
    : null;

  const epistle = readings.find((r) => r.kind === "epistle");
  const gospel = readings.find((r) => r.kind === "gospel");

  return (
    <div
      className="md:hidden bg-night text-paper menaion-surface"
      style={pageVars}
    >
      <section className="relative px-5 pt-10 pb-6">
        {/* Greeting + date. Date in tonal rubric on fast days, gold otherwise. */}
        {greeting ? (
          <p className="font-display-serif italic text-body text-paper/75 mb-3">
            {greeting}
          </p>
        ) : null}
        <p
          className={`font-sans text-eyebrow font-semibold uppercase tracking-[1.6px] ${DATE_TONE[fast.kind]}`}
        >
          {formatLongDate(today)}
        </p>

        {/* Saint of the day with illuminated initial. */}
        {headline ? (
          <DropCap
            name={headline.name}
            href={headlineSaint ? `/saints/${headlineSaint.slug}` : undefined}
          />
        ) : (
          <h1 className="mt-3 font-display-serif text-title md:text-display-sm leading-[1.08] text-paper">
            A quiet day with the Church.
          </h1>
        )}

        {/* First sentence of the bio as a serif tease. */}
        {headlineSaint?.life?.[0] ? (
          <p className="mt-4 font-serif text-ui text-paper/80 leading-[1.65]">
            {firstSentence(headlineSaint.life[0])}
          </p>
        ) : null}
      </section>

      {/* Ornament headpiece divider, tinted by the day's tone. */}
      <OrnamentHeadpiece tinted className="px-8 my-2" />

      {/* FAST block, plain-words instruction. */}
      <section className="px-5 pt-4 pb-2">
        <p
          className="font-sans text-eyebrow font-semibold uppercase tracking-[1.6px] mb-2"
          style={{ color: "rgb(var(--tone))" }}
        >
          Fast · {fast.label}
        </p>
        <p className="font-serif text-ui text-paper/85 leading-[1.6]">
          {fast.rule}
        </p>
      </section>

      {/* APPOINTED READINGS. Citation + 'Read the full passage' link. */}
      {(epistle || gospel) ? (
        <section className="px-5 pt-6 pb-2">
          <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.6px] text-gold/85 mb-3">
            Appointed readings
          </p>
          <ul className="space-y-3">
            {epistle ? (
              <li>
                <p className="font-sans text-eyebrow uppercase tracking-[1.4px] text-paper/50">
                  Epistle
                </p>
                <Link
                  href={`/bible/${epistle.book}/${epistle.chapter}#v${epistle.from}-${epistle.to}`}
                  className="font-display-serif text-lede text-paper hover:text-gold transition-colors"
                >
                  {epistle.label}
                </Link>
              </li>
            ) : null}
            {gospel ? (
              <li>
                <p className="font-sans text-eyebrow uppercase tracking-[1.4px] text-paper/50">
                  Gospel
                </p>
                <Link
                  href={`/bible/${gospel.book}/${gospel.chapter}#v${gospel.from}-${gospel.to}`}
                  className="font-display-serif text-lede text-paper hover:text-gold transition-colors"
                >
                  {gospel.label}
                </Link>
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}

      {/* Patristic pull-quote, printed-book register, rubric-red
          attribution. Falls back to a Desert Fathers saying on plain
          days when the headline saint has no quote. */}
      <section className="px-5 pt-8 pb-4">
        <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.6px] text-paper/50 mb-3">
          A word for today
        </p>
        <blockquote className="relative">
          <span
            aria-hidden
            className="absolute -left-2 -top-1 font-display-serif text-title text-gold/70 leading-none"
          >
            &ldquo;
          </span>
          <p className="font-display-serif italic text-lede md:text-lede leading-[1.55] text-paper/90 pl-4">
            {quoteText}
          </p>
        </blockquote>
        <p
          className="mt-3 pl-4 font-sans text-eyebrow uppercase tracking-[1.5px]"
          style={{ color: "rgb(var(--tone) / 0.85)" }}
        >
          {quoteHref ? (
            <Link href={quoteHref} className="hover:opacity-80 transition-opacity">
              {quoteCite}
            </Link>
          ) : (
            quoteCite
          )}
        </p>
      </section>

      {/* PASCHA countdown, small three-bar cross above. */}
      <section className="px-5 pt-6 pb-2">
        <div className="flex justify-center mb-2">
          <Cross size={22} className="text-gold" />
        </div>
        <p className="text-center font-sans text-eyebrow font-semibold uppercase tracking-[1.6px] text-gold/85">
          Pascha
        </p>
        <p className="text-center font-display-serif text-title-sm md:text-title text-paper mt-1">
          {pascha.daysAway > 1
            ? `${pascha.daysAway} days`
            : pascha.daysAway === 1
              ? "Tomorrow"
              : pascha.daysAway === 0
                ? "Christ is risen!"
                : "Pascha has passed"}
        </p>
        {pascha.daysAway > 0 ? (
          <p className="text-center font-sans text-eyebrow uppercase tracking-[1.5px] text-paper/55 mt-1">
            {pascha.date.toLocaleDateString(undefined, {
              month: "long",
              day: "numeric",
              year: "numeric",
              timeZone: "UTC",
            })}
          </p>
        ) : null}
      </section>

      {/* CTA strip. Drops the old five-chip Hallow-like nav row entirely
         , the bottom tab bar already does navigation. */}
      <section className="px-5 pt-8 pb-2">
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/prayers/today"
            className="inline-flex items-center justify-center rounded-pill bg-gold text-night font-sans text-ui font-semibold px-5 py-3 hover:bg-gold-soft transition-colors flex-1"
          >
            Open today&rsquo;s prayers
          </Link>
          {headlineSaint ? (
            <Link
              href={`/saints/${headlineSaint.slug}`}
              className="inline-flex items-center justify-center rounded-pill border border-paper/25 text-paper/85 font-sans text-ui font-medium px-5 py-3 hover:border-paper/55 hover:text-paper transition-colors flex-1"
            >
              Read the life
            </Link>
          ) : null}
        </div>
      </section>

      {/* Quiet colophon at the foot, printed-book idiom. */}
      <section className="px-8 pt-10 pb-4 text-center">
        <p className="font-display-serif italic text-ui text-paper/55 leading-[1.55]">
          Through the prayers of our holy Fathers,
          <br />
          Lord Jesus Christ our God, have mercy on us.
        </p>
      </section>

      <div className="h-6" />
    </div>
  );
}

/**
 * Take the first sentence of a longer biography paragraph. Bounded so a
 * runaway paragraph can't blow out the hero on a phone.
 */
function firstSentence(paragraph: string): string {
  const match = paragraph.match(/^[^.!?]+[.!?]/);
  const head = (match ? match[0] : paragraph).trim();
  return head.length > 220 ? head.slice(0, 217).trimEnd() + "…" : head;
}
