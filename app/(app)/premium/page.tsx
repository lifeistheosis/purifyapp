import Link from "next/link";
import { getServerLocale } from "@/lib/i18n/server";
import { getPremiumPlan, type PremiumPlanCopy } from "@/lib/premium/plans";

export const metadata = {
  title: "Purify Premium",
  description:
    "The whole spiritual treasury of Purify is free, and it stays free. Purify Plus carries your reading across every device; Purify Pro adds a monthly mailed icon and shop codes. See everything each plan includes.",
};

// Page chrome (hero + section + card labels). The tier substance — items,
// prices, the opening offer, the promise — comes from lib/premium/plans, the
// single source of truth shared with /pricing.
type PremiumChrome = {
  eyebrow: string;
  h1: string;
  lede: string;
  offerChip: string;
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
  offerChip: "Opening offer · 50% off your first year",
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
  offerChip: "Eröffnungsangebot · 50% Rabatt im ersten Jahr",
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

function PremiumView({
  chrome,
  plan,
}: {
  chrome: PremiumChrome;
  plan: PremiumPlanCopy;
}) {
  return (
    <div className="bg-night">
      {/* Hero */}
      <section className="relative overflow-hidden px-5 md:px-8 pt-16 md:pt-24 pb-10 md:pb-14">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 70% at 50% 0%, rgba(212,175,55,0.14) 0%, transparent 55%)",
          }}
        />
        <div className="relative mx-auto max-w-[820px] text-center">
          <p className="mb-4 font-sans text-detail font-semibold uppercase tracking-[2px] text-[#e9c86a]">
            {chrome.eyebrow}
          </p>
          <h1 className="font-heading text-display-sm font-bold leading-[1.05] tracking-[-0.02em] text-paper md:text-display">
            {chrome.h1}
          </h1>
          <p className="mx-auto mt-6 max-w-[620px] font-sans text-body leading-relaxed text-paper/75 md:text-lede">
            {chrome.lede}
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#plus"
              className="inline-flex items-center gap-2 rounded-pill border border-[#d4af37]/55 bg-[#d4af37]/[0.12] px-6 py-3 font-sans text-ui font-semibold text-[#f0cf7a] transition-colors hover:border-[#d4af37] hover:bg-[#d4af37]/20"
            >
              {chrome.seePlus}
              <ArrowDown />
            </a>
            <a
              href="#pro"
              className="inline-flex items-center gap-2 rounded-pill border border-paper/20 px-6 py-3 font-sans text-ui font-semibold text-paper/85 transition-colors hover:border-paper/40 hover:text-paper"
            >
              {chrome.seePro}
              <ArrowDown />
            </a>
          </div>
          <p className="mt-5 font-sans text-caption text-[#e9c86a]/80">
            {chrome.offerChip}
          </p>
        </div>
      </section>

      {/* The plans */}
      <section className="px-5 md:px-8 pb-6">
        <div className="mx-auto max-w-[1120px]">
          <div className="mb-8 text-center md:mb-10">
            <h2 className="font-heading text-title font-bold tracking-[-0.01em] text-paper">
              {chrome.plansHeading}
            </h2>
            <p className="mx-auto mt-3 max-w-[520px] font-sans text-ui text-paper/60">
              {chrome.plansSub}
            </p>
          </div>

          <div className="grid items-stretch gap-5 lg:grid-cols-3">
            {/* Standard */}
            <PlanCard tone="plain">
              <PlanHead name={chrome.standardName} />
              <PriceBlock main={chrome.standardPrice} sub={chrome.standardPriceSub} />
              <p className="mt-3 font-sans text-ui leading-relaxed text-paper/65">
                {chrome.standardTagline}
              </p>
              <FeatureList items={plan.freeItems.map((title) => ({ title }))} />
              <p className="mt-5 border-t border-paper/8 pt-4 font-sans text-caption text-paper/45">
                {plan.freeFoot}
              </p>
              <CardCta
                href="/prayers/today"
                label={chrome.standardCta}
                tone="plain"
              />
            </PlanCard>

            {/* Plus */}
            <PlanCard tone="plus" id="plus">
              <PlanHead name={plan.plusTitle} badge={chrome.plusBadge} />
              <PriceBlock main={plan.plusPriceMonthly} sub={`${chrome.perYear} ${plan.plusPriceYearly}`} />
              <p className="mt-3 font-sans text-ui leading-relaxed text-paper/70">
                {plan.plusLede}
              </p>
              <FeatureList items={plan.plusItems} />
              <p className="mt-5 font-sans text-caption text-[#e9c86a]/85">
                {plan.openingOffer}
              </p>
              <CardCta href="/pricing" label={chrome.plusCta} tone="plus" />
            </PlanCard>

            {/* Pro (the ribbon marks the tier; no inline badge, so it never
                collides with "Most complete" in the corner). */}
            <PlanCard tone="pro" id="pro" ribbon={chrome.proRibbon}>
              <PlanHead name={plan.proTitle} />
              <PriceBlock main={plan.proPriceMonthly} sub={`${chrome.perYear} ${plan.proPriceYearly}`} />
              <p className="mt-3 font-sans text-ui leading-relaxed text-paper/70">
                {plan.proLede}
              </p>
              <FeatureList items={plan.proItems} />
              <p className="mt-5 font-sans text-caption text-[#e9c86a]/85">
                {plan.openingOffer}
              </p>
              {/* Pro routes to the pricing page, where the Pro web checkout
                  (or the Play fallback) lives — not straight to Play. */}
              <CardCta href="/pricing" label={chrome.proCta} tone="pro" />
            </PlanCard>
          </div>

          <p className="mt-6 text-center font-sans text-caption leading-[1.6] text-paper/40">
            {plan.proNote}
          </p>
        </div>
      </section>

      {/* Free-core reassurance */}
      <section className="px-5 md:px-8 py-10 md:py-14">
        <div className="mx-auto max-w-[820px]">
          <div
            className="rounded-2xl border border-paper/10 p-7 md:p-9"
            style={{
              background:
                "radial-gradient(120% 90% at 50% 0%, rgba(212,175,55,0.05) 0%, transparent 60%), #0c0b09",
            }}
          >
            <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45">
              {chrome.freeHeading}
            </p>
            <ul className="mt-5 grid gap-3.5 sm:grid-cols-2">
              {plan.freeItems.map((item) => (
                <li key={item} className="flex gap-3">
                  <StarMark />
                  <span className="font-serif text-body leading-snug text-paper/90">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-6 border-t border-paper/8 pt-5 font-sans text-ui text-paper/55">
              {plan.freeFoot}
            </p>
          </div>
        </div>
      </section>

      {/* Plus promise + support */}
      <section className="px-5 md:px-8 pb-20 md:pb-28">
        <div className="mx-auto max-w-[820px]">
          <p className="mx-auto max-w-[640px] text-center font-sans text-caption leading-[1.7] text-paper/45">
            {plan.plusPromise}
          </p>

          <div
            className="mt-10 rounded-2xl border border-paper/10 p-7 text-center md:p-9"
            style={{
              background:
                "radial-gradient(120% 90% at 50% 0%, rgba(212,175,55,0.07) 0%, transparent 60%), #0c0a08",
            }}
          >
            <div className="flex justify-center">
              <LampMark />
            </div>
            <p className="mt-4 font-display-serif text-title text-paper">
              {plan.supportKicker}
            </p>
            <p className="mx-auto mt-3 max-w-[460px] font-sans text-ui leading-relaxed text-paper/65">
              {plan.supportLine}
            </p>
            <Link
              href="/support"
              className="mt-6 inline-flex items-center gap-2 rounded-pill border border-[#d4af37]/35 bg-[#d4af37]/[0.06] px-6 py-3 font-sans text-ui font-semibold text-[#e9c86a] transition-colors hover:bg-[#d4af37]/[0.14]"
            >
              {plan.supportCta}
              <ArrowRight />
            </Link>
            <p className="mt-4 font-sans text-caption text-paper/40">
              {plan.supportFoot}
            </p>
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
  const border =
    tone === "pro"
      ? "border-[#d4af37]/50"
      : tone === "plus"
        ? "border-[#d4af37]/25"
        : "border-paper/10";
  const bg =
    tone === "pro"
      ? "radial-gradient(130% 80% at 50% 0%, rgba(212,175,55,0.16) 0%, transparent 60%), #0d0b07"
      : tone === "plus"
        ? "radial-gradient(130% 90% at 50% 0%, rgba(212,175,55,0.10) 0%, transparent 58%), #0c0b09"
        : "#0b0a09";
  return (
    <div
      id={id}
      className={`relative flex scroll-mt-24 flex-col overflow-hidden rounded-2xl border p-6 md:p-7 ${border}`}
      style={{ background: bg }}
    >
      {ribbon && (
        <span className="absolute right-5 top-6 rounded-pill border border-[#d4af37]/50 bg-[#d4af37]/[0.16] px-2.5 py-0.5 font-sans text-eyebrow font-semibold uppercase tracking-[1px] text-[#f0cf7a]">
          {ribbon}
        </span>
      )}
      {children}
    </div>
  );
}

function PlanHead({ name, badge }: { name: string; badge?: string }) {
  return (
    <div className="flex items-center gap-3">
      <p className="font-display-serif text-title text-paper">{name}</p>
      {badge && (
        <span className="rounded-pill border border-[#d4af37]/40 bg-[#d4af37]/[0.10] px-2.5 py-0.5 font-sans text-eyebrow font-semibold uppercase tracking-[1px] text-[#f0cf7a]">
          {badge}
        </span>
      )}
    </div>
  );
}

function PriceBlock({ main, sub }: { main: string; sub?: string }) {
  return (
    <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className="font-display-serif text-heading text-paper">{main}</span>
      {sub && <span className="font-sans text-ui text-paper/50">{sub}</span>}
    </div>
  );
}

function FeatureList({ items }: { items: { title: string; sub?: string }[] }) {
  return (
    <ul className="mt-6 flex-1 space-y-3.5">
      {items.map((item) => (
        <li key={item.title} className="flex gap-3">
          <StarMark />
          <span>
            <span className="block font-sans text-ui font-semibold text-paper">
              {item.title}
            </span>
            {item.sub && (
              <span className="block font-sans text-caption text-paper/55">
                {item.sub}
              </span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

function CardCta({
  href,
  label,
  tone,
  external,
}: {
  href: string;
  label: string;
  tone: Tone;
  external?: boolean;
}) {
  const styles =
    tone === "pro"
      ? "border-[#d4af37]/55 bg-[#d4af37]/[0.14] text-[#f4d58a] hover:bg-[#d4af37]/24 hover:border-[#d4af37]"
      : tone === "plus"
        ? "border-[#d4af37]/45 bg-[#d4af37]/[0.10] text-[#f0cf7a] hover:bg-[#d4af37]/20 hover:border-[#d4af37]"
        : "border-paper/20 text-paper/85 hover:border-paper/40 hover:text-paper";
  const cls = `mt-6 inline-flex items-center justify-center gap-2 rounded-pill border px-6 py-3 font-sans text-ui font-semibold transition-colors ${styles}`;
  if (external) {
    return (
      <a href={href} className={cls}>
        {label}
        <ArrowRight />
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {label}
      <ArrowRight />
    </Link>
  );
}

/* ── Marks (matching the pricing surfaces) ─────────────────────────── */

function StarMark() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" aria-hidden className="mt-[5px] shrink-0">
      <path
        d="M12 2 L13.7 10.3 L22 12 L13.7 13.7 L12 22 L10.3 13.7 L2 12 L10.3 10.3 Z"
        fill="#d4af37"
        fillOpacity="0.75"
      />
    </svg>
  );
}

function LampMark() {
  return (
    <svg width={30} height={30} viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 3c2.5 3 4 5 4 7.5a4 4 0 1 1-8 0C8 8.5 9.5 6 12 3z"
        fill="#d4af37"
        fillOpacity="0.85"
      />
      <path
        d="M12 8.5c1 1.1 1.5 2 1.5 3a1.5 1.5 0 1 1-3 0c0-1 0.5-1.9 1.5-3z"
        fill="#0c0a08"
        fillOpacity="0.6"
      />
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
