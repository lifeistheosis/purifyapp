import {
  commemorationsOn,
  fastingStatus,
  formatLongDate,
  paschaInfo,
  startOfDayUtc,
} from "@/lib/calendar/orthodox";
import { getSaint, SAINTS } from "@/lib/saints/saints";
import { loadAllTopics } from "@/lib/topics/topics";
import { COUNCILS } from "@/lib/councils/councils";
import { SaintIcon } from "@/components/saints/SaintIcon";
import { MobileShell } from "./MobileShell";
import { MobileCard } from "./MobileCard";
import { MobileHeader } from "./MobileHeader";
import { MobileHeroCard } from "./MobileHeroCard";
import { MobileSectionLabel } from "./MobileSectionLabel";
import { UserAvatarSmall } from "@/components/today/UserAvatarSmall";
import { DayBadge } from "./DayBadge";
import { SaintStrip } from "./SaintStrip";
import { DiscoverIndex, type DiscoverEntry } from "./DiscoverIndex";
import { Halo } from "@/components/ui/icons/Halo";
import { Cross } from "@/components/ui/icons/Cross";
import { Lampada } from "@/components/ui/icons/Lampada";
import { Octogram } from "@/components/ui/icons/Octogram";
import { Codex } from "@/components/ui/icons/Codex";
import { Wheat } from "@/components/ui/icons/Wheat";
import { Grapes } from "@/components/ui/icons/Grapes";
import { getServerLocale } from "@/lib/i18n/server";
import { getMessages, t } from "@/lib/i18n";

function dayOfYearUtc(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  return Math.floor((d.getTime() - start) / 86_400_000);
}

function firstSentence(s: string): string {
  if (!s) return "";
  const m = s.match(/^.+?[.!?](?:\s|$)/);
  return (m ? m[0] : s).trim();
}

/**
 * Discover mobile shell — "the menologion."
 *
 *   1. Deep-slate hero with the saint icon + DayBadge as `aside`.
 *   2. The library — a menologion list of every library destination
 *      (saints, councils, calendar, topics, daily readings, psalter,
 *      patristic). The page's centerpiece.
 *   3. SaintStrip — horizontal scroll of the next seven days' saints.
 *   4. Featured today (topic + council), two parchment-tinted cards.
 *   5. Closing colophon.
 */
export async function DiscoverMobile() {
  const today = startOfDayUtc(new Date());
  const commemorations = commemorationsOn(today);
  const fast = fastingStatus(today);
  const pascha = paschaInfo(today);

  const locale = await getServerLocale();
  const m = getMessages(locale);

  const headline =
    commemorations.find((c) => c.kind === "feast") ?? commemorations[0];
  const headlineSaint =
    headline?.saint ?? (headline?.slug ? getSaint(headline.slug) : null);

  const topics = await loadAllTopics();
  const featuredTopic = topics.length
    ? topics[dayOfYearUtc(today) % topics.length]
    : null;
  const featuredCouncil = COUNCILS.length
    ? COUNCILS[dayOfYearUtc(today) % COUNCILS.length]
    : null;

  // The library index. Order reads like a menologion table of contents:
  // people first (saints, councils), then the year, the topical threads,
  // the daily readings, the Psalter, and the patristic commentary that
  // ties it together. Saints + Calendar carry a live blurb; the rest reuse
  // the shared `discover.tile.*` strings.
  const entries: DiscoverEntry[] = [
    {
      label: t(m, "discover.tile.saints"),
      href: "/saints",
      blurb: `${SAINTS.length} indexed lives, with their works to read in full.`,
      Icon: Halo,
    },
    {
      label: t(m, "discover.tile.councils"),
      href: "/councils",
      blurb: t(m, "discover.tile.councilsBlurb"),
      Icon: Cross,
    },
    {
      label: t(m, "discover.tile.calendar"),
      href: "/calendar",
      blurb: `${fast.label}. ${
        pascha.daysAway > 0
          ? `Pascha in ${pascha.daysAway} days.`
          : pascha.label
      }`,
      Icon: Lampada,
    },
    {
      label: t(m, "discover.tile.topics"),
      href: "/topics",
      blurb: t(m, "discover.tile.topicsBlurb"),
      Icon: Octogram,
    },
    {
      label: t(m, "discover.tile.dailyReadings"),
      href: "/prayers/today",
      blurb: t(m, "discover.tile.dailyReadingsBlurb"),
      Icon: Codex,
    },
    {
      label: t(m, "discover.tile.psalter"),
      href: "/bible/psalms/1",
      blurb: t(m, "discover.tile.psalterBlurb"),
      Icon: Wheat,
    },
    {
      label: t(m, "discover.tile.patristic"),
      href: "/bible/john/1",
      blurb: t(m, "discover.tile.patristicBlurb"),
      Icon: Grapes,
    },
  ];

  return (
    <MobileShell
      header={<MobileHeader title="Discover" trailing={<UserAvatarSmall />} />}
      eyebrow={formatLongDate(today)}
    >
      <MobileHeroCard
        tint="deep"
        eyebrow="Today's Commemoration"
        kicker={headline?.name ?? "No saint indexed for today"}
        headline={
          headlineSaint?.shortBio ? (
            <span>{firstSentence(headlineSaint.shortBio)}</span>
          ) : headline?.note ? (
            <span className="italic">{headline.note}</span>
          ) : (
            <span className="italic text-paper/55">
              Open the saints index to find tomorrow&rsquo;s feast.
            </span>
          )
        }
        aside={
          <div className="flex flex-col items-end gap-2">
            <DayBadge date={today} />
            {headlineSaint && <SaintIcon saint={headlineSaint} size="sm" />}
          </div>
        }
        href={headlineSaint ? `/saints/${headlineSaint.slug}` : "/saints"}
      />

      <div className="mt-7">
        <MobileSectionLabel>The library</MobileSectionLabel>
        <DiscoverIndex entries={entries} />
      </div>

      <div className="mt-7">
        <SaintStrip />
      </div>

      {(featuredTopic || featuredCouncil) && (
        <div className="mt-7">
          <MobileSectionLabel>Featured today</MobileSectionLabel>
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
                  {featuredTopic.citations.length} citations from the Fathers →
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
                  Read the canons, the creed, and the editorial framing.
                </p>
                <p className="mt-3 font-sans text-detail font-medium text-paper/75">
                  Open the council →
                </p>
              </MobileCard>
            )}
          </div>
        </div>
      )}

      <p className="mt-10 text-center font-display-serif italic text-detail text-paper/45 leading-[1.55]">
        Through the prayers of our holy Fathers,
        <br />
        Lord Jesus Christ our God, have mercy on us.
      </p>
    </MobileShell>
  );
}
