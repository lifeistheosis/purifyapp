import { PlusPaywall } from "@/components/billing/PlusPaywall";
import { WebPaywall } from "@/components/billing/WebPaywall";
import { WebOnly, NativeOnly } from "@/components/platform/PlatformGate";
import { ClientErrorBoundary } from "@/components/ui/ClientErrorBoundary";
import { T } from "@/components/i18n/T";

export const metadata = {
  title: "Pricing & Purify Plus",
  description:
    "The core spiritual treasury of Purify is free, always. Purify Plus is the premium reading and study experience; Purify Pro adds premium reading modes, the monthly EIKON Box, and EIKON member benefits. What is free today stays free.",
};

/*
 * One screen in both places since the owner's second round of 1.8
 * (2026-10-28): the paywall he locked as R2 on 2026-10-27, "Purify is kept by
 * those it helps", Plus and Pro, the features in depth, what readers say in
 * the stores and the plans held at the bottom. The apps buy through their
 * store (PlusPaywall), the website through its Stripe checkout (WebPaywall),
 * and every word is the reader's language, looked up on the device. Before,
 * the website drew three plans side by side with prices written into
 * lib/premium/plans.ts; every figure now is the checkout's own.
 */
export default function PricingPage() {
  return (
    <>
      {/* The website (phone and computer): R2, sold through web billing. */}
      <WebOnly>
        <WebPaywall />
      </WebOnly>
      {/* Native app: the full-screen Purify Plus paywall (Play Billing).
          Wrapped so a billing/plugin failure shows a calm fallback instead
          of white-screening the WebView (the "Purify Plus crashes" report). */}
      <NativeOnly>
        <ClientErrorBoundary
          fallback={
            <div className="flex min-h-[60dvh] flex-col items-center justify-center px-6 text-center">
              <p className="font-heading text-title font-bold text-paper">
                <T k="study.purifyPlus" />
              </p>
              <p className="mx-auto mt-3 max-w-[320px] font-sans text-ui leading-relaxed text-paper/60">
                <T k="ui.plusIsnTAvailableTo" />
              </p>
            </div>
          }
        >
          <PlusPaywall />
        </ClientErrorBoundary>
      </NativeOnly>
    </>
  );
}
