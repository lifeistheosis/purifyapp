import { JesusPrayerCounter } from "@/components/prayers/JesusPrayerCounter";

export const metadata = {
  title: "The Jesus Prayer - Purify",
  description:
    "Guided counter for the Jesus Prayer with goal presets, optional breath cue, today total, and a day-streak.",
};

export default function JesusPrayerPage() {
  return (
    <section className="bg-night px-5 md:px-8 py-12 md:py-16 min-h-screen">
      <JesusPrayerCounter />
    </section>
  );
}
