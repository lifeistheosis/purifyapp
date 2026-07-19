import { listAkathists } from "@/lib/prayers/akathists";
import { T } from "@/components/i18n/T";
import {
  PrayerPage,
  PrayerMasthead,
  PrayerIndex,
  PrayerIndexRow,
  PrayerNote,
} from "@/components/prayers/PrayerBook";

export const metadata = {
  title: "Akathists",
  description:
    "The Akathists, long-form hymns of praise that stand in their own genre. The Akathist to the Theotokos is the original; others follow.",
};

export default function AkathistsPage() {
  const items = listAkathists();
  return (
    <PrayerPage width="reading">
      <PrayerMasthead
        eyebrow={<T k="prayers.akathists.eyebrow" />}
        title={<T k="prayers.akathists.title" />}
        intro={
          <p>
            <T k="prayers.akathists.intro" />
          </p>
        }
      />
      <PrayerIndex>
        {items.map((a) => (
          <PrayerIndexRow
            key={a.slug}
            href={`/prayers/akathists/${a.slug}`}
            title={a.title}
            description={a.subtitle}
          />
        ))}
      </PrayerIndex>
      <PrayerNote>
        <T k="prayers.akathists.note" />
      </PrayerNote>
    </PrayerPage>
  );
}
