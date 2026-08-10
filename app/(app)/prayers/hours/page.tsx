import { listHours } from "@/lib/prayers/hours";
import { T } from "@/components/i18n/T";
import {
  PrayerPage,
  PrayerMasthead,
  PrayerNote,
} from "@/components/prayers/PrayerBook";
import { HoursIndex } from "@/components/prayers/HoursIndex";

export const metadata = {
  title: "The Hours",
  description:
    "The Liturgical Hours, short prayers that sanctify the day. First, Third, Sixth, Ninth, and Compline.",
};

export default function HoursPage() {
  const hours = listHours();
  return (
    <PrayerPage width="reading">
      <PrayerMasthead
        eyebrow={<T k="prayers.hoursIndex.eyebrow" />}
        title={<T k="prayers.hoursIndex.title" />}
        intro={
          <p>
            <T k="prayers.hoursIndex.intro" />
          </p>
        }
      />
      {/* Client child on purpose: it reads the clock after mount. This page
          ships into the static export, so a server-rendered "now" would bake
          the build hour into the APK. */}
      <HoursIndex hours={hours} />
      <PrayerNote>
        <T k="prayers.hoursIndex.note" />
      </PrayerNote>
    </PrayerPage>
  );
}
