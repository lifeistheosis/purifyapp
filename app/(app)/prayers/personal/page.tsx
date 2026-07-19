import { Diptychs } from "@/components/prayers/Diptychs";
import {
  PrayerPage,
  PrayerMasthead,
  PrayerNote,
} from "@/components/prayers/PrayerBook";
import { T } from "@/components/i18n/T";

export const metadata = {
  title: "Diptychs: your prayer list",
  description:
    "Two lists: those for whom you pray daily, and those who have fallen asleep in the Lord. Local on your device by default; signed-in users sync across devices.",
};

export default function PersonalPrayersPage() {
  return (
    <PrayerPage width="reading">
      <PrayerMasthead
        eyebrow={<T k="prayers.personalPage.eyebrow" />}
        title={<T k="prayers.personalPage.title" />}
        intro={
          <p>
            <T k="prayers.personalPage.intro" />{" "}
            <em><T k="prayers.personalPage.theotokosLine" /></em>.
          </p>
        }
      />
      <Diptychs />
      <PrayerNote>
        <T k="prayers.personalPage.note" />
      </PrayerNote>
    </PrayerPage>
  );
}
