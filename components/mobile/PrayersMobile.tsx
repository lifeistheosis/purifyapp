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
import { Calendar } from "@/components/ui/icons/Calendar";
import { Lampada } from "@/components/ui/icons/Lampada";
import { PrayerRope } from "@/components/ui/icons/PrayerRope";
import { Lyre } from "@/components/ui/icons/Lyre";
import { Orans } from "@/components/ui/icons/Orans";
import { Hands } from "@/components/ui/icons/Hands";
import { PrayerSearch } from "@/components/prayers/PrayerSearch";
import { PrayNow } from "@/components/prayers/PrayNow";
import { PrayerBookIndex } from "@/components/prayers/PrayerBookIndex";
import { CARD, CARD_BG, Eyebrow, PILL } from "@/components/ui/Graphite";
import { cn } from "@/lib/cn";
import { T } from "@/components/i18n/T";
import { useTranslate } from "@/components/i18n/MessagesProvider";

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

/** The quick ways in, the same six the desktop hero carries. */
const QUICK = [
  { href: "/prayers/morning", k: "prayers.rule.morning.title" },
  { href: "/prayers/evening", k: "prayers.rule.evening.title" },
  { href: "/prayers/hours", k: "prayers.hours" },
  { href: "/prayers/rope", k: "prayers.also.ropeTitle" },
  { href: "/prayers/akathists", k: "prayers.akathists" },
  { href: "/prayers/learning", k: "ui.learnToPray" },
] as const;

/**
 * Prayers on a phone. Redesigned 2026-09-26 with the desktop hub, in the
 * same order and the same graphite cards, sized for one thumb:
 *
 *   masthead      the section's words and the hour's line, then the quick
 *                 ways in as one row of pills that scrolls sideways
 *   Pray now      one card, four rows: the prayer to continue, then what
 *                 fits the hour, the season and the fast. It replaces the
 *                 Continue praying and Suggested for today lists.
 *   the heart     the Jesus Prayer, then the Prayer Rope Anthem band
 *   Practices     six soft tiles, an even grid now that Today has one
 *   the book      search, then every rule by category
 */
export function PrayersMobile() {
  // Resolved on the device. This was `startOfDayUtc(new Date())` in a
  // server component, so the Android static export froze the dateline, the
  // season and the fast at build time. See lib/calendar/useToday.ts.
  const today = useToday();
  const mounted = useMounted();
  const mode = mounted ? heroModeFor(new Date()) : "morning";
  // The dateline follows the reader's language. formatLongDate() falls back
  // to hardcoded English weekday and month names when it is given no locale,
  // which is what the eyebrow was showing in all twenty of them.
  const { locale } = useTranslate();

  return (
    <MobileShell
      header={<MobileHeader titleKey="nav.prayers" trailing={<UserAvatarSmall />} />}
      eyebrow={today ? formatLongDate(today, locale) : " "}
    >
      {/* The Deesis: Christ with the Theotokos and the Forerunner
          interceding, which is what this surface is for. */}
      <SectionMasthead section="prayers" />

      <header className="pt-1">
        <Eyebrow className="text-eyebrow">
          <T k="footer.prayer" />
        </Eyebrow>
        {/* h2, not h1: MobileHeader above already names the section, and
            one surface should say its name once. */}
        <h2 className="mt-3 text-title font-bold leading-[1.1] tracking-[-0.02em] text-paper">
          <T k="ui.prayWithoutCeasing" />
        </h2>
        <p className="mt-2 font-serif italic text-detail text-paper/55">
          <T k="ui.1Thessalonians517" />
        </p>
        <p className="mt-4 max-w-[40ch] font-sans text-ui leading-[1.6] text-paper/75">
          <T k={TIME_LINE_KEY[mode]} />
        </p>
      </header>

      {/* The quick ways in: one row, scrolled sideways, bleeding to the
          screen's edges so the last pill reads as "there is more". */}
      <nav aria-label="Prayers" className="no-scrollbar -mx-5 mt-6 overflow-x-auto px-5">
        <ul className="flex w-max gap-2 pb-1">
          {QUICK.map((q) => (
            <li key={q.href}>
              <Link href={q.href} className={cn(PILL, "whitespace-nowrap px-4 text-detail")}>
                <T k={q.k} />
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <section className="mt-10">
        <Eyebrow level={2} className="text-eyebrow">
          <T k="today.prayNow.eyebrow" />
        </Eyebrow>
        <div className="mt-3">
          <PrayNow variant="mobile" />
        </div>
      </section>

      {/* The prayer of the heart */}
      <section className="mt-10">
        <Eyebrow level={2} className="text-eyebrow">
          <T k="prayers.heart.eyebrow" />
        </Eyebrow>
        <div className={cn(CARD, "mt-3 p-5 hover:translate-y-0 md:p-5")} style={CARD_BG}>
          <p className="font-heading text-title-sm font-bold leading-[1.4] text-paper">
            <T k="prayers.heart.line1" />
            <br />
            <T k="prayers.heart.line2" />
            <br />
            <T k="prayers.heart.line3" />
          </p>
          <p className="mt-3 font-sans text-detail leading-[1.6] text-paper/65">
            <T k="prayers.heart.note" />
          </p>
          {/* One way on from here. The rope already has a pill above and a
              tile below, and two pills side by side wrapped at phone width. */}
          <div className="mt-5">
            <Link href="/prayers/learning/jesus-prayer" className={cn(PILL, "px-4 text-detail")}>
              <T k="ui.learnHowToPrayIt" />
            </Link>
          </div>
        </div>
        {/* The Prayer Rope Anthem, as the mobile surfaces' play band. */}
        <div className="mt-3">
          <FeatureBand
            href="/prayers/anthem"
            eyebrow={<T k="today.prayNow.anthemKicker" />}
            title={<T k="today.prayNow.anthemTitle" />}
            sub={<T k="ui.anthemSub" />}
          />
        </div>
      </section>

      {/* Practices: the surfaces with their own screens, as soft tiles. */}
      <section className="mt-10">
        <Eyebrow level={2} className="text-eyebrow">
          <T k="ui.practices" />
        </Eyebrow>
        <SoftTileGrid className="mt-3">
          <SoftTile href="/prayers/today" label={<T k="prayers.tabs.today" />} sub={<T k="prayers.openToday" />} icon={<Calendar size={20} />} tone="a" />
          <SoftTile href="/prayers/hours" label={<T k="ui.theHours" />} sub={<T k="ui.sanctifyTheDay" />} icon={<Lampada size={21} />} tone="b" />
          <SoftTile href="/prayers/rope" label={<T k="ui.theRope" />} sub={<T k="prayers.jesusPrayer" />} icon={<PrayerRope size={21} />} tone="c" />
          <SoftTile href="/prayers/akathists" label={<T k="prayers.akathists" />} sub={<T k="ui.hymnsOfPraise" />} icon={<Lyre size={21} />} tone="d" />
          <SoftTile href="/prayers/learning" label={<T k="ui.learnToPray" />} sub={<T k="ui.aBeginnersPath" />} icon={<Orans size={21} />} tone="b" />
          <SoftTile href="/prayers/personal" label={<T k="prayers.tabs.personal" />} sub={<T k="ui.yourOwnRule" />} icon={<Hands size={21} />} tone="a" />
        </SoftTileGrid>
      </section>

      <div className="mt-8">
        <DiptychPreview />
      </div>

      {/* The prayer book: a typed query replaces the index with results. */}
      <section className="mt-10">
        <Eyebrow level={2} className="text-eyebrow">
          <T k="prayers.bookTitle" />
        </Eyebrow>
        <div className="mt-3">
          <PrayerSearch>
            <PrayerBookIndex variant="mobile" />
          </PrayerSearch>
        </div>
      </section>
    </MobileShell>
  );
}
