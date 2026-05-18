import { FeatureShell } from "@/components/feature/FeatureShell";

export const metadata = {
  title: "Personal Prayer Plans",
  description:
    "Your own prayer plans — build a rule that fits your life, with reminders and a streak. Coming soon.",
};

export default function PersonalPrayersPage() {
  return (
    <FeatureShell
      eyebrow="Prayer · personal"
      title="Personal Prayer Plans"
      body="Build your own rule with custom prayers, reminders, intentions, and progress. Available with the Paid tier."
      tierBadge="Paid"
      ctaLabel="Upgrade to build your own"
    />
  );
}
