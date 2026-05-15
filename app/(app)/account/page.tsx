import { FeatureShell } from "@/components/feature/FeatureShell";

export const metadata = { title: "Account - Purify" };

export default function AccountPage() {
  return (
    <FeatureShell
      eyebrow="Account"
      title="Your account"
      body="Sign in, manage your subscription, and update your preferences. Auth is not wired up yet - this is a placeholder."
    />
  );
}
