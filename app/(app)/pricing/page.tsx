import Link from "next/link";
import { getServerLocale } from "@/lib/i18n/server";
import { getMessages, t } from "@/lib/i18n";
import { PlusPaywall } from "@/components/billing/PlusPaywall";
import { WebOnly, NativeOnly } from "@/components/platform/PlatformGate";
import { ClientErrorBoundary } from "@/components/ui/ClientErrorBoundary";
import { PLAY_STORE_URL } from "@/lib/site";
import {
  WebSubscribeCheckout,
  type WebCheckoutCopy,
} from "@/components/billing/WebPlusCheckout";
import {
  PREMIUM_PLAN_EN,
  PREMIUM_PLAN_DE,
  getPremiumPlan,
} from "@/lib/premium/plans";
import {
  CurrentPlanBanner,
  TierPurchaseOrStatus,
} from "@/components/premium/PlanStatus";
import { T } from "@/components/i18n/T";
import {
  FeatureList,
  GoldStar,
  PREMIUM_CHIP,
  PREMIUM_GHOST,
  premiumCardBg,
} from "@/components/premium/PremiumUI";
import { CARD, CARD_BG } from "@/components/ui/Graphite";
import { cn } from "@/lib/cn";

export const metadata = {
  title: "Pricing & Purify Plus",
  description:
    "The core spiritual treasury of Purify is free, always. Purify Plus is the premium reading and study experience; Purify Pro adds premium reading modes, the monthly EIKON Box, and EIKON member benefits. What is free today stays free.",
};

// `id` keys the feature's mark (components/premium/PremiumUI.tsx); every item
// arrives from lib/premium/plans.ts with one.
type Tier = { id: string; title: string; sub: string; soon?: boolean };

type PricingCopy = {
  eyebrow: string;
  h1: string;
  lede: string;
  freeTitle: string;
  freeItems: string[];
  freeFoot: string;
  // The opening-drop line shown under the paid prices.
  // Pill label for perks marked `soon` (e.g. Studio Audio).
  soonLabel: string;
  plusTitle: string;
  plusLede: string;
  plusItems: Tier[];
  plusPriceMonthly: string;
  plusPriceYearly: string;
  plusPromise: string;
  proTitle: string;
  proLede: string;
  proItems: Tier[];
  proPriceMonthly: string;
  proPriceYearly: string;
  proNote: string;
  proInApp: string;
  web: WebCheckoutCopy;
  supportKicker: string;
  supportLine: string;
  supportCta: string;
  supportFoot: string;
};

const EN: Omit<PricingCopy, "eyebrow" | "h1"> = {
  lede: "The whole spiritual treasury of Purify is free, and it stays free. There is no tier to unlock the Scriptures, the saints, the prayers, the fasting tracker, or the calendar, and there never will be.",
  ...PREMIUM_PLAN_EN,
  // Spreading the raw plan bypasses the withdrawn-feature filter, which is
  // exactly how this page kept selling "Prayer Campaigns, prayed together"
  // after /campaigns started answering 404. /premium was clean because it
  // calls getPremiumPlan(); this page did not. Confirmed in the built output
  // on 2026-08-26. Take freeItems from the filter, not from the const.
  freeItems: getPremiumPlan("en").freeItems,
  web: {
    // Reuse the single source rather than restating the price. These are
    // only the FALLBACK for the web checkout buttons, which normally show
    // RevenueCat's own formatted price; a second literal here is exactly
    // how the site ends up advertising a price the store no longer
    // charges. Pro already does this (see proPriceMonthly below).
    monthlyLabel: PREMIUM_PLAN_EN.plusPriceMonthly,
    yearlyLabel: PREMIUM_PLAN_EN.plusPriceYearly,
    signedOut:
      "Purify Plus is tied to your account, so it follows you across every device. Sign in to subscribe.",
    signIn: "Sign in to subscribe",
    subscribeMonthly: "Subscribe monthly",
    subscribeYearly: "Subscribe yearly",
    processing: "Opening checkout…",
    billedNote:
      "Billed securely on the web, and it unlocks Plus in the Android app too. Cancel anytime.",
    errorNote: "That didn’t go through. Nothing was charged.",
    subscribedTitle: "You have Purify Plus.",
    subscribedSub:
      "Thank you for keeping the lamps lit. It is active on every device you sign in on.",
    manage: "Manage subscription",
    orGetInApp: "Prefer the app? Get Purify Plus on Google Play",
    getInApp: "Get Purify Plus in the app",
  },
};

const DE: PricingCopy = {
  eyebrow: "Preise",
  h1: "Der Kern bleibt immer frei.",
  lede: "Der ganze geistliche Schatz von Purify ist frei und bleibt frei. Es gibt keine Stufe, um die Schriften, die Heiligen, die Gebete, den Fastentracker oder den Kalender freizuschalten, und wird es nie geben.",
  ...PREMIUM_PLAN_DE,
  // See the EN note above.
  freeItems: getPremiumPlan("de").freeItems,
  web: {
    monthlyLabel: PREMIUM_PLAN_DE.plusPriceMonthly,
    yearlyLabel: PREMIUM_PLAN_DE.plusPriceYearly,
    signedOut:
      "Purify Plus ist an dein Konto gebunden und folgt dir auf jedes Gerät. Melde dich an, um zu abonnieren.",
    signIn: "Zum Abonnieren anmelden",
    subscribeMonthly: "Monatlich abonnieren",
    subscribeYearly: "Jährlich abonnieren",
    processing: "Kasse wird geöffnet…",
    billedNote:
      "Sicher im Web abgerechnet, schaltet Plus auch in der Android-App frei. Jederzeit kündbar.",
    errorNote: "Das hat nicht geklappt. Es wurde nichts berechnet.",
    subscribedTitle: "Du hast Purify Plus.",
    subscribedSub:
      "Danke, dass du die Lampen am Brennen hältst. Es ist auf jedem Gerät aktiv, auf dem du dich anmeldest.",
    manage: "Abonnement verwalten",
    orGetInApp: "Lieber die App? Purify Plus bei Google Play holen",
    getInApp: "Purify Plus in der App holen",
  },
};

export default async function PricingPage() {
  const locale = await getServerLocale();
  let view: React.ReactNode;
  if (locale === "de") {
    view = <PricingView copy={DE} />;
  } else {
    const m = getMessages(locale);
    const copy: PricingCopy = {
      eyebrow: t(m, "pricing.eyebrow"),
      h1: t(m, "pricing.h1"),
      ...EN,
    };
    view = <PricingView copy={copy} />;
  }
  return (
    <>
      {/* Web (mobile + desktop): the quiet, three-tier pricing page. */}
      <WebOnly>{view}</WebOnly>
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

/*
 * Redrawn 2026-09-28 with the premium redesign: Plus and Pro as graphite
 * cards warmed with the owner's antique gold, every feature with its own mark
 * (components/premium/PremiumUI.tsx, fed by lib/premium/plans.ts), prices in
 * DM Sans. Nothing in it is set in DM Serif Display any more; the owner asked
 * that the redesign not use that face.
 */
function PricingView({ copy }: { copy: PricingCopy }) {
  // Pro reuses the Plus web-checkout copy with Pro prices and the Pro Play
  // fallback. (subscribedTitle stays the shared "You have Purify Plus" — Pro
  // includes Plus, so it holds either way.)
  const proWeb: WebCheckoutCopy = {
    ...copy.web,
    monthlyLabel: copy.proPriceMonthly,
    yearlyLabel: copy.proPriceYearly,
    getInApp: copy.proInApp,
  };
  return (
    <section className="relative min-h-[calc(100dvh-72px)] overflow-hidden bg-night px-5 pb-16 pt-8 md:px-8 md:pb-24 md:pt-10">
      {/* A breath of gold from above. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[560px]"
        style={{
          background: "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(201,162,90,0.10) 0%, transparent 65%)",
        }}
      />
      {/* Recognizes a signed-in subscriber; renders nothing for free users. */}
      <div className="relative -mx-5 md:-mx-8">
        <CurrentPlanBanner />
      </div>
      <div className="relative mx-auto mt-8 w-full max-w-[880px] md:mt-10">
        {/* Masthead */}
        <div className="text-center">
          <p className="mb-4 font-sans text-detail font-semibold uppercase tracking-[1.5px] text-premium-soft">
            {copy.eyebrow}
          </p>
          <h1 className="text-display-sm font-bold leading-[1.05] tracking-[-0.025em] text-paper md:text-display-lg">
            {copy.h1}
          </h1>
          <p className="mx-auto mt-6 max-w-[600px] font-sans text-body leading-relaxed text-paper/75 md:text-lede">
            {copy.lede}
          </p>
        </div>

        {/* Standard (always-free) panel */}
        <div className={cn(CARD, "mt-12 hover:translate-y-0 md:mt-16 md:p-9")} style={CARD_BG}>
          <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/50">
            {copy.freeTitle}
          </p>
          <ul className="mt-5 grid gap-3.5 sm:grid-cols-2 sm:gap-x-6">
            {copy.freeItems.map((item) => (
              <li key={item} className="flex gap-3">
                <GoldStar size={14} className="mt-[5px] opacity-80" />
                <span className="font-sans text-ui leading-snug text-paper/90">{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 border-t border-paper/8 pt-5 font-sans text-ui text-paper/55">
            {copy.freeFoot}
          </p>
        </div>

        {/* Purify Plus: live, priced, bought in the Android app or on the web */}
        <TierCard tone="plus" title={copy.plusTitle} chip={<T k="ui.availableNow" />} lede={copy.plusLede}>
          <FeatureList items={copy.plusItems} soonLabel={copy.soonLabel} columns={2} className="mt-7" />
          <Prices monthly={copy.plusPriceMonthly} yearly={copy.plusPriceYearly} />
          {/* The web purchase surface. Subscribes through RevenueCat Web
              Billing bound to the signed-in account, so it unlocks Plus on
              the phone too. Degrades to a Play Store link when web billing
              is not configured. */}
          <TierPurchaseOrStatus tier="plus">
            <WebSubscribeCheckout tier="plus" copy={copy.web} playStoreUrl={PLAY_STORE_URL} />
          </TierPurchaseOrStatus>
          <p className="mt-6 border-t border-paper/8 pt-5 font-sans text-caption leading-[1.6] text-paper/45">
            {copy.plusPromise}
          </p>
        </TierCard>

        {/* Purify Pro: everything in Plus and the members' layer. */}
        <TierCard tone="pro" title={copy.proTitle} chip={<T k="ui.members" />} lede={copy.proLede}>
          <FeatureList items={copy.proItems} soonLabel={copy.soonLabel} columns={2} className="mt-7" />
          <Prices monthly={copy.proPriceMonthly} yearly={copy.proPriceYearly} />
          {/* Pro web checkout: subscribe on desktop through RevenueCat Web
              Billing, degrades to the Play link until the Pro web offering is
              configured. */}
          <TierPurchaseOrStatus tier="pro">
            <WebSubscribeCheckout tier="pro" copy={proWeb} playStoreUrl={PLAY_STORE_URL} />
          </TierPurchaseOrStatus>
          <p className="mt-6 border-t border-paper/8 pt-5 font-sans text-caption leading-[1.6] text-paper/45">
            {copy.proNote}
          </p>
        </TierCard>

        {/* Support / lamp panel */}
        <div
          className="dark-island mt-12 rounded-[28px] p-7 text-center ring-1 ring-inset ring-paper/10 md:mt-16 md:p-9"
          style={premiumCardBg("soft")}
        >
          <div className="flex justify-center">
            <LampMark />
          </div>
          <p className="mt-4 font-heading text-title font-bold text-paper">{copy.supportKicker}</p>
          <p className="mx-auto mt-3 max-w-[460px] font-sans text-ui leading-relaxed text-paper/65">
            {copy.supportLine}
          </p>
          <Link href="/support" className={cn(PREMIUM_GHOST, "mt-6")}>
            {copy.supportCta}
            <ArrowRight />
          </Link>
          <p className="mt-4 font-sans text-caption text-paper/40">{copy.supportFoot}</p>
        </div>
      </div>
    </section>
  );
}

/** A paid tier: graphite warmed with gold, Pro a shade warmer than Plus. */
function TierCard({
  tone,
  title,
  chip,
  lede,
  children,
}: {
  tone: "plus" | "pro";
  title: string;
  chip: React.ReactNode;
  lede: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "dark-island relative mt-8 overflow-hidden rounded-[28px] p-6 ring-1 ring-inset shadow-[0_24px_60px_-24px_rgba(0,0,0,0.6)] md:mt-10 md:p-9",
        tone === "pro" ? "ring-premium/45" : "ring-premium/25",
      )}
      style={premiumCardBg(tone === "pro" ? "full" : "soft")}
    >
      <div className="flex flex-wrap items-center gap-3">
        <GoldStar size={20} />
        <h2 className="text-title font-bold leading-tight text-paper md:text-heading">{title}</h2>
        <span className={PREMIUM_CHIP}>{chip}</span>
      </div>
      <p className="mt-3 max-w-[560px] font-sans text-ui leading-relaxed text-paper/70">{lede}</p>
      {children}
    </div>
  );
}

function Prices({ monthly, yearly }: { monthly: string; yearly: string }) {
  return (
    <div className="mt-8 flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-paper/8 pt-6">
      <span className="font-sans text-title font-bold tracking-[-0.01em] tabular-nums text-paper">{monthly}</span>
      <span className="text-paper/30">·</span>
      <span className="font-sans text-title font-bold tracking-[-0.01em] tabular-nums text-paper">{yearly}</span>
    </div>
  );
}

function LampMark() {
  return (
    <svg width={30} height={30} viewBox="0 0 24 24" aria-hidden>
      <path d="M12 3c2.5 3 4 5 4 7.5a4 4 0 1 1-8 0C8 8.5 9.5 6 12 3z" fill="#c9a25a" fillOpacity="0.9" />
      <path d="M12 8.5c1 1.1 1.5 2 1.5 3a1.5 1.5 0 1 1-3 0c0-1 0.5-1.9 1.5-3z" fill="#141312" fillOpacity="0.6" />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}
