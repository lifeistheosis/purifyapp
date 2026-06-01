import {
  fastingStatus,
  formatLongDate,
  startOfDayUtc,
} from "@/lib/calendar/orthodox";
import { MobileShell } from "./MobileShell";
import { MobileTimeline } from "./MobileTimeline";
import { MobileCard } from "./MobileCard";
import { MobileHeader } from "./MobileHeader";
import { MobileHeroCard } from "./MobileHeroCard";
import { MobileSectionLabel } from "./MobileSectionLabel";
import { JesusPrayerCounter } from "./JesusPrayerCounter";
import { DayClock } from "./DayClock";
import { DiptychPreview } from "./DiptychPreview";
import { UserAvatarSmall } from "@/components/today/UserAvatarSmall";

type HeroMode = "morning" | "midday" | "evening";

function heroModeFor(d: Date): HeroMode {
  const h = d.getUTCHours();
  if (h < 12) return "morning";
  if (h < 19) return "midday";
  return "evening";
}

const TINT: Record<HeroMode, "gold" | "warm" | "deep"> = {
  morning: "gold",
  midday: "warm",
  evening: "deep",
};

const HERO_COPY: Record<
  HeroMode,
  { eyebrow: string; headline: string; body: string }
> = {
  morning: {
    eyebrow: "The day, ahead",
    headline: "Stand for a few minutes before God before the day takes you.",
    body: "Sign of the Cross, Heavenly King, Trisagion, the Lord's Prayer, the Jesus Prayer, dismissal.",
  },
  midday: {
    eyebrow: "The day, underway",
    headline: "Pray it in the breath. The bringing-back is half the work.",
    body: "The Jesus Prayer carries through the middle of the day.",
  },
  evening: {
    eyebrow: "The day, laid down",
    headline: "Trisagion, examination of the day, Into Thy hands.",
    body: "Close the day with the same quiet you opened it with.",
  },
};

/**
 * Prayers mobile shell — "the rule of life."
 *
 *   1. DayClock hero: a small SVG arc of the four canonical Hours +
 *      Compline with the current local time pulsing in rubric red. The
 *      kicker reads "Now: <Hour>" or "Coming up: <Hour>." Tint flips
 *      gold/warm/deep by time of day.
 *   2. JesusPrayerCounter (the user's primary one-tap action).
 *   3. DiptychPreview: a horizontal row of names from the user's
 *      diptychs, rendered only when local lists are non-empty.
 *   4. "The daily rules" — calmer timeline of morning / evening / rope /
 *      diptychs / Hours / akathists / learn, body tightened to one
 *      sentence each.
 */
export function PrayersMobile() {
  const today = startOfDayUtc(new Date());
  const fast = fastingStatus(today);
  const mode = heroModeFor(new Date());
  const copy = HERO_COPY[mode];

  return (
    <MobileShell
      header={<MobileHeader title="Prayers" trailing={<UserAvatarSmall />} />}
      eyebrow={formatLongDate(today)}
    >
      <MobileHeroCard
        tint={TINT[mode]}
        eyebrow={copy.eyebrow}
        headline={<span>{copy.headline}</span>}
        body={<span>{copy.body}</span>}
        aside={
          <div className="shrink-0">
            <DayClock />
          </div>
        }
      />

      <div className="mt-5">
        <JesusPrayerCounter />
      </div>

      <div className="mt-5">
        <DiptychPreview />
      </div>

      <div className="mt-7">
        <MobileSectionLabel>The daily rules</MobileSectionLabel>
        <MobileTimeline>
          {[
            <MobileCard
              key="today"
              eyebrow="Today's prayer"
              title="Open the snapshot"
              href="/prayers/today"
              tint="warm"
            >
              <p className="mt-2 font-sans text-detail text-paper/65 leading-[1.5]">
                {fast.label}. Date, saint, readings, diptychs in one screen.
              </p>
            </MobileCard>,
            <MobileCard
              key="morning"
              eyebrow="Morning rule"
              title="Begin the day with God"
              href="/prayers/morning"
            >
              <p className="mt-2 font-sans text-detail text-paper/65 leading-[1.5]">
                Sign of the Cross through dismissal. About 8 minutes.
              </p>
            </MobileCard>,
            <MobileCard
              key="evening"
              eyebrow="Evening rule"
              title="Lay the day down"
              href="/prayers/evening"
            >
              <p className="mt-2 font-sans text-detail text-paper/65 leading-[1.5]">
                Trisagion, examination, Into Thy hands. About 8 minutes.
              </p>
            </MobileCard>,
            <MobileCard
              key="rope"
              eyebrow="Prayer rope"
              title="Count the Jesus Prayer"
              href="/prayers/rope"
              tint="gold"
            >
              <p className="mt-2 font-sans text-detail text-paper/65 leading-[1.5]">
                33, 50, or 100 knots. No streaks, no noise.
              </p>
            </MobileCard>,
            <MobileCard
              key="personal"
              eyebrow="Diptychs"
              title="The names you carry"
              href="/prayers/personal"
            >
              <p className="mt-2 font-sans text-detail text-paper/65 leading-[1.5]">
                Living and reposed.
              </p>
            </MobileCard>,
            <MobileCard
              key="hours"
              eyebrow="The Hours"
              title="Standing through the day"
              href="/prayers/hours"
            >
              <p className="mt-2 font-sans text-detail text-paper/65 leading-[1.5]">
                First, Third, Sixth, Ninth, Compline.
              </p>
            </MobileCard>,
            <MobileCard
              key="akathists"
              eyebrow="Akathists"
              title="The standing hymns"
              href="/prayers/akathists"
            >
              <p className="mt-2 font-sans text-detail text-paper/65 leading-[1.5]">
                The Akathist to the Theotokos and others.
              </p>
            </MobileCard>,
            <MobileCard
              key="learn"
              eyebrow="Learn to pray"
              title="Six short lessons"
              href="/prayers/learning"
            >
              <p className="mt-2 font-sans text-detail text-paper/65 leading-[1.5]">
                The sign of the Cross, the Jesus Prayer, the rules.
              </p>
            </MobileCard>,
          ]}
        </MobileTimeline>
      </div>
    </MobileShell>
  );
}
