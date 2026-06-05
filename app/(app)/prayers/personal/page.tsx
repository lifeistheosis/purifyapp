import { Diptychs } from "@/components/prayers/Diptychs";
import {
  PrayerPage,
  PrayerMasthead,
  PrayerNote,
} from "@/components/prayers/PrayerBook";

export const metadata = {
  title: "Diptychs: your prayer list",
  description:
    "Two lists: those for whom you pray daily, and those who have fallen asleep in the Lord. Local on your device by default; signed-in users sync across devices.",
};

export default function PersonalPrayersPage() {
  return (
    <PrayerPage width="reading">
      <PrayerMasthead
        eyebrow="Personal · Diptychs"
        title="The names you carry."
        intro={
          <p>
            Orthodox prayer is named. The Liturgy commemorates the living and
            the departed by name; your private rule does the same. Keep two
            short lists, and read them in the silence after the{" "}
            <em>Most Holy Theotokos, save us</em>.
          </p>
        }
      />
      <Diptychs />
      <PrayerNote>
        Your entries stay on this device. Sign in to sync them across devices;
        nothing is sold or shared with anyone.
      </PrayerNote>
    </PrayerPage>
  );
}
