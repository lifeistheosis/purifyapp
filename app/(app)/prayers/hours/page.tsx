import { listHours } from "@/lib/prayers/hours";
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
        eyebrow="Prayers · the Hours"
        title="Standing through the day."
        intro={
          <p>
            The Hours sanctify the daylight at its natural breaks. They are
            short by design, five to eight minutes, held together by three
            appointed Psalms, a Troparion, and a dismissal.
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
        Full Psalm and Troparion text is being typeset into each hour; the
        structural shell is correct today. Help wanted: team@purify.app.
      </PrayerNote>
    </PrayerPage>
  );
}
