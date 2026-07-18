import { getServerLocale } from "@/lib/i18n/server";
import { getPremiumPlan } from "@/lib/premium/plans";
import { PlanScreen } from "@/components/premium/PlanScreen";

export const metadata = {
  title: "Your plan",
  description: "Your Purify subscription: what it includes and when it renews.",
};

// The subscriber's plan detail. Copy (tier names, feature lists) is resolved
// server-side for the locale; the tier + dates are read client-side from the
// entitlements row inside PlanScreen.
export default async function PlanPage() {
  const locale = await getServerLocale();
  const plan = getPremiumPlan(locale);
  return <PlanScreen planCopy={plan} />;
}
