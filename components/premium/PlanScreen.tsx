"use client";

// The /plan screen: a signed-in subscriber's full plan detail, reached by
// tapping the "Plus/Pro Activated" pill. Redrawn 2026-09-28 with the premium
// redesign: gold and graphite where it was green, each feature with its mark,
// and none of it in DM Serif Display, which the owner asked to keep out. Reads the real entitlement
// (getClientPlan), explains the tier + its features + when it renews/ends,
// and animates in (reveal-rise, reduced-motion safe). Free/signed-out users
// are bounced to the /premium upsell.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getClientPlan, type ClientPlan } from "@/lib/entitlements/client";
import type { PremiumPlanCopy, PlanFeature } from "@/lib/premium/plans";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import {
  FeatureList,
  GoldCheck,
  PREMIUM_CTA,
  PREMIUM_GHOST,
  premiumCardBg,
} from "@/components/premium/PremiumUI";
import { CARD_BG } from "@/components/ui/Graphite";
import { cn } from "@/lib/cn";

const SOURCE_LABEL: Record<string, string> = {
  google: "Google Play",
  apple: "App Store",
  stripe: "Web billing",
  comp: "Complimentary",
  gift: "Gift",
  unknown: "Not recorded",
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function billing(plan: ClientPlan): { label: string; value: string } {
  const until = plan.tier === "pro" ? plan.proUntil : plan.plusUntil;
  const comp = plan.source === "comp";
  if (plan.supporter && !until) return { label: "Access", value: "Lifetime" };
  if (!until) return { label: "Renews", value: "Not recorded" };
  const farFuture = new Date(until).getFullYear() >= 2090;
  if (comp) {
    return {
      label: "Complimentary",
      value: farFuture ? "No expiry" : `Until ${fmtDate(until)}`,
    };
  }
  return { label: "Renews on", value: fmtDate(until) };
}

const FREE: ClientPlan = {
  tier: "free",
  plusUntil: null,
  proUntil: null,
  source: null,
  supporter: false,
};

export function PlanScreen({ planCopy }: { planCopy: PremiumPlanCopy }) {
  const { t } = useTranslate();
  const router = useRouter();
  const [plan, setPlan] = useState<ClientPlan | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      // Retry a couple of times if the read times out ("unknown") before
      // giving up and treating it as free.
      for (let i = 0; i < 3; i++) {
        const p = await getClientPlan();
        if (!alive) return;
        if (p !== "unknown") {
          setPlan(p);
          return;
        }
        await new Promise((r) => setTimeout(r, 600));
      }
      if (alive) setPlan(FREE);
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (plan && plan.tier === "free") router.replace("/premium");
  }, [plan, router]);

  if (!plan || plan.tier === "free") {
    return (
      <div className="flex min-h-[70dvh] items-center justify-center bg-night px-6">
        <p className="animate-pulse font-sans text-ui text-paper/50">
          {t("ui.loadingYourPlan")}
        </p>
      </div>
    );
  }

  return <PlanView plan={plan} planCopy={planCopy} />;
}

/** The plan, drawn. Apart from the loading so it can be rendered from a
 *  known plan (a subscriber's, once read; a sample, in a design check). */
export function PlanView({ plan, planCopy }: { plan: ClientPlan; planCopy: PremiumPlanCopy }) {
  const { t } = useTranslate();
  const isPro = plan.tier === "pro";
  const name = isPro ? planCopy.proTitle : planCopy.plusTitle;
  const lede = isPro ? planCopy.proLede : planCopy.plusLede;
  const features: PlanFeature[] = isPro ? planCopy.proItems : planCopy.plusItems;
  const bill = billing(plan);
  const source = SOURCE_LABEL[plan.source ?? "unknown"] ?? plan.source ?? "Not recorded";
  const delay = (i: number) => ({ animationDelay: `${i * 90}ms` });

  return (
    <div className="relative min-h-[calc(100dvh-72px)] overflow-hidden bg-night px-5 py-14 md:px-8 md:py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px]"
        style={{
          background: "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(201,162,90,0.12) 0%, transparent 65%)",
        }}
      />
      <div className="relative mx-auto w-full max-w-[680px]">
        {/* Hero */}
        <div className="reveal-rise text-center" style={delay(0)}>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-premium/[0.10] ring-1 ring-inset ring-premium/40 shadow-[0_0_28px_-6px_rgba(201,162,90,0.45)]">
            <GoldCheck size={28} />
          </div>
          <p className="mt-5 font-sans text-eyebrow font-semibold uppercase tracking-[2px] text-premium-soft">
            {t("ui.yourPlan")}
          </p>
          <h1 className="mt-2 text-display-sm font-bold leading-[1.1] text-paper md:text-display">
            {t("ui.youReOn")} <span className="premium-gold-text">{name}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-[460px] font-sans text-body leading-relaxed text-paper/70">{lede}</p>
        </div>

        {/* Status */}
        <div className="reveal-rise mt-9 grid grid-cols-2 gap-3 sm:grid-cols-3" style={delay(1)}>
          <StatBox label={t("ui.plan")} value={isPro ? "Pro" : "Plus"} accent />
          <StatBox label={t("ui.accessVia")} value={source} />
          <StatBox label={bill.label} value={bill.value} />
        </div>

        {/* Features */}
        <div
          className="dark-island reveal-rise mt-6 rounded-[28px] p-6 ring-1 ring-inset ring-premium/25 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.6)] md:p-8"
          style={{ ...delay(2), ...premiumCardBg("soft") }}
        >
          <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-premium-soft">
            {t("ui.whatSIncluded")}
          </p>
          <FeatureList items={features} soonLabel={planCopy.soonLabel} className="mt-6" />
        </div>

        {/* Actions */}
        <div className="reveal-rise mt-8 flex flex-wrap items-center justify-center gap-3" style={delay(3)}>
          <Link href="/prayers/today" className={PREMIUM_CTA}>
            {t("ui.backToReading")}
          </Link>
          {plan.source !== "comp" && (
            <Link href="/pricing" className={PREMIUM_GHOST}>
              {t("ui.manageSubscription")}
            </Link>
          )}
        </div>
        {plan.source === "comp" && (
          <p className="reveal-rise mt-4 text-center font-sans text-caption text-paper/40" style={delay(3)}>
            {t("ui.complimentaryAccessWithOurThanks")}
          </p>
        )}
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      // The plan's own box is a gold set piece, dark on every palette; the
      // other two follow the palette like any graphite card.
      className={cn(
        "rounded-[20px] p-4 ring-1 ring-inset",
        accent ? "dark-island ring-premium/40" : "lm-card ring-paper/10",
      )}
      style={accent ? premiumCardBg("full") : CARD_BG}
    >
      <p className="font-sans text-eyebrow uppercase tracking-[1px] text-paper/50">{label}</p>
      <p
        className={cn(
          "mt-1.5 font-sans text-ui font-semibold leading-snug",
          accent ? "premium-gold-text text-lede font-bold" : "text-paper",
        )}
      >
        {value}
      </p>
    </div>
  );
}
