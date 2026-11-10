import Link from "next/link";
import { T } from "@/components/i18n/T";
import { PLAN_PRICE_CENTS } from "@/lib/premium/plans";
import { PLUS_ITEM_KEYS, freeKeys } from "@/lib/premium/planWords";
import { PRO_ROWS, PRO_TERMS, SOON_LABEL } from "@/lib/premium/plusRows";
import { PlanPrice, PlusTrialLine } from "@/components/premium/PlanWords";
import { CurrentPlanBanner, PlanUpgradeCta } from "@/components/premium/PlanStatus";
import {
  FeatureList as PlanFeatureList,
  PlusCheck,
  PREMIUM_CHIP,
  PREMIUM_CTA,
  PREMIUM_GHOST,
  premiumCardBg,
} from "@/components/premium/PremiumUI";
import { CARD, CARD_BG } from "@/components/ui/Graphite";
import { cn } from "@/lib/cn";

export const metadata = {
  title: "Purify Plus",
  description:
    "The whole spiritual treasury of Purify is free, and it stays free. Plus is the reading and study tools; Pro adds the EIKON Box and member benefits. See everything each plan includes.",
};

// Every word on this page is a catalog key (lib/premium/planWords.ts), in all
// twenty-one languages, and follows the app's language in the apps: the page's
// words and the plans' (his yes of 2026-11-10; build 90 note 4 found them in
// English and German only, and in English alone in the apps). The English and
// German are lib/premium/plans.ts's and the page's own, letter for letter.
export default function PremiumPage() {
  return <PremiumView />;
}

/*
 * Redrawn 2026-09-28 with the premium redesign, in the language of the
 * paywall beside it (/pricing): graphite cards warmed with the owner's antique
 * gold, every paid feature with its own mark, prices in DM Sans, and no DM
 * Serif Display anywhere, at the owner's request.
 */
function PremiumView() {
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
            background: "radial-gradient(120% 70% at 50% 0%, rgba(255,255,255,0.08) 0%, transparent 55%)",
          }}
        />
        <div className="relative mx-auto max-w-[820px] text-center">
          <p className="mb-4 inline-flex items-center gap-2 font-sans text-detail font-semibold text-paper/55">
            <T k="plus.badge" />
          </p>
          <h1 className="text-display-sm font-bold leading-[1.05] tracking-[-0.02em] text-paper md:text-display">
            <T k="premium.h1" />
          </h1>
          <p className="mx-auto mt-6 max-w-[620px] font-sans text-body leading-relaxed text-paper/75 md:text-lede">
            <T k="premium.lede" />
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a href="#plus" className={PREMIUM_CTA}>
              <T k="premium.seePlus" />
              <ArrowDown />
            </a>
            <a href="#pro" className={PREMIUM_GHOST}>
              <T k="premium.seePro" />
              <ArrowDown />
            </a>
          </div>
        </div>
      </section>

      {/* The plans */}
      <section className="px-5 pb-6 md:px-8">
        <div className="mx-auto max-w-[1120px]">
          <div className="mb-8 text-center md:mb-10">
            <h2 className="text-title font-bold tracking-[-0.01em] text-paper"><T k="premium.plansHeading" /></h2>
            <p className="mx-auto mt-3 max-w-[520px] font-sans text-ui text-paper/60"><T k="premium.plansSub" /></p>
          </div>

          <div className="grid items-stretch gap-5 lg:grid-cols-3">
            {/* Standard */}
            <PlanCard tone="plain">
              <PlanHead name={<T k="premium.standardName" />} />
              <PriceBlock main={<T k="premium.standardPrice" />} sub={<T k="premium.standardPriceSub" />} />
              <p className="mt-3 font-sans text-ui leading-relaxed text-paper/65"><T k="premium.standardTagline" /></p>
              <StarList keys={freeKeys()} className="mt-6 flex-1 content-start" />
              <p className="mt-5 border-t border-paper/8 pt-4 font-sans text-caption text-paper/45"><T k="premium.freeFoot" /></p>
              <Link
                href="/prayers/today"
                className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-pill border border-paper/20 px-6 font-sans text-ui font-semibold text-paper/85 transition-colors hover:border-paper/40 hover:text-paper"
              >
                <T k="premium.standardCta" />
                <ArrowRight />
              </Link>
            </PlanCard>

            {/* Plus */}
            <PlanCard tone="plus" id="plus">
              <PlanHead name={<T k="plus.badge" />} badge={<T k="premium.plusBadge" />} />
              <PriceBlock main={<PlanPrice cents={PLAN_PRICE_CENTS.plusMonthly} per="month" />} sub={<PlanPrice cents={PLAN_PRICE_CENTS.plusYearly} per="orYear" />} />
              <p className="mt-2 font-sans text-caption leading-relaxed text-paper/60"><PlusTrialLine /></p>
              <p className="mt-3 font-sans text-ui leading-relaxed text-paper/70"><T k="premium.plusLede" /></p>
              <PlanFeatureList
                items={PLUS_ITEM_KEYS.map((k) => ({ id: k.id, title: <T k={k.title} />, sub: <T k={k.sub} /> }))}
                soonLabel={<T k={SOON_LABEL} />}
                className="mt-6 flex-1 content-start"
              />
              <PlanUpgradeCta tier="plus" href="/pricing" label={<T k="premium.plusCta" />} />
            </PlanCard>

            {/* Pro (the ribbon marks the tier; no inline badge, so it never
                collides with "Most complete" in the corner). */}
            <PlanCard tone="pro" id="pro" ribbon={<T k="premium.proRibbon" />}>
              <PlanHead name={<T k="profile.badge.pro" />} />
              <PriceBlock main={<PlanPrice cents={PLAN_PRICE_CENTS.proMonthly} per="month" />} sub={<PlanPrice cents={PLAN_PRICE_CENTS.proYearly} per="orYear" />} />
              <p className="mt-3 font-sans text-ui leading-relaxed text-paper/70"><T k="premium.proLede" /></p>
              <PlanFeatureList
                items={PRO_ROWS.map((r) => ({ id: r.id, title: <T k={r.name} />, sub: <T k={r.body} />, soon: r.soon }))}
                soonLabel={<T k={SOON_LABEL} />}
                className="mt-6 flex-1 content-start"
              />
              {/* Pro routes to the pricing page, where the Pro web checkout
                  (or the Play fallback) lives, not straight to Play. */}
              <PlanUpgradeCta tier="pro" href="/pricing" label={<T k="premium.proCta" />} />
            </PlanCard>
          </div>

          <p className="mt-6 text-center font-sans text-caption leading-[1.6] text-paper/45"><T k={PRO_TERMS} /></p>
        </div>
      </section>

      {/* Free-core reassurance */}
      <section className="px-5 py-10 md:px-8 md:py-14">
        <div className="mx-auto max-w-[820px]">
          <div className={cn(CARD, "hover:translate-y-0 md:p-9")} style={CARD_BG}>
            <p className="font-sans text-caption font-semibold text-paper/50">
              <T k="premium.freeHeading" />
            </p>
            <StarList keys={freeKeys()} className="mt-5 sm:grid-cols-2 sm:gap-x-6" />
            <p className="mt-6 border-t border-paper/8 pt-5 font-sans text-ui text-paper/55"><T k="premium.freeFoot" /></p>
          </div>
        </div>
      </section>

      {/* Plus promise + support */}
      <section className="px-5 pb-20 md:px-8 md:pb-28">
        <div className="mx-auto max-w-[820px]">
          <p className="mx-auto max-w-[640px] text-center font-sans text-caption leading-[1.7] text-paper/45">
            <T k="plus.promise.supporters" />
          </p>

          <div
            className="dark-island mt-10 rounded-[28px] p-7 text-center ring-1 ring-inset ring-paper/10 md:p-9"
            style={premiumCardBg("soft")}
          >
            <div className="flex justify-center">
              <LampMark />
            </div>
            <p className="mt-4 font-heading text-title font-bold text-paper"><T k="premium.supportKicker" /></p>
            <p className="mx-auto mt-3 max-w-[460px] font-sans text-ui leading-relaxed text-paper/65">
              <T k="premium.supportLine" />
            </p>
            <Link href="/support" className={cn(PREMIUM_GHOST, "mt-6")}>
              <T k="premium.supportCta" />
              <ArrowRight />
            </Link>
            <p className="mt-4 font-sans text-caption text-paper/40"><T k="premium.supportFoot" /></p>
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
  ribbon?: React.ReactNode;
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
        tone === "pro" ? "ring-paper/25" : "ring-paper/[0.12]",
      )}
      style={premiumCardBg(tone === "pro" ? "full" : "soft")}
    >
      {ribbon && <span className={cn(PREMIUM_CHIP, "absolute end-5 top-6")}>{ribbon}</span>}
      {children}
    </div>
  );
}

function PlanHead({ name, badge }: { name: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <h3 className="text-title font-bold leading-tight text-paper">{name}</h3>
      {badge && <span className={PREMIUM_CHIP}>{badge}</span>}
    </div>
  );
}

function PriceBlock({ main, sub }: { main: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className="font-sans text-heading font-bold tracking-[-0.02em] tabular-nums text-paper">{main}</span>
      {sub && <span className="font-sans text-ui text-paper/50">{sub}</span>}
    </div>
  );
}

/** The free foundation, a plain line each with a check (a gold star until 1.7.2). */
function StarList({ keys, className }: { keys: string[]; className?: string }) {
  return (
    <ul className={cn("grid gap-3.5", className)}>
      {keys.map((key) => (
        <li key={key} className="flex gap-3">
          <PlusCheck size={15} className="mt-[3px]" />
          <span className="font-sans text-ui leading-snug text-paper/90">
            <T k={key} />
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ── Marks ─────────────────────────────────────────────────────────── */

function LampMark() {
  return (
    <svg width={30} height={30} viewBox="0 0 24 24" aria-hidden>
      <path d="M12 3c2.5 3 4 5 4 7.5a4 4 0 1 1-8 0C8 8.5 9.5 6 12 3z" fill="#eaeaec" fillOpacity="0.9" />
      <path d="M12 8.5c1 1.1 1.5 2 1.5 3a1.5 1.5 0 1 1-3 0c0-1 0.5-1.9 1.5-3z" fill="#131315" fillOpacity="0.6" />
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
