import {
  fastingStatus,
  formatLongDate,
  startOfDayUtc,
} from "@/lib/calendar/orthodox";
import { MobileShell } from "./MobileShell";
import { MobileTimeline } from "./MobileTimeline";
import { MobileCard } from "./MobileCard";
import { MobileHeader } from "./MobileHeader";
import { UserAvatarSmall } from "@/components/today/UserAvatarSmall";

/**
 * Prayers mobile shell. Mirrors the structure of the desktop /prayers
 * landing in the same dark-card vocabulary the Today screen uses.
 *
 * Order: today's rule + the two pillars (morning / evening), then the
 * Jesus Prayer + the prayer rope, then the diptychs, then the Hours,
 * akathists, and Learn-to-pray.
 */
export function PrayersMobile() {
  const today = startOfDayUtc(new Date());
  const fast = fastingStatus(today);

  return (
    <MobileShell
      header={<MobileHeader title="Prayers" trailing={<UserAvatarSmall />} />}
      eyebrow={formatLongDate(today)}
    >
      <MobileTimeline>
        {[
          <MobileCard
            key="today"
            eyebrow="Today's prayer"
            title="Open the snapshot"
            href="/prayers/today"
            tint="warm"
          >
            <p className="mt-2 font-sans text-[13.5px] text-paper/65 leading-[1.55]">
              {fast.label}. Date, saint, fast, the appointed readings, and
              your diptychs in one screen.
            </p>
            <p className="mt-3 font-sans text-[13px] font-medium text-paper/75">
              Open today →
            </p>
          </MobileCard>,
          <MobileCard
            key="morning"
            eyebrow="Morning rule"
            title="Begin the day with God"
            href="/prayers/morning"
          >
            <p className="mt-2 font-sans text-[13.5px] text-paper/65 leading-[1.55]">
              Sign of the Cross · O Heavenly King · Trisagion · the Lord&rsquo;s
              Prayer · the Jesus Prayer · dismissal. About 8 minutes.
            </p>
            <p className="mt-3 font-sans text-[13px] font-medium text-paper/75">
              Open the rule →
            </p>
          </MobileCard>,
          <MobileCard
            key="evening"
            eyebrow="Evening rule"
            title="Lay the day down"
            href="/prayers/evening"
          >
            <p className="mt-2 font-sans text-[13.5px] text-paper/65 leading-[1.55]">
              Trisagion · examination of the day · the Jesus Prayer · Into
              Thy hands · dismissal. About 8 minutes.
            </p>
            <p className="mt-3 font-sans text-[13px] font-medium text-paper/75">
              Open the rule →
            </p>
          </MobileCard>,
          <MobileCard
            key="rope"
            eyebrow="Prayer rope"
            title="Count the Jesus Prayer"
            href="/prayers/rope"
            tint="gold"
          >
            <p className="mt-2 font-sans text-[13.5px] text-paper/65 leading-[1.55]">
              A digital komvoschini. 33, 50, or 100 knots. No streaks, no
              noise.
            </p>
            <p className="mt-3 font-sans text-[13px] font-medium text-paper/75">
              Open the rope →
            </p>
          </MobileCard>,
          <MobileCard
            key="personal"
            eyebrow="Diptychs"
            title="The names you carry"
            href="/prayers/personal"
          >
            <p className="mt-2 font-sans text-[13.5px] text-paper/65 leading-[1.55]">
              Two lists — for the living and for the reposed. Namedays and
              repose anniversaries surface on /today.
            </p>
            <p className="mt-3 font-sans text-[13px] font-medium text-paper/75">
              Open the diptychs →
            </p>
          </MobileCard>,
          <MobileCard
            key="hours"
            eyebrow="The Hours"
            title="Standing through the day"
            href="/prayers/hours"
          >
            <p className="mt-2 font-sans text-[13.5px] text-paper/65 leading-[1.55]">
              First, Third, Sixth, Ninth, and Small Compline. Five short
              prayers that sanctify the daylight.
            </p>
            <p className="mt-3 font-sans text-[13px] font-medium text-paper/75">
              Open the Hours →
            </p>
          </MobileCard>,
          <MobileCard
            key="akathists"
            eyebrow="Akathists"
            title="The standing hymns"
            href="/prayers/akathists"
          >
            <p className="mt-2 font-sans text-[13.5px] text-paper/65 leading-[1.55]">
              The Akathist to the Theotokos and others. Sung or read,
              standing throughout.
            </p>
            <p className="mt-3 font-sans text-[13px] font-medium text-paper/75">
              Open the akathists →
            </p>
          </MobileCard>,
          <MobileCard
            key="learn"
            eyebrow="Learn to pray"
            title="Six short lessons"
            href="/prayers/learning"
          >
            <p className="mt-2 font-sans text-[13.5px] text-paper/65 leading-[1.55]">
              What prayer is, the sign of the Cross, the Jesus Prayer, the
              Trisagion prayers, the morning and evening rules.
            </p>
            <p className="mt-3 font-sans text-[13px] font-medium text-paper/75">
              Open the lessons →
            </p>
          </MobileCard>,
        ]}
      </MobileTimeline>
    </MobileShell>
  );
}
