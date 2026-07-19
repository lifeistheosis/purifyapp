import { listHours } from "@/lib/prayers/hours";
import { T } from "@/components/i18n/T";
import {
  PrayerPage,
  PrayerMasthead,
  PrayerIndex,
  PrayerIndexRow,
  PrayerNote,
} from "@/components/prayers/PrayerBook";

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
      <PrayerIndex>
        {hours.map((h) => (
          <PrayerIndexRow
            key={h.slug}
            href={`/prayers/hours/${h.slug}`}
            title={h.title}
            description={h.subtitle}
            meta={`${h.approxHour}:00`}
          />
        ))}
      </PrayerIndex>
      <PrayerNote>
        <T k="prayers.hoursIndex.note" />
      </PrayerNote>
    </PrayerPage>
  );
}
