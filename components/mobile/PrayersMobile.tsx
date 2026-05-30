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
import { UserAvatarSmall } from "@/components/today/UserAvatarSmall";

type HeroMode = "morning" | "midday" | "evening";

function heroModeFor(d: Date): HeroMode {
  const h = d.getUTCHours();
  if (h < 12) return "morning";
  if (h < 19) return "midday";
  return "evening";
}

const HERO_COPY: Record<
  HeroMode,
  {
    tint: "gold" | "warm" | "deep";
    eyebrow: string;
    kicker: string;
    headline: string;
    body: string;
    href: string;
  }
> = {
  morning: {
    tint: "gold",
    eyebrow: "Right now",
    kicker: "Begin the day",
    headline: "Morning Rule",
    body: "Stand for a few minutes before God before the day takes you. Sign of the Cross, Heavenly King, Trisagion, the Lord's Prayer, the Jesus Prayer, dismissal.",
    href: "/prayers/morning",
  },
  midday: {
    tint: "warm",
    eyebrow: "Right now",
    kicker: "The prayer of the heart",
    headline: "The Jesus Prayer",
    body: "Pray it in the breath. The bringing-back is half the work. The counter below is a quiet aid; the work is yours.",
    href: "/prayers/learning/jesus-prayer",
  },
  evening: {
    tint: "deep",
    eyebrow: "Right now",
    kicker: "Lay the day down",
    headline: "Evening Rule",
    body: "Trisagion, a brief examination of the day, the Jesus Prayer, Into Thy hands, dismissal.",
    href: "/prayers/evening",
  },
};

/**
 * Prayers mobile shell, reworked with a time-of-day hero plus a
 * Jesus Prayer counter widget immediately under it. The rule and
 * akathist cards then sit in the usual timeline below.
 *
 * Hero tint flips by the hour:
 *   - before noon UTC: gold (morning rule)
 *   - noon to 19:00:    warm (midday, the Jesus Prayer)
 *   - 19:00 onward:     deep (evening rule)
 *
 * The Jesus Prayer counter is a small client island that persists to
 * localStorage; no server roundtrip and no sharing.
 */
export function PrayersMobile() {
  const today = startOfDayUtc(new Date());
  const fast = fastingStatus(today);
  const mode = heroModeFor(new Date());
  const hero = HERO_COPY[mode];

  const morningAccent = mode === "morning";
  const eveningAccent = mode === "evening";

  return (
    <MobileShell
      header={<MobileHeader title="Prayers" trailing={<UserAvatarSmall />} />}
      eyebrow={formatLongDate(today)}
    >
      <MobileHeroCard
        tint={hero.tint}
        eyebrow={hero.eyebrow}
        kicker={hero.kicker}
        headline={hero.headline}
        body={hero.body}
        href={hero.href}
      />

      <div className="mt-5">
        <JesusPrayerCounter />
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
              <p className="mt-2 font-sans text-[13.5px] text-paper/65 leading-[1.55]">
                {fast.label}. Date, saint, fast, the appointed readings, and
                your diptychs in one screen.
              </p>
              <p className="mt-3 font-sans text-[13px] font-medium text-paper/75">
                Open today &rarr;
              </p>
            </MobileCard>,
            <MobileCard
              key="morning"
              eyebrow="Morning rule"
              title="Begin the day with God"
              href="/prayers/morning"
              tint={morningAccent ? "gold" : "default"}
            >
              <p className="mt-2 font-sans text-[13.5px] text-paper/65 leading-[1.55]">
                Sign of the Cross, Heavenly King, Trisagion, the Lord&rsquo;s
                Prayer, the Jesus Prayer, dismissal. About 8 minutes.
              </p>
              <p className="mt-3 font-sans text-[13px] font-medium text-paper/75">
                Open the rule &rarr;
              </p>
            </MobileCard>,
            <MobileCard
              key="evening"
              eyebrow="Evening rule"
              title="Lay the day down"
              href="/prayers/evening"
              tint={eveningAccent ? "gold" : "default"}
            >
              <p className="mt-2 font-sans text-[13.5px] text-paper/65 leading-[1.55]">
                Trisagion, examination of the day, the Jesus Prayer, Into
                Thy hands, dismissal. About 8 minutes.
              </p>
              <p className="mt-3 font-sans text-[13px] font-medium text-paper/75">
                Open the rule &rarr;
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
                Open the rope &rarr;
              </p>
            </MobileCard>,
            <MobileCard
              key="personal"
              eyebrow="Diptychs"
              title="The names you carry"
              href="/prayers/personal"
            >
              <p className="mt-2 font-sans text-[13.5px] text-paper/65 leading-[1.55]">
                Two lists, for the living and for the reposed. Namedays and
                repose anniversaries surface on /today.
              </p>
              <p className="mt-3 font-sans text-[13px] font-medium text-paper/75">
                Open the diptychs &rarr;
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
                Open the Hours &rarr;
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
                Open the akathists &rarr;
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
                Open the lessons &rarr;
              </p>
            </MobileCard>,
          ]}
        </MobileTimeline>
      </div>
    </MobileShell>
  );
}
