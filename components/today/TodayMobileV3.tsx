import {
  commemorationsOn,
  fastingStatus,
  paschaInfo,
  readingsOn,
  startOfDayUtc,
} from "@/lib/calendar/orthodox";
import { getSaint } from "@/lib/saints/saints";
import { getServerLocale } from "@/lib/i18n/server";
import { MobileTopTabs } from "./MobileTopTabs";
import { UserAvatarSmall } from "./UserAvatarSmall";
import { TimelineRail } from "./TimelineRail";
import { VerseOfDayCard } from "./VerseOfDayCard";
import { TodaySaintCard } from "./TodaySaintCard";
import { FastTodayCard } from "./FastTodayCard";
import { TodayReadingsCard } from "./TodayReadingsCard";
import { PaschaCountdownCard } from "./PaschaCountdownCard";

/**
 * Mobile-only Today shell (v6.10 rework). Replaces TodayMenologionHero.
 *
 * Dark / timeline aesthetic: top-tab nav (Today / Calendar) with a
 * rubric-red underline + streak + bell + avatar, a "Daily Refresh"
 * eyebrow, then a sequence of cards (Verse of the Day, Today's Saint,
 * the Fast, Today's Readings, Pascha countdown) stacked along a
 * vertical timeline rail running down the left margin.
 *
 * Server component, all data pure and cacheable. The interactive
 * elements (favourite toggle, share, more sheet, the streak readout,
 * the avatar) live in small client islands.
 */
export async function TodayMobileV3() {
  const today = startOfDayUtc(new Date());
  const commemorations = commemorationsOn(today);
  const fast = fastingStatus(today);
  const readings = readingsOn(today);
  const pascha = paschaInfo(today);
  const locale = await getServerLocale();
  const isDe = locale === "de";

  const headline =
    commemorations.find((c) => c.kind === "feast") ?? commemorations[0];
  const headlineSaint =
    headline?.saint ?? (headline?.slug ? getSaint(headline.slug) : null);

  const tabs = isDe
    ? { today: "Heute", calendar: "Kalender" }
    : { today: "Today", calendar: "Calendar" };

  const labels = isDe
    ? {
        eyebrow: "Tägliche Auffrischung",
        verseTop: "Vers des Tages",
        saint: "Heiliger des Tages",
        fast: "Das Fasten",
        readings: "Lesungen für heute",
        readingsEmpty: "Keine Lesungen angesetzt.",
        pascha: "Pascha",
      }
    : {
        eyebrow: "Daily Refresh",
        verseTop: "Verse of the Day",
        saint: "Today's Saint",
        fast: "The Fast",
        readings: "Today's Readings",
        readingsEmpty: "No readings appointed.",
        pascha: "Pascha",
      };

  const paschaSecondary =
    pascha.daysAway > 0
      ? isDe
        ? `Bis Pascha ${pascha.date.getUTCFullYear()}`
        : `Until Pascha ${pascha.date.getUTCFullYear()}`
      : pascha.label;

  return (
    <div className="flex flex-col bg-night">
      <MobileTopTabs active="today" labels={tabs} avatar={<UserAvatarSmall />} />

      <div className="px-5 pt-6 pb-10">
        <p className="font-sans text-[11px] uppercase tracking-[2px] text-paper/55 mb-4">
          {labels.eyebrow}
        </p>

        <TimelineRail>
          {[
            <VerseOfDayCard key="vod" labelTop={labels.verseTop} />,
            headlineSaint ? (
              <TodaySaintCard
                key="saint"
                saint={headlineSaint}
                eyebrow={labels.saint}
              />
            ) : (
              <div
                key="saint-empty"
                className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-4"
              >
                <p className="font-sans text-[12px] text-paper/55">
                  {labels.saint}
                </p>
                <p className="mt-2 font-sans text-[14px] text-paper/55 italic">
                  {isDe
                    ? "Für diesen Tag ist noch kein Heiliger verzeichnet."
                    : "No saint indexed for this day."}
                </p>
              </div>
            ),
            <FastTodayCard key="fast" fast={fast} eyebrow={labels.fast} />,
            <TodayReadingsCard
              key="readings"
              readings={readings}
              eyebrow={labels.readings}
              emptyLabel={labels.readingsEmpty}
            />,
            <PaschaCountdownCard
              key="pascha"
              daysAway={pascha.daysAway}
              label={paschaSecondary}
              eyebrow={labels.pascha}
            />,
          ]}
        </TimelineRail>
      </div>
    </div>
  );
}
