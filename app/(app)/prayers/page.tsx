import {
  commemorationsOn,
  fastingStatus,
  paschaInfo,
  startOfDayUtc,
} from "@/lib/calendar/orthodox";
import { PrayersMobile } from "@/components/mobile/PrayersMobile";
import { PrayerHubDesktop } from "@/components/prayers/PrayerHubDesktop";
import { seasonFor, isFastDay } from "@/lib/prayers/season";
import { getServerLocale } from "@/lib/i18n/server";

export const metadata = {
  title: "Prayer",
  description:
    "Daily prayer in the Orthodox tradition: today's rule, morning and evening rules, the prayer of the heart, akathists, the liturgical hours, and a beginner's path.",
};

// Hourly ISR so the day strip rolls forward without a redeploy.
export const revalidate = 3600;

export default async function PrayersPage() {
  const locale = await getServerLocale();
  const isDe = locale === "de";
  const today = startOfDayUtc(new Date());
  const fast = fastingStatus(today);
  const pascha = paschaInfo(today);
  const season = seasonFor(today);
  const isFast = isFastDay(today);
  const commemorations = commemorationsOn(today);
  const headline =
    commemorations.find((c) => c.kind === "feast") ?? commemorations[0];

  const paschaLine =
    pascha.daysAway > 0
      ? isDe
        ? `${pascha.daysAway} Tage bis Pascha`
        : `${pascha.daysAway} days to Pascha`
      : pascha.daysAway === 0
        ? isDe
          ? "Pascha ist heute"
          : "Pascha is today"
        : pascha.label;

  return (
    <>
      <PrayersMobile />
      <div className="hidden md:block">
        <PrayerHubDesktop
          isDe={isDe}
          today={today}
          fast={fast}
          headlineName={headline?.name}
          paschaLine={paschaLine}
          season={season}
          isFast={isFast}
        />
      </div>
    </>
  );
}
