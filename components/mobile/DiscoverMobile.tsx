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
import { BodyGrid, type BodyTile } from "./BodyGrid";

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
 *   2. SaintStrip — horizontal scroll of the next seven days' headline
 *      saints.
 *   3. Featured today (topic + council), two parchment-tinted cards.
 *   4. BodyGrid — 2×2 grid of the four bodies. No long timeline.
 */
export async function DiscoverMobile() {
  const today = startOfDayUtc(new Date());
  const commemorations = commemorationsOn(today);
  const fast = fastingStatus(today);
  const pascha = paschaInfo(today);

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

  const saintTotal = SAINTS.length;
  const tiles: BodyTile[] = [
    {
      label: "The Saints",
      blurb: `${saintTotal} indexed lives.`,
      href: "/saints",
      accent: true,
    },
    {
      label: "The Calendar",
      blurb: `${fast.label}. ${
        pascha.daysAway > 0 ? `Pascha in ${pascha.daysAway} days.` : pascha.label
      }`,
      href: "/calendar",
    },
    {
      label: "The Councils",
      blurb: "The Seven Ecumenical Councils, in the Fathers' own words.",
      href: "/councils",
    },
    {
      label: "Topics",
      blurb: "One thread, traced across the Fathers side by side.",
      href: "/topics",
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

      <div className="mt-6">
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
                <p className="mt-2 font-serif italic text-[14.5px] text-paper/75 leading-[1.5]">
                  {firstSentence(featuredTopic.definition)}
                </p>
                <p className="mt-3 font-sans text-[13px] font-medium text-paper/75">
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
                <p className="mt-2 font-sans text-[13.5px] text-paper/65 leading-[1.55]">
                  Read the canons, the creed, and the editorial framing.
                </p>
                <p className="mt-3 font-sans text-[13px] font-medium text-paper/75">
                  Open the council →
                </p>
              </MobileCard>
            )}
          </div>
        </div>
      )}

      <div className="mt-7">
        <MobileSectionLabel>The four bodies</MobileSectionLabel>
        <BodyGrid tiles={tiles} />
      </div>
    </MobileShell>
  );
}
