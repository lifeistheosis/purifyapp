import { PlanScreen } from "@/components/premium/PlanScreen";

export const metadata = {
  title: "Your plan",
  description: "Your Purify subscription: what it includes and when it renews.",
};

// The subscriber's plan detail. Its words are the catalog's, in the reader's
// language and following it in the apps (2026-11-10: they were resolved here,
// once, which the apps did in English); the tier and dates are read
// client-side from the entitlements row inside PlanScreen.
export default function PlanPage() {
  return <PlanScreen />;
}
