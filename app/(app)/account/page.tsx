import { FeatureShell } from "@/components/feature/FeatureShell";

export const metadata = {
  title: "Account",
  description:
    "Your Purify account. Sign in, preferences, and subscription. Accounts are not required to use the site.",
};

export default function AccountPage() {
  return (
    <FeatureShell
      eyebrow="Account"
      title="Your account"
      body="Sign in, manage your subscription, and update your preferences. Auth is not wired up yet - this is a placeholder."
    />
  );
}
