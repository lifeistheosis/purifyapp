import Link from "next/link";
import { getServerLocale } from "@/lib/i18n/server";
import { getPremiumPlan, type PremiumPlanCopy } from "@/lib/premium/plans";
import { CurrentPlanBanner, PlanUpgradeCta } from "@/components/premium/PlanStatus";
import {
  FeatureList as PlanFeatureList,
  GoldStar,
  PREMIUM_CHIP,
  PREMIUM_CTA,
  PREMIUM_GHOST,
  premiumCardBg,
} from "@/components/premium/PremiumUI";
import { CARD, CARD_BG } from "@/components/ui/Graphite";
import { cn } from "@/lib/cn";

export const metadata = {
  title: "Purify Premium",
  description:
    "The whole spiritual treasury of Purify is free, and it stays free. Purify Plus is the premium reading and study experience; Purify Pro adds premium reading modes, the monthly EIKON Box, and EIKON member benefits. See everything each plan includes.",
};

// Page chrome (hero + section + card labels). The tier substance — items,
// prices, the opening offer, the promise — comes from lib/premium/plans, the
// single source of truth shared with /pricing.
type PremiumChrome = {
  eyebrow: string;
  h1: string;
  lede: string;
  seePlus: string;
  seePro: string;
  freeHeading: string;
  plansHeading: string;
  plansSub: string;
  standardName: string;
  standardPrice: string;
  standardPriceSub: string;
  standardTagline: string;
  standardCta: string;
  plusBadge: string;
  plusCta: string;
  proBadge: string;
  proRibbon: string;
  proCta: string;
  compareAll: string;
  perYear: string;
};

const CHROME_EN: PremiumChrome = {
  eyebrow: "Purify Premium",
  h1: "The whole Church, carried with you.",
  lede: "Everything at the heart of Purify is free, and it stays free. Plus and Pro add an optional layer: your reading on every device, the Church in fuller dress, and a way to keep the lamps lit.",
  seePlus: "See Purify Plus",
  seePro: "See Purify Pro",
  freeHeading: "Free, and always",
  plansHeading: "Choose your plan",
  plansSub: "Two optional subscriptions. Cancel anytime. The free core never changes.",
  standardName: "Standard",
  standardPrice: "Free",
  standardPriceSub: "forever",
  standardTagline: "The whole spiritual treasury, for anyone who needs it.",
  standardCta: "Open Purify",
  plusBadge: "Available now",
  plusCta: "Get Purify Plus",
  proBadge: "Members",
  proRibbon: "Most complete",
  proCta: "Get Purify Pro",
  compareAll: "See full plan details",
  perYear: "or",
};

const CHROME_DE: PremiumChrome = {
  eyebrow: "Purify Premium",
  h1: "Die ganze Kirche, mit dir getragen.",
  lede: "Alles im Herzen von Purify ist frei und bleibt frei. Plus und Pro fügen eine optionale Schicht hinzu: dein Lesen auf jedem Gerät, die Kirche in vollerem Gewand und ein Weg, die Lampen am Brennen zu halten.",
  seePlus: "Purify Plus ansehen",
  seePro: "Purify Pro ansehen",
  freeHeading: "Frei, und immer",
  plansHeading: "Wähle deinen Plan",
  plansSub: "Zwei optionale Abonnements. Jederzeit kündbar. Der freie Kern ändert sich nie.",
  standardName: "Standard",
  standardPrice: "Frei",
  standardPriceSub: "für immer",
  standardTagline: "Der ganze geistliche Schatz, für jeden, der ihn braucht.",
  standardCta: "Purify öffnen",
  plusBadge: "Jetzt verfügbar",
  plusCta: "Purify Plus holen",
  proBadge: "Mitglieder",
  proRibbon: "Am umfassendsten",
  proCta: "Purify Pro holen",
  compareAll: "Alle Plandetails ansehen",
  perYear: "oder",
};

export default async function PremiumPage() {
  const locale = await getServerLocale();
  const chrome = locale === "de" ? CHROME_DE : CHROME_EN;
  const plan = getPremiumPlan(locale);
  return <PremiumView chrome={chrome} plan={plan} />;
}

/*
 * Redrawn 2026-09-28 with the premium redesign, in the language of the
 * paywall beside it (/pricing): graphite cards warmed with the owner's antique
 * gold, every paid feature with its own mark, prices in DM Sans, and no DM
 * Serif Display anywhere, at the owner's request.
 */
function PremiumView({
  chrome,
  plan,
}: {
  chrome: PremiumChrome;
  plan: PremiumPlanCopy;
}) {
  return (
    <div className="bg-night">
      {/* Recognizes a signed-in subscriber; renders nothing for free users. */}
      <CurrentPlanBanner />
      {/* Hero */}
      <section className="relative overflow-hidden px-5 pb-10 pt-16 md:px-8 md:pb-14 md:pt-24">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: "radial-gradient(120% 70% at 50% 0%, rgba(201,162,90,0.14) 0%, transparent 55%)",
          }}
        />
        <div className="relative mx-auto max-w-[820px] text-center">
          <p className="mb-4 inline-flex items-center gap-2 font-sans text-detail font-semibold uppercase tracking-[2px] text-premium-soft">
            <GoldStar size={14} />
            {chrome.eyebrow}
          </p>
          <h1 className="text-display-sm font-bold leading-[1.05] tracking-[-0.02em] text-paper md:text-display">
            {chrome.h1}
          </h1>
          <p className="mx-auto mt-6 max-w-[620px] font-sans text-body leading-relaxed text-paper/75 md:text-lede">
            {chrome.lede}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a href="#plus" className={PREMIUM_CTA}>
              {chrome.seePlus}
              <ArrowDown />
            </a>
            <a href="#pro" className={PREMIUM_GHOST}>
              {chrome.seePro}
              <ArrowDown />
            </a>
          </div>
        </div>
      </section>

      {/* The plans */}
      <section className="px-5 pb-6 md:px-8">
        <div className="mx-auto max-w-[1120px]">
          <div className="mb-8 text-center md:mb-10">
            <h2 className="text-title font-bold tracking-[-0.01em] text-paper">{chrome.plansHeading}</h2>
            <p className="mx-auto mt-3 max-w-[520px] font-sans text-ui text-paper/60">{chrome.plansSub}</p>
          </div>

          <div className="grid items-stretch gap-5 lg:grid-cols-3">
            {/* Standard */}
            <PlanCard tone="plain">
              <PlanHead name={chrome.standardName} />
              <PriceBlock main={chrome.standardPrice} sub={chrome.standardPriceSub} />
              <p className="mt-3 font-sans text-ui leading-relaxed text-paper/65">{chrome.standardTagline}</p>
              <StarList items={plan.freeItems} className="mt-6 flex-1 content-start" />
              <p className="mt-5 border-t border-paper/8 pt-4 font-sans text-caption text-paper/45">{plan.freeFoot}</p>
              <Link
                href="/prayers/today"
                className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-pill border border-paper/20 px-6 font-sans text-ui font-semibold text-paper/85 transition-colors hover:border-paper/40 hover:text-paper"
              >
                {chrome.standardCta}
                <ArrowRight />
              </Link>
            </PlanCard>

            {/* Plus */}
            <PlanCard tone="plus" id="plus">
              <PlanHead name={plan.plusTitle} badge={chrome.plusBadge} />
              <PriceBlock main={plan.plusPriceMonthly} sub={`${chrome.perYear} ${plan.plusPriceYearly}`} />
              <p className="mt-3 font-sans text-ui leading-relaxed text-paper/70">{plan.plusLede}</p>
              <PlanFeatureList items={plan.plusItems} soonLabel={plan.soonLabel} className="mt-6 flex-1 content-start" />
              <PlanUpgradeCta tier="plus" href="/pricing" label={chrome.plusCta} />
            </PlanCard>

            {/* Pro (the ribbon marks the tier; no inline badge, so it never
                collides with "Most complete" in the corner). */}
            <PlanCard tone="pro" id="pro" ribbon={chrome.proRibbon}>
              <PlanHead name={plan.proTitle} />
              <PriceBlock main={plan.proPriceMonthly} sub={`${chrome.perYear} ${plan.proPriceYearly}`} />
              <p className="mt-3 font-sans text-ui leading-relaxed text-paper/70">{plan.proLede}</p>
              <PlanFeatureList items={plan.proItems} soonLabel={plan.soonLabel} className="mt-6 flex-1 content-start" />
              {/* Pro routes to the pricing page, where the Pro web checkout
                  (or the Play fallback) lives, not straight to Play. */}
              <PlanUpgradeCta tier="pro" href="/pricing" label={chrome.proCta} />
            </PlanCard>
          </div>

          <p className="mt-6 text-center font-sans text-caption leading-[1.6] text-paper/40">{plan.proNote}</p>
        </div>
      </section>

      {/* Free-core reassurance */}
      <section className="px-5 py-10 md:px-8 md:py-14">
        <div className="mx-auto max-w-[820px]">
          <div className={cn(CARD, "hover:translate-y-0 md:p-9")} style={CARD_BG}>
            <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/50">
              {chrome.freeHeading}
            </p>
            <StarList items={plan.freeItems} className="mt-5 sm:grid-cols-2 sm:gap-x-6" />
            <p className="mt-6 border-t border-paper/8 pt-5 font-sans text-ui text-paper/55">{plan.freeFoot}</p>
          </div>
        </div>
      </section>

      {/* Plus promise + support */}
      <section className="px-5 pb-20 md:px-8 md:pb-28">
        <div className="mx-auto max-w-[820px]">
          <p className="mx-auto max-w-[640px] text-center font-sans text-caption leading-[1.7] text-paper/45">
            {plan.plusPromise}
          </p>

          <div
            className="dark-island mt-10 rounded-[28px] p-7 text-center ring-1 ring-inset ring-paper/10 md:p-9"
            style={premiumCardBg("soft")}
          >
            <div className="flex justify-center">
              <LampMark />
            </div>
            <p className="mt-4 font-heading text-title font-bold text-paper">{plan.supportKicker}</p>
            <p className="mx-auto mt-3 max-w-[460px] font-sans text-ui leading-relaxed text-paper/65">
              {plan.supportLine}
            </p>
            <Link href="/support" className={cn(PREMIUM_GHOST, "mt-6")}>
              {plan.supportCta}
              <ArrowRight />
            </Link>
            <p className="mt-4 font-sans text-caption text-paper/40">{plan.supportFoot}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ── Card scaffolding ──────────────────────────────────────────────── */

type Tone = "plain" | "plus" | "pro";

function PlanCard({
  tone,
  id,
  ribbon,
  children,
}: {
  tone: Tone;
  id?: string;
  ribbon?: string;
  children: React.ReactNode;
}) {
  if (tone === "plain") {
    return (
      <div id={id} className={cn(CARD, "scroll-mt-24 hover:translate-y-0 md:p-7")} style={CARD_BG}>
        {children}
      </div>
    );
  }
  return (
    <div
      id={id}
      className={cn(
        "dark-island relative flex scroll-mt-24 flex-col overflow-hidden rounded-[28px] p-6 ring-1 ring-inset shadow-[0_24px_60px_-24px_rgba(0,0,0,0.6)] md:p-7",
        tone === "pro" ? "ring-premium/50" : "ring-premium/25",
      )}
      style={premiumCardBg(tone === "pro" ? "full" : "soft")}
    >
      {ribbon && <span className={cn(PREMIUM_CHIP, "absolute right-5 top-6")}>{ribbon}</span>}
      {children}
    </div>
  );
}

function PlanHead({ name, badge }: { name: string; badge?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <h3 className="text-title font-bold leading-tight text-paper">{name}</h3>
      {badge && <span className={PREMIUM_CHIP}>{badge}</span>}
    </div>
  );
}

function PriceBlock({ main, sub }: { main: string; sub?: string }) {
  return (
    <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className="font-sans text-heading font-bold tracking-[-0.02em] tabular-nums text-paper">{main}</span>
      {sub && <span className="font-sans text-ui text-paper/50">{sub}</span>}
    </div>
  );
}

/** The free foundation, a plain line each with a gold star. */
function StarList({ items, className }: { items: string[]; className?: string }) {
  return (
    <ul className={cn("grid gap-3.5", className)}>
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <GoldStar size={14} className="mt-[5px] opacity-80" />
          <span className="font-sans text-ui leading-snug text-paper/90">{item}</span>
        </li>
      ))}
    </ul>
  );
}

/* ── Marks ─────────────────────────────────────────────────────────── */

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

function ArrowDown() {
  return (
    <svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 5v14" />
      <path d="m5 12 7 7 7-7" />
    </svg>
  );
}
