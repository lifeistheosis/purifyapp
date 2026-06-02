import { listAkathists } from "@/lib/prayers/akathists";
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
    "The Akathists — long-form hymns of praise that stand in their own genre. The Akathist to the Theotokos is the original; others follow.",
};

export default function AkathistsPage() {
  const items = listAkathists();
  return (
    <PrayerPage width="reading">
      <PrayerMasthead
        eyebrow="Prayers · Akathists"
        title="The Akathists."
        intro={
          <p>
            The Akathist is the long-form hymn the Church sings standing
            throughout — &ldquo;not seated&rdquo; (a-kathisma). Thirteen
            Kontakia alternate with twelve Ikoi, sung in full at stations along
            the Church year, and in pieces, quietly, in personal rule.
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
        More akathists are being typeset (Christ, the saints). If you can help,
        write to team@purify.app.
      </PrayerNote>
    </PrayerPage>
  );
}
