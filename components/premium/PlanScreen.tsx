"use client";

// The /plan screen: a signed-in subscriber's full plan detail, reached by
// tapping the "Plus/Pro Activated" pill. Reads the real entitlement
// (getClientPlan), explains the tier + its features + when it renews/ends,
// and animates in (reveal-rise, reduced-motion safe). Free/signed-out users
// are bounced to the /premium upsell.
//
// Redrawn 2026-10-19 (1.7.2, the owner's pick B of three paywall directions;
// the gold "Your plan" he sent was where it began): the paywall's scribe, in
// black and white, with the plan's name on him; the plan in three quiet
// tiles; what it opens as the paywall's posters. No gold, and none of it in
// DM Serif Display, which the owner asked to keep out. Dark on every palette.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getClientPlan, type ClientPlan } from "@/lib/entitlements/client";
import { PLUS_ROWS, PRO_ROWS, SOON_LABEL, rowsHere } from "@/lib/premium/plusRows";
import { useDesktopApp } from "@/lib/desktop/useDesktopApp";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { FeatureShowcase, type ShowcaseItem } from "@/components/premium/FeatureShowcase";
import { PREMIUM_CTA, PREMIUM_GHOST } from "@/components/premium/PremiumUI";
import { deviceDateLocale } from "@/lib/i18n/deviceDates";

// How the plan came, and when it renews, in the reader's language (the Plus
// page and Your plan in all twenty-one languages, 2026-11-10). The stores keep
// their own names.
const SOURCE_LABEL: Record<string, string> = {
  google: "Google Play",
  apple: "App Store",
};
const SOURCE_KEY: Record<string, string> = {
  stripe: "yourPlan.source.web",
  comp: "yourPlan.source.comp",
  gift: "yourPlan.source.gift",
  test: "yourPlan.source.test",
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(deviceDateLocale(), {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function billing(plan: ClientPlan, t: (key: string, replacements?: Record<string, string | number>) => string): { label: string; value: string } {
  const until = plan.tier === "pro" ? plan.proUntil : plan.plusUntil;
  const comp = plan.source === "comp";
  if (plan.supporter && !until) return { label: t("yourPlan.access"), value: t("yourPlan.lifetime") };
  if (!until) return { label: t("yourPlan.renews"), value: t("yourPlan.notRecorded") };
  const farFuture = new Date(until).getFullYear() >= 2090;
  if (comp) {
    return {
      label: t("yourPlan.source.comp"),
      value: farFuture ? t("yourPlan.noExpiry") : t("yourPlan.until", { date: fmtDate(until) }),
    };
  }
  return { label: t("yourPlan.renewsOn"), value: fmtDate(until) };
}

/** How the plan came: a store by its own name, anything else in the reader's language. */
function sourceLabel(source: string | null, t: (key: string) => string): string {
  const s = source ?? "unknown";
  if (SOURCE_LABEL[s]) return SOURCE_LABEL[s];
  if (SOURCE_KEY[s]) return t(SOURCE_KEY[s]);
  // A source this screen has no word for: said as it was recorded, or not at all.
  return source ?? t("yourPlan.notRecorded");
}

const FREE: ClientPlan = {
  tier: "free",
  plusUntil: null,
  proUntil: null,
  source: null,
  supporter: false,
};

export function PlanScreen() {
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
      <div className="dark-island flex min-h-[70dvh] items-center justify-center bg-night px-6">
        <p className="animate-pulse font-sans text-ui text-paper/50">
          {t("ui.loadingYourPlan")}
        </p>
      </div>
    );
  }

  return <PlanView plan={plan} />;
}

/** The plan, drawn. Apart from the loading so it can be rendered from a
 *  known plan (a subscriber's, once read; a sample, in a design check). */
export function PlanView({ plan }: { plan: ClientPlan }) {
  const { t } = useTranslate();
  const isPro = plan.tier === "pro";
  const name = t(isPro ? "profile.badge.pro" : "plus.badge");
  const lede = t(isPro ? "premium.proLede" : "premium.plusLede");
  const desktopApp = useDesktopApp();
  // What it opens, in the paywall's own rows and words, in all twenty-one
  // languages (build 89 note 12): lib/premium/plans.ts is written in English
  // and German only, and the apps' export resolved it once, in English. A
  // Plus poster carries its row, so its sheet can show the feature itself.
  const features: ShowcaseItem[] = useMemo(
    () =>
      isPro
        ? PRO_ROWS.map((r) => ({ id: r.id, title: t(r.name), sub: t(r.body), soon: r.soon }))
        : rowsHere(PLUS_ROWS, { desktopApp }).map((r) => ({ id: r.id, title: t(r.name), sub: t(r.body), row: r })),
    [isPro, desktopApp, t],
  );
  const bill = billing(plan, t);
  const source = sourceLabel(plan.source, t);
  const delay = (i: number) => ({ animationDelay: `${i * 90}ms` });

  return (
    <div className="dark-island relative min-h-[calc(100dvh-72px)] overflow-hidden bg-night pb-14 md:pb-20">
      {/* The paywall's scribe, black and white, falling into the page, with the plan's name on him. */}
      <div className="relative mx-auto h-[300px] w-full max-w-[680px] overflow-hidden md:h-[340px]">
        {/* eslint-disable-next-line @next/next/no-img-element -- carried in the apps, served as it is. */}
        <img
          src="/premium/scribe.v1.webp"
          alt=""
          width={600}
          height={750}
          decoding="async"
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: "50% 20%" }}
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(75% 55% at 50% 0%, rgba(255,255,255,0.14), rgba(255,255,255,0) 72%), linear-gradient(to bottom, rgb(16 16 19 / 0.5) 0%, rgb(16 16 19 / 0) 30%, rgb(16 16 19 / 0.45) 62%, var(--color-night) 100%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 hidden sm:block"
          style={{ background: "linear-gradient(to right, var(--color-night), transparent 16%, transparent 84%, var(--color-night))" }}
        />
        <div className="reveal-rise absolute inset-x-0 bottom-2 px-5 md:px-8" style={delay(0)}>
          <p className="font-sans text-caption font-semibold text-paper/70">{t("ui.yourPlan")}</p>
          <h1 className="mt-1 text-[36px] font-semibold leading-[1.1] tracking-[-0.01em] text-paper [text-shadow:0_0_26px_rgba(255,255,255,0.26),0_2px_12px_rgba(0,0,0,0.6)] md:text-display-sm">
            {name}
          </h1>
          <p className="mt-1.5 max-w-[460px] font-sans text-ui leading-relaxed text-paper/75 [text-shadow:0_1px_8px_rgba(0,0,0,0.7)]">{lede}</p>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-[680px] px-5 md:px-8">
        {/* Status */}
        <div className="reveal-rise mt-5 grid grid-cols-3 gap-2" style={delay(1)}>
          <StatTile label={t("ui.plan")} value={isPro ? "Pro" : "Plus"} />
          <StatTile label={t("ui.accessVia")} value={source} />
          <StatTile label={bill.label} value={bill.value} />
        </div>

        {/* What it opens */}
        <div className="reveal-rise mt-7" style={delay(2)}>
          <p className="font-sans text-caption font-semibold text-paper/55">{t("ui.whatSIncluded")}</p>
          <FeatureShowcase items={features} soonLabel={t(SOON_LABEL)} label={t("ui.whatSIncluded")} owned className="mt-2.5" />
        </div>

        {/* Actions */}
        <div className="reveal-rise mt-8 grid gap-3 sm:grid-cols-2" style={delay(3)}>
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
          <p className="reveal-rise mt-4 text-center font-sans text-caption text-paper/45" style={delay(3)}>
            {t("ui.complimentaryAccessWithOurThanks")}
          </p>
        )}
      </div>
    </div>
  );
}

/** One fact of the plan, quiet: what it is, how it came, when it renews. */
function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] bg-paper/[0.05] p-3">
      <p className="font-sans text-caption text-paper/55">{label}</p>
      <p className="mt-1 font-sans text-detail font-semibold leading-snug text-paper">{value}</p>
    </div>
  );
}
