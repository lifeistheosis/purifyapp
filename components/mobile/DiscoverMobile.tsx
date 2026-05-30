import {
  commemorationsOn,
  fastingStatus,
  formatLongDate,
  paschaInfo,
  startOfDayUtc,
} from "@/lib/calendar/orthodox";
import { getSaint, SAINTS } from "@/lib/saints/saints";
import { MobileShell } from "./MobileShell";
import { MobileTimeline } from "./MobileTimeline";
import { MobileCard } from "./MobileCard";
import { MobileHeader } from "./MobileHeader";
import { UserAvatarSmall } from "@/components/today/UserAvatarSmall";

/**
 * Discover mobile shell. The four discoverable bodies of the app:
 * the saints, the councils, the calendar, the topics. Each as a tap
 * target with a small live signal of what's "today" inside it.
 */
export function DiscoverMobile() {
  const today = startOfDayUtc(new Date());
  const commemorations = commemorationsOn(today);
  const fast = fastingStatus(today);
  const pascha = paschaInfo(today);
  const headline =
    commemorations.find((c) => c.kind === "feast") ?? commemorations[0];
  const headlineSaint =
    headline?.saint ?? (headline?.slug ? getSaint(headline.slug) : null);

  const saintTotal = SAINTS.length;

  return (
    <MobileShell
      header={<MobileHeader title="Discover" trailing={<UserAvatarSmall />} />}
      eyebrow={formatLongDate(today)}
    >
      <MobileTimeline>
        {[
          <MobileCard
            key="saint"
            eyebrow="Today's commemoration"
            title={headline?.name ?? "No saint indexed"}
            href={headlineSaint ? `/saints/${headlineSaint.slug}` : "/saints"}
            tint="warm"
          >
            {headline?.note ? (
              <p className="mt-2 font-serif italic text-[14.5px] text-paper/75 leading-[1.5]">
                {headline.note}
              </p>
            ) : (
              <p className="mt-2 font-sans text-[13.5px] text-paper/55 italic">
                Open the saints index to find tomorrow&rsquo;s feast.
              </p>
            )}
            <p className="mt-3 font-sans text-[13px] font-medium text-paper/75">
              Open profile →
            </p>
          </MobileCard>,
          <MobileCard
            key="calendar"
            eyebrow="The Sacred Calendar"
            title="Today, the fast, the moveable feasts"
            href="/calendar"
          >
            <p className="mt-2 font-sans text-[13.5px] text-paper/65 leading-[1.55]">
              {fast.label}. {pascha.daysAway > 0
                ? `Pascha in ${pascha.daysAway} days.`
                : pascha.label + "."}
            </p>
            <p className="mt-3 font-sans text-[13px] font-medium text-paper/75">
              Open the calendar →
            </p>
          </MobileCard>,
          <MobileCard
            key="saints"
            eyebrow="The Saints"
            title={`${saintTotal} indexed lives`}
            href="/saints"
            tint="gold"
          >
            <p className="mt-2 font-sans text-[13.5px] text-paper/65 leading-[1.55]">
              Apostles, Fathers, monastics, martyrs. Each profile carries
              the life, the writings, and the commemorations.
            </p>
            <p className="mt-3 font-sans text-[13px] font-medium text-paper/75">
              Browse all →
            </p>
          </MobileCard>,
          <MobileCard
            key="councils"
            eyebrow="The Councils"
            title="In the Fathers' own words"
            href="/councils"
          >
            <p className="mt-2 font-sans text-[13.5px] text-paper/65 leading-[1.55]">
              The First Council of Nicaea (325) with the original Creed and
              the editorial framing around ὁμοούσιον.
            </p>
            <p className="mt-3 font-sans text-[13px] font-medium text-paper/75">
              Open the councils →
            </p>
          </MobileCard>,
          <MobileCard
            key="topics"
            eyebrow="Topics"
            title="The same thread, across the Fathers"
            href="/topics"
          >
            <p className="mt-2 font-sans text-[13.5px] text-paper/65 leading-[1.55]">
              Love, prayer, repentance, the Trinity — one topic at a time,
              with the relevant sentences from each Father side by side.
            </p>
            <p className="mt-3 font-sans text-[13px] font-medium text-paper/75">
              Browse topics →
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
              Open the Bible →
            </p>
          </MobileCard>,
        ]}
      </MobileTimeline>
    </MobileShell>
  );
}
