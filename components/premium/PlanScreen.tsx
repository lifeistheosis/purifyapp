"use client";

// The /plan screen: a signed-in subscriber's full plan detail, reached by
// tapping the green "Plus/Pro Activated" pill. Reads the real entitlement
// (getClientPlan), explains the tier + its features + when it renews/ends,
// and animates in (reveal-rise, reduced-motion safe). Free/signed-out users
// are bounced to the /premium upsell.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getClientPlan, type ClientPlan } from "@/lib/entitlements/client";
import type { PremiumPlanCopy, PlanFeature } from "@/lib/premium/plans";
import { useTranslate } from "@/components/i18n/MessagesProvider";

const SOURCE_LABEL: Record<string, string> = {
  google: "Google Play",
  apple: "App Store",
  stripe: "Web billing",
  comp: "Complimentary",
  unknown: "—",
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
  if (!until) return { label: "Renews", value: "—" };
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
      <div className="flex min-h-[70vh] items-center justify-center bg-night px-6">
        <p className="animate-pulse font-sans text-ui text-paper/50">
          {t("ui.loadingYourPlan")}
        </p>
      </div>
    );
  }

  const isPro = plan.tier === "pro";
  const name = isPro ? planCopy.proTitle : planCopy.plusTitle;
  const lede = isPro ? planCopy.proLede : planCopy.plusLede;
  const features: PlanFeature[] = isPro ? planCopy.proItems : planCopy.plusItems;
  const bill = billing(plan);
  const source = SOURCE_LABEL[plan.source ?? "unknown"] ?? plan.source ?? "—";
  const delay = (i: number) => ({ animationDelay: `${i * 90}ms` });

  return (
    <div className="min-h-[calc(100dvh-72px)] bg-night px-5 md:px-8 py-14 md:py-20">
      <div className="mx-auto w-full max-w-[640px]">
        {/* Hero */}
        <div className="reveal-rise text-center" style={delay(0)}>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/[0.12]">
            <BigCheck />
          </div>
          <p className="mt-5 font-sans text-eyebrow font-semibold uppercase tracking-[2px] text-emerald-300/80">
            {t("ui.yourPlan")}
          </p>
          <h1 className="mt-2 font-display-serif text-display-sm text-paper md:text-display">
            {t("ui.youReOn")} {name}
          </h1>
          <p className="mx-auto mt-4 max-w-[460px] font-sans text-body leading-relaxed text-paper/70">
            {lede}
          </p>
        </div>

        {/* Status */}
        <div
          className="reveal-rise mt-9 grid grid-cols-2 gap-3 sm:grid-cols-3"
          style={delay(1)}
        >
          <StatBox label={t("ui.plan")} value={isPro ? "Pro" : "Plus"} accent />
          <StatBox label={t("ui.accessVia")} value={source} />
          <StatBox label={bill.label} value={bill.value} />
        </div>

        {/* Features */}
        <div
          className="reveal-rise mt-6 rounded-2xl border border-paper/10 p-6 md:p-7"
          style={{
            ...delay(2),
            background:
              "radial-gradient(120% 90% at 50% 0%, rgba(16,185,129,0.06) 0%, transparent 60%), #0b0d0b",
          }}
        >
          <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-paper/45">
            {t("ui.whatSIncluded")}
          </p>
          <ul className="mt-5 space-y-4">
            {features.map((f) => (
              <li key={f.title} className="flex gap-3">
                <SmallCheck />
                <span>
                  <span className="block font-sans text-ui font-semibold text-paper">
                    {f.title}
                    {f.soon && (
                      <span className="ml-2 inline-flex translate-y-[-1px] items-center rounded-pill border border-[#e9c86a]/40 bg-[#e9c86a]/10 px-1.5 py-px align-middle font-sans text-[10px] font-semibold tracking-[0.6px] text-[#e9c86a]/90">
                        {planCopy.soonLabel}
                      </span>
                    )}
                  </span>
                  <span className="block font-sans text-caption leading-relaxed text-paper/55">
                    {f.sub}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div
          className="reveal-rise mt-7 flex flex-wrap items-center justify-center gap-3"
          style={delay(3)}
        >
          <Link
            href="/prayers/today"
            className="rounded-pill border border-emerald-400/50 bg-emerald-500/[0.14] px-6 py-3 font-sans text-ui font-semibold text-emerald-200 transition-colors hover:bg-emerald-500/20"
          >
            {t("ui.backToReading")}
          </Link>
          {plan.source !== "comp" && (
            <Link
              href="/pricing"
              className="rounded-pill border border-paper/20 px-6 py-3 font-sans text-ui font-semibold text-paper/85 transition-colors hover:border-paper/40 hover:text-paper"
            >
              {t("ui.manageSubscription")}
            </Link>
          )}
        </div>
        {plan.source === "comp" && (
          <p
            className="reveal-rise mt-4 text-center font-sans text-caption text-paper/40"
            style={delay(3)}
          >
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
      className={`rounded-xl border p-4 ${
        accent
          ? "border-emerald-400/40 bg-emerald-500/[0.08]"
          : "border-paper/10 bg-black/20"
      }`}
    >
      <p className="font-sans text-eyebrow uppercase tracking-[1px] text-paper/45">
        {label}
      </p>
      <p
        className={`mt-1.5 font-display-serif text-body ${
          accent ? "text-emerald-200" : "text-paper"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function BigCheck() {
  return (
    <svg width={30} height={30} viewBox="0 0 24 24" aria-hidden>
      <path
        d="M20 6 L9 17 L4 12"
        fill="none"
        stroke="#6ee7b7"
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SmallCheck() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" aria-hidden className="mt-[3px] shrink-0">
      <path
        d="M20 6 L9 17 L4 12"
        fill="none"
        stroke="#6ee7b7"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
