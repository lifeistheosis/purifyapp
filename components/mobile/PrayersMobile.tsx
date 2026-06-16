import Link from "next/link";
import {
  formatLongDate,
  startOfDayUtc,
} from "@/lib/calendar/orthodox";
import { MobileShell } from "./MobileShell";
import { MobileHeader } from "./MobileHeader";
import { DiptychPreview } from "./DiptychPreview";
import { SoftTile, SoftTileGrid, FeatureBand } from "./SoftTiles";
import { UserAvatarSmall } from "@/components/today/UserAvatarSmall";
import { Sun } from "@/components/ui/icons/Sun";
import { Lampada } from "@/components/ui/icons/Lampada";
import { PrayerRope } from "@/components/ui/icons/PrayerRope";
import { Lyre } from "@/components/ui/icons/Lyre";
import { Orans } from "@/components/ui/icons/Orans";
import { Hands } from "@/components/ui/icons/Hands";
import {
  PrayerSectionLabel,
  PrayerIndex,
  PrayerIndexRow,
} from "@/components/prayers/PrayerBook";
import { PrayerSearch } from "@/components/prayers/PrayerSearch";
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

      {/* Featured: The Prayer Rope Anthem, as a gradient play band high on
          the scroll so the hymn is visible without scrolling the index. */}
      <div className="mb-6">
        <FeatureBand
          href="/prayers/anthem"
          eyebrow="A hymn · for the rope"
          title="The Prayer Rope Anthem"
          sub="Sung knot by knot. Play it, follow the lyrics."
        />
      </div>

      {/* Practices: the surfaces with their own UI, as soft tiles. */}
      <p className="mb-3 font-sans text-eyebrow uppercase tracking-[2px] text-paper/55">
        Practices
      </p>
      <SoftTileGrid className="mb-8">
        <SoftTile href="/prayers/today" label="Today" sub="Fast & feast" icon={<Sun size={21} />} tone="a" />
        <SoftTile href="/prayers/hours" label="The Hours" sub="Sanctify the day" icon={<Lampada size={21} />} tone="b" />
        <SoftTile href="/prayers/rope" label="The Rope" sub="The Jesus Prayer" icon={<PrayerRope size={21} />} tone="c" />
        <SoftTile href="/prayers/akathists" label="Akathists" sub="Hymns of praise" icon={<Lyre size={21} />} tone="d" />
        <SoftTile href="/prayers/learning" label="Learn to pray" sub="A beginner's path" icon={<Orans size={21} />} tone="b" />
        <SoftTile href="/prayers/personal" label="Personal" sub="Your own rule" icon={<Hands size={21} />} tone="a" />
      </SoftTileGrid>

      <DiptychPreview />

      <div className="mt-2">
        <ContinuePraying label="Continue praying" />

        <SuggestedToday season={season} isFast={isFast} label="Suggested for today" />

        {/* Search wraps the index so a typed query replaces the
            popular + categorized + Also-in-this-book lists with
            filtered results. */}
        <div className="mt-6">
        <PrayerSearch>
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

        {/* "Also in this book" is now the Practices tile grid above the
            index, so it isn't repeated here as a hairline list. */}
        </PrayerSearch>
        </div>
      </div>
    </MobileShell>
  );
}
