import { PrayerRuleReader, type Rule } from "@/components/prayers/PrayerRuleReader";
import morningRule from "@/data/prayers/rules/morning.json";

export const metadata = {
  title: "Morning Rule",
  description:
    "A short Orthodox morning prayer rule for daily use, prayer by prayer with a streak counter.",
};

export default function MorningRulePage() {
  return (
    <section className="bg-night px-5 md:px-8 py-12 md:py-16 min-h-screen">
      <PrayerRuleReader rule={morningRule as Rule} />
    </section>
  );
}
