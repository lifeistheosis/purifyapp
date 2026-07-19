import {
  fastingStatus,
  paschaInfo,
  startOfDayUtc,
} from "@/lib/calendar/orthodox";
import { loadAllTopics } from "@/lib/topics/topics";
import { COUNCILS } from "@/lib/councils/councils";
import { MobileShell } from "./MobileShell";
import { MobileCard } from "./MobileCard";
import { MobileHeader } from "./MobileHeader";
import { MobileSectionLabel } from "./MobileSectionLabel";
import { SoftTile, SoftTileGrid, type Tone } from "./SoftTiles";
import { UserAvatarSmall } from "@/components/today/UserAvatarSmall";
import { type DiscoverEntry } from "./DiscoverIndex";
import { OrnamentHeadpiece } from "@/components/calendar/OrnamentHeadpiece";
import { Church } from "@/components/ui/icons/Church";
import { Calendar } from "@/components/ui/icons/Calendar";
import { Codex } from "@/components/ui/icons/Codex";
import { Cross } from "@/components/ui/icons/Cross";
import { Hourglass } from "@/components/ui/icons/Hourglass";
import { getServerLocale } from "@/lib/i18n/server";
import { getMessages, t } from "@/lib/i18n";
import { T } from "@/components/i18n/T";

function dayOfYearUtc(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  return Math.floor((d.getTime() - start) / 86_400_000);
}

function firstSentence(s: string): string {
  if (!s) return "";
  const m = s.match(/^.+?[.!?](?:\s|$)/);
  return (m ? m[0] : s).trim();
}

// Tone cycle for the library tile grid — graded neutrals, no colour.
const LIBRARY_TONES: Tone[] = ["a", "b", "c", "d"];

/**
 * Discover mobile shell — "the menologion."
 *
 *   1. Masthead — ornament headpiece + "THE WHOLE LIBRARY" / "Discover." /
 *      subtitle, matching the desktop Discover page.
 *   2. Deep-slate hero with the saint icon + DayBadge as `aside`.
 *   3. The library — a menologion list of every library destination
 *      (saints, councils, calendar, topics, daily readings, psalter,
 *      patristic). The page's centerpiece.
 *   4. Featured today (topic + council), two parchment-tinted cards.
 *   5. Closing colophon.
 */
export async function DiscoverMobile() {
  const today = startOfDayUtc(new Date());
  const fast = fastingStatus(today);
  const pascha = paschaInfo(today);

  const locale = await getServerLocale();
  const m = getMessages(locale);

  const topics = await loadAllTopics();
  const featuredTopic = topics.length
    ? topics[dayOfYearUtc(today) % topics.length]
    : null;
  const featuredCouncil = COUNCILS.length
    ? COUNCILS[dayOfYearUtc(today) % COUNCILS.length]
    : null;

  // The library index. Order reads like a menologion table of contents:
  // people first (saints), then the doctrinal record together (the councils,
  // the topics they confessed, the heresies they condemned), then the year,
  // the daily readings, the Psalter, and the patristic commentary that ties
  // it together. Saints + Calendar carry a live blurb; the rest reuse the
  // shared `discover.tile.*` strings.
  const entries: DiscoverEntry[] = [
    {
      label: t(m, "discover.tile.councils"),
      href: "/councils",
      blurb: t(m, "discover.tile.councilsBlurb"),
      Icon: Church,
    },
    {
      // The one Theology umbrella: Doctrine, Topics, Heresies, and
      // Apologetics now live under its hub and shared mode switcher.
      label: t(m, "discover.tile.theology"),
      href: "/theology",
      blurb: t(m, "discover.tile.theologyBlurb"),
      Icon: Cross,
    },
    {
      label: t(m, "discover.tile.history"),
      href: "/history",
      blurb: t(m, "discover.tile.historyBlurb"),
      Icon: Hourglass,
    },
    {
      label: t(m, "discover.tile.calendar"),
      href: "/calendar",
      blurb: `${fast.label}. ${
        pascha.daysAway > 0
          ? `Pascha in ${pascha.daysAway} days.`
          : pascha.label
      }`,
      Icon: Calendar,
    },
    {
      label: t(m, "discover.tile.dailyReadings"),
      href: "/prayers/today",
      blurb: t(m, "discover.tile.dailyReadingsBlurb"),
      Icon: Codex,
    },
  ];

  return (
    <MobileShell
      header={<MobileHeader titleKey="nav.discover" trailing={<UserAvatarSmall />} />}
    >
      {/* Masthead — mirrors the desktop Discover page so the tab opens with
          the calm "whole library" identity. */}
      <header className="text-center mb-7">
        <OrnamentHeadpiece className="mx-auto mb-4 max-w-[320px]" />
        <p className="font-sans text-caption font-semibold uppercase tracking-[1.6px] text-gold/85 mb-2">
          {t(m, "discover.eyebrow")}
        </p>
        <h1 className="font-display-serif text-heading text-paper leading-[1.05]">
          {t(m, "discover.h1")}
        </h1>
        <p className="mt-3 font-serif italic text-ui text-paper/70 max-w-[420px] mx-auto leading-[1.6]">
          {t(m, "discover.subtitle")}
        </p>
      </header>

      {/* Reading hub — prominent entry to the new reading room, above the
          commemoration so "sitting down to read" leads the surface. */}
      <MobileCard
        eyebrow={t(m, "reading.eyebrow")}
        title={t(m, "reading.h1").replace(/\.$/, "")}
        href="/reading"
        tint="gold"
      >
        <p className="mt-2 font-serif italic text-ui text-paper/75 leading-[1.5]">
          {t(m, "reading.subtitle")}
        </p>
        <p className="mt-3 font-sans text-detail font-medium text-paper/75">
          {t(m, "reading.enterReadingRoom")} →
        </p>
      </MobileCard>

      <div className="mt-7">
        <MobileSectionLabel><T k="ui.theLibrary" /></MobileSectionLabel>
        <SoftTileGrid className="mt-1">
          {entries.map((e, i) => (
            <SoftTile
              key={e.href}
              href={e.href}
              label={e.label}
              icon={<e.Icon size={21} />}
              tone={LIBRARY_TONES[i % LIBRARY_TONES.length]}
            />
          ))}
          {/* The marketplace now has its own bottom-bar tab (Beta 1.9), so the
              Discover tile was retired. */}
        </SoftTileGrid>
      </div>

      {(featuredTopic || featuredCouncil) && (
        <div className="mt-7">
          <MobileSectionLabel><T k="ui.featuredToday" /></MobileSectionLabel>
          <div className="space-y-3">
            {featuredTopic && (
              <MobileCard
                eyebrow="Featured topic"
                title={featuredTopic.title}
                href={`/topics/${featuredTopic.slug}`}
                tint="warm"
              >
                <p className="mt-2 font-serif italic text-ui text-paper/75 leading-[1.5]">
                  {firstSentence(featuredTopic.definition)}
                </p>
                <p className="mt-3 font-sans text-detail font-medium text-paper/75">
                  {featuredTopic.citations.length} <T k="ui.citationsFromTheFathers" />
                </p>
              </MobileCard>
            )}
            {featuredCouncil && (
              <MobileCard
                eyebrow="Featured council"
                title={featuredCouncil.byname}
                href={`/councils/${featuredCouncil.slug}`}
                tint="gold"
              >
                <p className="mt-2 font-sans text-detail text-paper/65 leading-[1.55]">
                  <T k="ui.readTheCanonsTheCreed" />
                </p>
                <p className="mt-3 font-sans text-detail font-medium text-paper/75">
                  <T k="ui.openTheCouncil" />
                </p>
              </MobileCard>
            )}
          </div>
        </div>
      )}

      <p className="mt-10 text-center font-display-serif italic text-detail text-paper/45 leading-[1.55]">
        <T k="ui.throughThePrayersOfOur" />
        <br />
        <T k="ui.lordJesusChristOurGod" />
      </p>
    </MobileShell>
  );
}
