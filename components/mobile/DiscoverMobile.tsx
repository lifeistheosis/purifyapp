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
import { MobileTimeline } from "./MobileTimeline";
import { MobileCard } from "./MobileCard";
import { MobileHeader } from "./MobileHeader";
import { MobileHeroCard } from "./MobileHeroCard";
import { MobileSectionLabel } from "./MobileSectionLabel";
import { UserAvatarSmall } from "@/components/today/UserAvatarSmall";

function dayOfYearUtc(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  return Math.floor((d.getTime() - start) / 86_400_000);
}

/**
 * Discover mobile shell, reworked with a saint-led hero card and two
 * rotating "featured" cards (topic + council) that change by day-of-year.
 *
 * Bespoke tint: deep slate blue, distinct from Today (warm rust) and
 * Bible (warm) so the user can tell the tabs apart at a glance.
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

  const councils = COUNCILS;
  const featuredCouncil = councils.length
    ? councils[dayOfYearUtc(today) % councils.length]
    : null;

  const saintTotal = SAINTS.length;
  // A small horizontal strip of three random-ish saint thumbnails on the
  // "All Saints" card. Day-of-year picks the seed so the row is stable
  // for the day but rotates over time.
  const seed = dayOfYearUtc(today);
  const saintStrip = [0, 1, 2]
    .map((k) => SAINTS[(seed + k * 7) % SAINTS.length])
    .filter(Boolean);

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
          headlineSaint ? (
            <SaintIcon saint={headlineSaint} size="md" />
          ) : undefined
        }
        href={headlineSaint ? `/saints/${headlineSaint.slug}` : "/saints"}
      />

      <div className="mt-6">
        <MobileSectionLabel>Featured today</MobileSectionLabel>
        <MobileTimeline>
          {[
            featuredTopic ? (
              <MobileCard
                key="topic"
                eyebrow="Featured topic"
                title={featuredTopic.title}
                href={`/topics/${featuredTopic.slug}`}
              >
                <p className="mt-2 font-serif italic text-[14.5px] text-paper/75 leading-[1.5]">
                  {firstSentence(featuredTopic.definition)}
                </p>
                <p className="mt-3 font-sans text-[13px] font-medium text-paper/75">
                  {featuredTopic.citations.length} citations from the Fathers &rarr;
                </p>
              </MobileCard>
            ) : null,
            featuredCouncil ? (
              <MobileCard
                key="council"
                eyebrow="Featured council"
                title={featuredCouncil.byname}
                href={`/councils/${featuredCouncil.slug}`}
              >
                <p className="mt-2 font-sans text-[13.5px] text-paper/65 leading-[1.55]">
                  Read the canons, the creed, and the editorial framing.
                </p>
                <p className="mt-3 font-sans text-[13px] font-medium text-paper/75">
                  Open the council &rarr;
                </p>
              </MobileCard>
            ) : null,
          ].filter(Boolean) as React.ReactNode[]}
        </MobileTimeline>
      </div>

      <div className="mt-7">
        <MobileSectionLabel>The four bodies</MobileSectionLabel>
        <MobileTimeline>
          {[
            <MobileCard
              key="saints"
              eyebrow="The Saints"
              title={`${saintTotal} indexed lives`}
              href="/saints"
              tint="gold"
            >
              {saintStrip.length > 0 && (
                <div className="mt-3 flex -space-x-2">
                  {saintStrip.map((s) => (
                    <div
                      key={s.slug}
                      className="rounded-full border-2 border-night"
                    >
                      <SaintIcon saint={s} size="sm" />
                    </div>
                  ))}
                </div>
              )}
              <p className="mt-3 font-sans text-[13.5px] text-paper/65 leading-[1.55]">
                Apostles, Fathers, monastics, martyrs. Each profile carries
                the life, the writings, and the commemorations.
              </p>
              <p className="mt-3 font-sans text-[13px] font-medium text-paper/75">
                Browse all &rarr;
              </p>
            </MobileCard>,
            <MobileCard
              key="calendar"
              eyebrow="The Sacred Calendar"
              title="Today, the fast, the moveable feasts"
              href="/calendar"
            >
              <p className="mt-2 font-sans text-[13.5px] text-paper/65 leading-[1.55]">
                {fast.label}.{" "}
                {pascha.daysAway > 0
                  ? `Pascha in ${pascha.daysAway} days.`
                  : pascha.label + "."}
              </p>
              <p className="mt-3 font-sans text-[13px] font-medium text-paper/75">
                Open the calendar &rarr;
              </p>
            </MobileCard>,
            <MobileCard
              key="councils"
              eyebrow="The Councils"
              title="In the Fathers' own words"
              href="/councils"
            >
              <p className="mt-2 font-sans text-[13.5px] text-paper/65 leading-[1.55]">
                The Seven Ecumenical Councils, with the conciliar text and the
                editorial framing around the words that defined the Faith.
              </p>
              <p className="mt-3 font-sans text-[13px] font-medium text-paper/75">
                Open the councils &rarr;
              </p>
            </MobileCard>,
            <MobileCard
              key="topics"
              eyebrow="Topics"
              title="The same thread, across the Fathers"
              href="/topics"
            >
              <p className="mt-2 font-sans text-[13.5px] text-paper/65 leading-[1.55]">
                Love, prayer, repentance, the Trinity. One topic at a time,
                with the relevant sentences from each Father side by side.
              </p>
              <p className="mt-3 font-sans text-[13px] font-medium text-paper/75">
                Browse topics &rarr;
              </p>
            </MobileCard>,
            <MobileCard
              key="bible-link"
              eyebrow="Scripture"
              title="The Orthodox Bible"
              href="/bible"
            >
              <p className="mt-2 font-sans text-[13.5px] text-paper/65 leading-[1.55]">
                Septuagint, KJV, with cross-references. Tap to read.
              </p>
              <p className="mt-3 font-sans text-[13px] font-medium text-paper/75">
                Open the Bible &rarr;
              </p>
            </MobileCard>,
          ]}
        </MobileTimeline>
      </div>
    </MobileShell>
  );
}

function firstSentence(s: string): string {
  if (!s) return "";
  const m = s.match(/^.+?[.!?](?:\s|$)/);
  return (m ? m[0] : s).trim();
}
