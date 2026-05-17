import { PrayerRuleReader, type Rule } from "@/components/prayers/PrayerRuleReader";
import eveningRule from "@/data/prayers/rules/evening.json";

export const metadata = {
  title: "Evening Rule - Purify",
  description:
    "A short Orthodox evening prayer rule with examination of the day, prayer by prayer with a streak counter.",
};

export default function EveningRulePage() {
  return (
    <section className="bg-night px-5 md:px-8 py-12 md:py-16 min-h-screen">
      <PrayerRuleReader rule={eveningRule as Rule} />
    </section>
  );
}
