"use client";

import Link from "next/link";
import { formatLongDate } from "@/lib/calendar/orthodox";
import { useToday } from "@/lib/calendar/useToday";
import { useMounted } from "@/lib/useMounted";
import { MobileShell } from "./MobileShell";
import { MobileHeader } from "./MobileHeader";
import { SectionMasthead } from "./SectionMasthead";
import { DiptychPreview } from "./DiptychPreview";
import { SoftTile, SoftTileGrid, FeatureBand } from "./SoftTiles";
import { UserAvatarSmall } from "@/components/today/UserAvatarSmall";
import { Lampada } from "@/components/ui/icons/Lampada";
import { PrayerRope } from "@/components/ui/icons/PrayerRope";
import { Lyre } from "@/components/ui/icons/Lyre";
import { Orans } from "@/components/ui/icons/Orans";
import { Hands } from "@/components/ui/icons/Hands";
import {
  PrayerSectionLabel,
  PrayerIndex,
  PrayerIndexRow,
} from "@/components/prayers/PrayerBook";
import { PrayerSearch } from "@/components/prayers/PrayerSearch";
import { ContinuePraying } from "@/components/prayers/ContinuePraying";
import { SuggestedToday } from "@/components/prayers/SuggestedToday";
import {
  RULE_CATEGORY_ORDER,
  indexRules,
  popularRules,
  type RuleCategory,
} from "@/lib/prayers/rules";
import { useCalendarStyleDefault } from "@/lib/calendar/useCalendarStyleDefault";
import { seasonFor, isFastDay } from "@/lib/prayers/season";
import { T } from "@/components/i18n/T";

type HeroMode = "morning" | "midday" | "evening";

/** The reader's own hour, not UTC: "Stand before God before the day takes
 *  you" is wrong copy to show someone at 9pm because a server said 02:00. */
function heroModeFor(d: Date): HeroMode {
  const h = d.getHours();
  if (h < 12) return "morning";
  if (h < 19) return "midday";
  return "evening";
}

/** Catalog keys, not copy: the line follows the reader's language. */
const TIME_LINE_KEY: Record<HeroMode, string> = {
  morning: "prayers.timeLine.morning",
  midday: "prayers.timeLine.midday",
  evening: "prayers.timeLine.evening",
};

/** Section labels for the index. "The Church year" already exists in the
 *  catalog under the saints namespace, so it is reused rather than
 *  re-translated into twenty languages. */
const RULE_CATEGORY_KEY: Record<RuleCategory, string> = {
  daily: "prayers.category.daily",
  "daily-life": "prayers.category.dailyLife",
  "church-year": "saints.theChurchYear",
  devotional: "prayers.category.devotional",
};

/**
 * Prayers mobile shell, in the quiet prayer-book register.
 *
 * A calm masthead (no tinted gradient card), the prayer of the heart, the
 * user's diptychs when present, and the rest of the section as hairline
 * index rows grouped under quiet labels — the same vocabulary the desktop
 * hub uses, so the two read as one design.
 */
export function PrayersMobile() {
  // Resolved on the device. This was `startOfDayUtc(new Date())` in a
  // server component, so the Android static export froze the dateline, the
  // season and the fast at build time. See lib/calendar/useToday.ts.
  const today = useToday();
  const mounted = useMounted();
  const mode = mounted ? heroModeFor(new Date()) : "morning";
  const season = today ? seasonFor(today) : null;
  const [style] = useCalendarStyleDefault();
  const isFast = today ? isFastDay(today, style) : false;

  return (
    <MobileShell
      header={<MobileHeader titleKey="nav.prayers" trailing={<UserAvatarSmall />} />}
      eyebrow={today ? formatLongDate(today) : " "}
    >
      {/* The Deesis: Christ with the Theotokos and the Forerunner
          interceding, which is what this surface is for. Mobile had no
          photography at all here; the two icon-bearing prayer components
          were both inside a `hidden md:block` desktop branch. */}
      <SectionMasthead section="prayers" />

      {/* Quiet masthead */}
      <header className="text-center pt-1">
        <p className="font-sans text-eyebrow uppercase tracking-[2.5px] text-paper/40 mb-4">
          <T k="footer.prayer" />
        </p>
        {/* h2, not h1: MobileHeader above already names the section, and
            one surface should say its name once. */}
        <h2 className="font-serif text-title leading-[1.15] tracking-[-0.01em] text-paper">
          <T k="ui.prayWithoutCeasing" />
        </h2>
        <p className="mt-3 font-serif italic text-detail text-paper/45">
          <T k="ui.1Thessalonians517" />
        </p>
        <div aria-hidden className="mx-auto mt-6 h-px w-10 bg-gold/50" />
        <p className="mx-auto mt-6 max-w-[40ch] font-serif text-body text-paper/70 leading-[1.75]">
          <T k={TIME_LINE_KEY[mode]} />
        </p>
      </header>

      {/* The prayer of the heart */}
      <div className="my-10 text-center">
        <p className="font-serif text-title-sm leading-[1.5] text-paper/90">
          <T k="prayers.heart.line1" />
          <br />
          <T k="prayers.heart.line2" />
          <br />
          <T k="prayers.heart.line3" />
        </p>
        <p className="mt-5">
          <Link
            href="/prayers/learning/jesus-prayer"
            className="font-sans text-detail font-medium text-gold/80 underline decoration-gold/30 underline-offset-4"
          >
            <T k="ui.learnHowToPrayIt" />
          </Link>
        </p>
      </div>

      {/* Featured: The Prayer Rope Anthem, as a gradient play band high on
          the scroll so the hymn is visible without scrolling the index. */}
      <div className="mb-6">
        <FeatureBand
          href="/prayers/anthem"
          eyebrow={<T k="today.prayNow.anthemKicker" />}
          title={<T k="today.prayNow.anthemTitle" />}
          sub={<T k="ui.anthemSub" />}
        />
      </div>

      {/* Practices: the surfaces with their own UI, as soft tiles. */}
      <p className="mb-3 font-sans text-eyebrow uppercase tracking-[2px] text-paper/55">
        <T k="ui.practices" />
      </p>
      <SoftTileGrid className="mb-8">
        <SoftTile href="/prayers/hours" label={<T k="ui.theHours" />} sub={<T k="ui.sanctifyTheDay" />} icon={<Lampada size={21} />} tone="b" />
        <SoftTile href="/prayers/rope" label={<T k="ui.theRope" />} sub={<T k="prayers.jesusPrayer" />} icon={<PrayerRope size={21} />} tone="c" />
        <SoftTile href="/prayers/akathists" label={<T k="prayers.akathists" />} sub={<T k="ui.hymnsOfPraise" />} icon={<Lyre size={21} />} tone="d" />
        <SoftTile href="/prayers/learning" label={<T k="ui.learnToPray" />} sub={<T k="ui.aBeginnersPath" />} icon={<Orans size={21} />} tone="b" />
        <SoftTile href="/prayers/personal" label={<T k="prayers.tabs.personal" />} sub={<T k="ui.yourOwnRule" />} icon={<Hands size={21} />} tone="a" />
      </SoftTileGrid>

      <DiptychPreview />

      <div className="mt-2">
        <ContinuePraying label={<T k="ui.continuePraying" />} />

        {season && (
          <SuggestedToday season={season} isFast={isFast} label={<T k="ui.suggestedForToday" />} />
        )}

        {/* Search wraps the index so a typed query replaces the
            popular + categorized + Also-in-this-book lists with
            filtered results. */}
        <div className="mt-6">
        <PrayerSearch>
        {popularRules().length > 0 && (
          <>
            <PrayerSectionLabel><T k="ui.popularPrayerRules" /></PrayerSectionLabel>
            <PrayerIndex>
              {popularRules().map((r) => (
                <PrayerIndexRow
                  key={r.id}
                  href={r.href}
                  title={r.title}
                  description={r.description}
                  meta={
                    r.estimatedMinutes ? (
                      <T k="prayers.approxMin" count={r.estimatedMinutes} />
                    ) : undefined
                  }
                />
              ))}
            </PrayerIndex>
          </>
        )}

        {RULE_CATEGORY_ORDER.map((category) => {
          const rules = indexRules(category);
          if (rules.length === 0) return null;
          return (
            <div key={category}>
              <PrayerSectionLabel>
                <T k={RULE_CATEGORY_KEY[category]} />
              </PrayerSectionLabel>
              <PrayerIndex>
                {rules.map((r) => (
                  <PrayerIndexRow
                    key={r.id}
                    href={r.href}
                    title={r.title}
                    description={r.description}
                    planned={r.planned}
                    meta={
                      r.estimatedMinutes ? (
                        <T k="prayers.approxMin" count={r.estimatedMinutes} />
                      ) : undefined
                    }
                  />
                ))}
              </PrayerIndex>
            </div>
          );
        })}

        {/* "Also in this book" is now the Practices tile grid above the
            index, so it isn't repeated here as a hairline list. */}
        </PrayerSearch>
        </div>
      </div>
    </MobileShell>
  );
}
