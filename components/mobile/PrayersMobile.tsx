import Link from "next/link";
import {
  formatLongDate,
  startOfDayUtc,
} from "@/lib/calendar/orthodox";
import { MobileShell } from "./MobileShell";
import { MobileHeader } from "./MobileHeader";
import { DiptychPreview } from "./DiptychPreview";
import { UserAvatarSmall } from "@/components/today/UserAvatarSmall";
import {
  PrayerSectionLabel,
  PrayerIndex,
  PrayerIndexRow,
} from "@/components/prayers/PrayerBook";
import { ContinuePraying } from "@/components/prayers/ContinuePraying";
import { SuggestedToday } from "@/components/prayers/SuggestedToday";
import {
  RULE_CATEGORY_ORDER,
  RULE_CATEGORY_LABEL,
  rulesByCategory,
  popularRules,
} from "@/lib/prayers/rules";
import { seasonFor, isFastDay } from "@/lib/prayers/season";

type HeroMode = "morning" | "midday" | "evening";

function heroModeFor(d: Date): HeroMode {
  const h = d.getUTCHours();
  if (h < 12) return "morning";
  if (h < 19) return "midday";
  return "evening";
}

const TIME_LINE: Record<HeroMode, string> = {
  morning: "Stand for a few minutes before God before the day takes you.",
  midday: "Pray it in the breath. The bringing-back is half the work.",
  evening: "Close the day with the same quiet you opened it with.",
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
  const today = startOfDayUtc(new Date());
  const mode = heroModeFor(new Date());
  const season = seasonFor(today);
  const isFast = isFastDay(today);

  return (
    <MobileShell
      header={<MobileHeader title="Prayers" trailing={<UserAvatarSmall />} />}
      eyebrow={formatLongDate(today)}
    >
      {/* Quiet masthead */}
      <header className="text-center pt-1">
        <p className="font-sans text-eyebrow uppercase tracking-[2.5px] text-paper/40 mb-4">
          The Prayer
        </p>
        <h1 className="font-serif text-title leading-[1.15] tracking-[-0.01em] text-paper">
          Pray without ceasing.
        </h1>
        <p className="mt-3 font-serif italic text-detail text-paper/45">
          1 Thessalonians 5:17
        </p>
        <div aria-hidden className="mx-auto mt-6 h-px w-10 bg-gold/50" />
        <p className="mx-auto mt-6 max-w-[40ch] font-serif text-body text-paper/70 leading-[1.75]">
          {TIME_LINE[mode]}
        </p>
      </header>

      {/* The prayer of the heart */}
      <div className="my-10 text-center">
        <p className="font-serif text-title-sm leading-[1.5] text-paper/90">
          Lord Jesus Christ,
          <br />
          Son of God,
          <br />
          have mercy on me, a sinner.
        </p>
        <p className="mt-5">
          <Link
            href="/prayers/learning/jesus-prayer"
            className="font-sans text-detail font-medium text-gold/80 underline decoration-gold/30 underline-offset-4"
          >
            Learn how to pray it →
          </Link>
        </p>
      </div>

      <DiptychPreview />

      <div className="mt-2">
        <ContinuePraying label="Continue praying" />

        <SuggestedToday season={season} isFast={isFast} label="Suggested for today" />

        {popularRules().length > 0 && (
          <>
            <PrayerSectionLabel>Popular prayer rules</PrayerSectionLabel>
            <PrayerIndex>
              {popularRules().map((r) => (
                <PrayerIndexRow
                  key={r.id}
                  href={r.href}
                  title={r.title}
                  description={r.description}
                  meta={r.estimatedMinutes ? `~${r.estimatedMinutes} min` : undefined}
                />
              ))}
            </PrayerIndex>
          </>
        )}

        {RULE_CATEGORY_ORDER.map((category) => {
          const rules = rulesByCategory(category);
          if (rules.length === 0) return null;
          return (
            <div key={category}>
              <PrayerSectionLabel>
                {RULE_CATEGORY_LABEL[category].en}
              </PrayerSectionLabel>
              <PrayerIndex>
                {rules.map((r) => (
                  <PrayerIndexRow
                    key={r.id}
                    href={r.href}
                    title={r.title}
                    description={r.description}
                    planned={r.planned}
                    meta={r.estimatedMinutes ? `~${r.estimatedMinutes} min` : undefined}
                  />
                ))}
              </PrayerIndex>
            </div>
          );
        })}

        <PrayerSectionLabel>Also in this book</PrayerSectionLabel>
        <PrayerIndex>
          <PrayerIndexRow
            href="/prayers/today"
            title="Today"
            description="Today's fast, commemorations, and namedays."
          />
          <PrayerIndexRow
            href="/prayers/hours"
            title="The Hours"
            description="Short prayers that sanctify the daylight."
          />
          <PrayerIndexRow
            href="/prayers/akathists"
            title="The Akathists"
            description="Long hymns of praise, prayed standing throughout."
          />
          <PrayerIndexRow
            href="/prayers/learning"
            title="Learn to pray"
            description="A short, beginner's path through Orthodox prayer."
          />
        </PrayerIndex>
      </div>
    </MobileShell>
  );
}
