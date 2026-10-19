"use client";

// Native-only Purify premium paywall — a fully custom UI driving RevenueCat
// (Play Billing and StoreKit). Returns null on the web (the website keeps its
// own pricing page). Inside the apps the pricing route renders this
// full-screen.
//
// Two tiers, one screen: a Plus / Pro switcher under the hero swaps the
// features, the live store prices, and the action. Plus sells from the
// default RevenueCat offering, Pro from the `pro` offering; both bind to the
// Supabase account (the webhook writes entitlements by uid), so a signed-out
// user signs in first.
//
// RevenueCat is the billing engine only: prices come live from the store
// (package.product.priceString), so changing a price in the store consoles
// flows through with no code change, and so does a free trial: the screen
// says "7 days free" only when the store says this reader may have it
// (lib/billing/revenuecat.ts, freeTrial).
//
// DRAWN (1.7.2, the owner's pick of three directions: "B is the best"): the
// young scribe of St Prochorus's icon, writing the first words of St John's
// Gospel, in black and white, lit from above and falling into the page, the
// tier's name on him; the features as small posters in a row; the two plans
// side by side; one white action with a soft light under it. No gold, no
// star: the screen is dark on every palette (a dark island), as the paywall
// always was. The picture is carried in the apps (public/premium), so it is
// there the moment the screen is; it is the reading room's cover of St
// Prochorus made black and white (docs/licensing/COVER_ICONS.md).

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  initBilling,
  getPlusPackages,
  getProPackages,
  isPlusActive,
  isProActive,
  purchase,
  restore,
  billingAvailable,
  manageSubscriptionUrl,
  freeTrial,
  type PlusPackages,
} from "@/lib/billing/revenuecat";
import { presentCustomerCenter } from "@/lib/billing/revenuecatUi";
import { createClient } from "@/lib/supabase/client";
import { nativePlatform, useIsNative } from "@/lib/platform/native";
import { getPremiumPlan } from "@/lib/premium/plans";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { FeatureShowcase } from "@/components/premium/FeatureShowcase";
import { PREMIUM_CTA, PREMIUM_GHOST } from "@/components/premium/PremiumUI";
import { cn } from "@/lib/cn";

type Phase = "loading" | "signed-out" | "unavailable" | "ready" | "subscribed";
export type Tier = "plus" | "pro";
export type Plan = "monthly" | "yearly";

/** Each package's free trial, as the store answered it for this reader. */
export type Trials = Record<`${Tier}-${Plan}`, string | null>;
const NO_TRIALS: Trials = { "plus-monthly": null, "plus-yearly": null, "pro-monthly": null, "pro-yearly": null };

/** Yearly savings vs paying monthly for a year, rounded. Null when it can't
 * be computed or isn't a saving. */
function savingsPct(pkgs: PlusPackages): number | null {
  const m = pkgs.monthly?.product.price;
  const y = pkgs.yearly?.product.price;
  if (!m || !y || m <= 0) return null;
  const pct = Math.round((1 - y / (m * 12)) * 100);
  return pct > 0 ? pct : null;
}

/** The store the charge comes from, as a sentence names it. */
function storeName(): string {
  return nativePlatform() === "ios" ? "the App Store" : "Google Play";
}

export function PlusPaywall() {
  const isNative = useIsNative();

  const [phase, setPhase] = useState<Phase>("loading");
  const [tier, setTier] = useState<Tier>("plus");
  // What the account already has. `pro` short-circuits to the subscribed
  // screen; `plus` keeps the paywall up so Pro stays one tap away.
  const [active, setActive] = useState<"none" | "plus">("none");
  const [plusPkgs, setPlusPkgs] = useState<PlusPackages>({
    monthly: null,
    yearly: null,
  });
  const [proPkgs, setProPkgs] = useState<PlusPackages>({
    monthly: null,
    yearly: null,
  });
  const [trials, setTrials] = useState<Trials>(NO_TRIALS);
  const [selected, setSelected] = useState<Plan>("yearly");
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    // Any failure in the RevenueCat/plugin chain must degrade to the calm
    // "unavailable" state, never throw uncaught (an unhandled error here
    // white-screened the WebView — the "Purify Plus crashes" report).
    try {
      if (!billingAvailable()) {
        setPhase("unavailable");
        return;
      }
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setPhase("signed-out");
        return;
      }
      if (!(await initBilling(user.id))) {
        setPhase("unavailable");
        return;
      }
      if (await isProActive()) {
        // Pro is the top tier: nothing left to sell.
        setPhase("subscribed");
        return;
      }
      const hasPlus = await isPlusActive();
      setActive(hasPlus ? "plus" : "none");
      const [plus, pro] = await Promise.all([
        getPlusPackages(),
        getProPackages(),
      ]);
      setPlusPkgs(plus);
      setProPkgs(pro);
      // The store's own word on each trial, for this reader. Never throws.
      const [plusMonthly, plusYearly, proMonthly, proYearly] = await Promise.all([
        freeTrial(plus.monthly),
        freeTrial(plus.yearly),
        freeTrial(pro.monthly),
        freeTrial(pro.yearly),
      ]);
      setTrials({ "plus-monthly": plusMonthly, "plus-yearly": plusYearly, "pro-monthly": proMonthly, "pro-yearly": proYearly });
      setSelected(plus.yearly || pro.yearly ? "yearly" : "monthly");
      // A Plus subscriber lands on the Pro tab: Plus is already theirs.
      if (hasPlus) setTier("pro");
      const anyPkg = plus.monthly || plus.yearly || pro.monthly || pro.yearly;
      setPhase(anyPkg || hasPlus ? "ready" : "unavailable");
    } catch (e) {
      console.error("[PlusPaywall] load failed:", e);
      setPhase("unavailable");
    }
  }, []);

  useEffect(() => {
    if (!isNative) return;
    // External-system effect (RevenueCat + Supabase); state is set after awaits.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [isNative, load]);

  const pkgs = tier === "pro" ? proPkgs : plusPkgs;

  const onSubscribe = useCallback(async () => {
    const pkg = selected === "yearly" ? pkgs.yearly : pkgs.monthly;
    if (!pkg || busy) return;
    setBusy("buy");
    setNote(null);
    try {
      const outcome = await purchase(pkg, tier);
      if (outcome === "active") {
        if (tier === "pro") setPhase("subscribed");
        else setActive("plus");
      } else if (outcome === "error") {
        setNote("That didn't go through. Nothing was charged.");
      }
    } catch (e) {
      console.error("[PlusPaywall] purchase failed:", e);
      setNote("That didn't go through. Nothing was charged.");
    } finally {
      setBusy(null);
    }
  }, [selected, pkgs, tier, busy]);

  const onRestore = useCallback(async () => {
    if (busy) return;
    setBusy("restore");
    setNote(null);
    try {
      const ok = await restore();
      if (ok) await load(); // re-derive the tier the restore lit up
      else setNote("No previous Purify subscription was found.");
    } catch (e) {
      console.error("[PlusPaywall] restore failed:", e);
      setNote("Couldn't check for a previous subscription. Please try again.");
    } finally {
      setBusy(null);
    }
  }, [busy, load]);

  const onManage = useCallback(async () => {
    try {
      const shown = await presentCustomerCenter();
      if (!shown && typeof window !== "undefined") {
        window.open(manageSubscriptionUrl(), "_blank");
      }
    } catch (e) {
      console.error("[PlusPaywall] manage failed:", e);
      if (typeof window !== "undefined") {
        window.open(manageSubscriptionUrl(), "_blank");
      }
    }
  }, []);

  // Web renders nothing; the server pricing page carries the web copy.
  if (!isNative || phase === "loading") return null;

  if (phase === "signed-out") {
    return (
      <Screen>
        <Hero tier="plus" />
        {/* The same posters the ready phase shows, so the screen sells the
            thing before asking for a sign-in. */}
        <Included tier="plus" />
        <Foot>
          <p className="mx-auto max-w-[320px] text-center font-sans text-ui leading-relaxed text-paper/70">
            Purify Plus and Pro are tied to your account, so they follow you
            across your devices.
          </p>
          <Link href="/signin?next=/pricing" className={cn(PREMIUM_CTA, "mt-5 min-h-14 w-full text-lede")}>
            Sign in to continue
          </Link>
          <p className="mt-3 text-center font-sans text-caption text-paper/50">
            Billed through {storeName()}. Cancel anytime.
          </p>
        </Foot>
      </Screen>
    );
  }

  if (phase === "unavailable") {
    return (
      <Screen>
        <Hero tier="plus" />
        <Foot>
          <p className="mx-auto max-w-[320px] text-center font-sans text-ui leading-relaxed text-paper/65">
            Purify Plus isn’t available to purchase right now. The whole core of
            Purify stays free, and everything you’ve gathered is safe on this
            device.
          </p>
        </Foot>
      </Screen>
    );
  }

  if (phase === "subscribed") {
    return (
      <Screen>
        <Hero tier="pro" />
        <Foot>
          <p className="text-center font-heading text-title font-semibold text-paper">You have Purify Pro.</p>
          <p className="mx-auto mt-3 max-w-[300px] text-center font-sans text-ui leading-relaxed text-paper/65">
            Thank you for keeping the lamps lit. Every Plus feature is yours,
            and the members’ layer comes with our gratitude.
          </p>
          <button type="button" onClick={onManage} className={cn(PREMIUM_GHOST, "mt-6 w-full")}>
            Manage subscription
          </button>
        </Foot>
      </Screen>
    );
  }

  // ── ready ───────────────────────────────────────────────────────────────
  return (
    <PaywallReadyView
      tier={tier}
      onTier={setTier}
      pkgs={pkgs}
      trials={trials}
      selected={selected}
      onSelect={setSelected}
      plusOwned={active === "plus"}
      busy={busy}
      note={note}
      onSubscribe={onSubscribe}
      onRestore={onRestore}
      onManage={onManage}
    />
  );
}

/**
 * The ready screen, drawn from what the store answered. Apart from the
 * loading so it can be drawn from known packages too (a design check), as
 * components/premium/PlanScreen.tsx's PlanView is.
 */
export function PaywallReadyView({
  tier,
  onTier,
  pkgs,
  trials,
  selected,
  onSelect,
  plusOwned,
  busy,
  note,
  onSubscribe,
  onRestore,
  onManage,
}: {
  tier: Tier;
  onTier: (t: Tier) => void;
  /** The tier's packages. */
  pkgs: PlusPackages;
  trials: Trials;
  selected: Plan;
  onSelect: (p: Plan) => void;
  plusOwned: boolean;
  busy: string | null;
  note: string | null;
  onSubscribe: () => void;
  onRestore: () => void;
  onManage: () => void;
}) {
  const saved = savingsPct(pkgs);
  const tierName = tier === "pro" ? "Purify Pro" : "Purify Plus";
  const tierAvailable = Boolean(pkgs.monthly || pkgs.yearly);
  const sellingThisTier = tierAvailable && !(tier === "plus" && plusOwned);
  const chosen = selected === "yearly" ? pkgs.yearly : pkgs.monthly;
  const yearlyTrial = trials[`${tier}-yearly`];
  const monthlyTrial = trials[`${tier}-monthly`];
  const trial = selected === "yearly" ? yearlyTrial : monthlyTrial;
  const per = selected === "yearly" ? "a year" : "a month";

  return (
    <Screen>
      <Hero tier={tier} />

      {/* Plus / Pro */}
      <div className="paywall-in mx-auto mt-5 w-full max-w-[520px] px-5" style={{ animationDelay: "260ms" }}>
        <TierSwitch tier={tier} onSwitch={onTier} />
      </div>
      <Included tier={tier} />

      {tier === "plus" && plusOwned ? (
        /* Already on Plus: nothing to sell on this tab, manage instead. */
        <Foot>
          <p className="text-center font-heading text-title-sm font-semibold text-paper">You have Purify Plus.</p>
          <p className="mx-auto mt-2 max-w-[300px] text-center font-sans text-ui leading-relaxed text-paper/65">
            Everything here is already yours. Purify Pro adds the members’
            layer on top.
          </p>
          <button type="button" onClick={onManage} className={cn(PREMIUM_GHOST, "mt-5 w-full")}>
            Manage subscription
          </button>
          <FooterRow onRestore={onRestore} busy={busy} />
        </Foot>
      ) : !sellingThisTier ? (
        /* This tier's packages aren't live (offering dark / store hiccup). */
        <Foot>
          <p className="mx-auto max-w-[320px] text-center font-sans text-ui leading-relaxed text-paper/65">
            {tierName} isn’t available to purchase right now. Please check back
            soon.
          </p>
          <FooterRow onRestore={onRestore} busy={busy} />
        </Foot>
      ) : (
        <Foot>
          {/* The two plans, side by side: the year first, with its trial when
              the store gives one, else what it saves. */}
          <div className="grid grid-cols-2 gap-2.5">
            <PlanTile
              label="Yearly"
              price={pkgs.yearly?.product.priceString}
              note={yearlyTrial && saved != null ? `a year, saves ${saved}%` : "a year"}
              chip={yearlyTrial ? `${yearlyTrial} free` : saved != null ? `Save ${saved}%` : undefined}
              selected={selected === "yearly"}
              disabled={!pkgs.yearly}
              onSelect={() => onSelect("yearly")}
            />
            <PlanTile
              label="Monthly"
              price={pkgs.monthly?.product.priceString}
              note="a month"
              chip={monthlyTrial ? `${monthlyTrial} free` : undefined}
              selected={selected === "monthly"}
              disabled={!pkgs.monthly}
              onSelect={() => onSelect("monthly")}
            />
          </div>

          {tier === "pro" && plusOwned ? (
            <p className="mt-4 text-center font-sans text-caption leading-relaxed text-paper/55">
              You have Plus today. After Pro starts, cancel Plus in {storeName()} so you aren’t billed for both.
            </p>
          ) : null}
          {note ? (
            <p role="alert" className="mt-4 text-center font-sans text-caption text-crimson-soft">
              {note}
            </p>
          ) : null}

          <button
            type="button"
            onClick={onSubscribe}
            disabled={!chosen || busy !== null}
            className={cn(PREMIUM_CTA, "mt-5 min-h-14 w-full text-lede")}
          >
            {busy === "buy" ? "Starting…" : trial ? `Start ${trial} free` : `Start ${tierName}`}
          </button>
          {/* What the button commits to, in the store's own price. */}
          {chosen?.product.priceString ? (
            <p className="mt-3 text-center font-sans text-caption leading-relaxed text-paper/50">
              {trial ? `Then ${chosen.product.priceString} ${per}.` : `${chosen.product.priceString} ${per}.`} Cancel anytime in {storeName()}.
            </p>
          ) : null}

          <FooterRow onRestore={onRestore} busy={busy} />
        </Foot>
      )}
    </Screen>
  );
}

/* ── layout pieces ───────────────────────────────────────────────────────── */

function Screen({ children }: { children: React.ReactNode }) {
  // No safe-pt here: the app layout's <main> already pads past the status
  // bar, and stacking a second inset opened a dead band above the hero
  // (owner report, 2026-07-12 screenshot).
  //
  // min-h-full, NOT min-h-[100dvh], and it is the same mistake one level down.
  // This renders inside <main class="flex-1 safe-pt safe-pb">, which on native
  // already reserves the status bar at the top and the tab bar plus home
  // indicator at the bottom. Demanding a full viewport INSIDE that padding
  // makes the page 100dvh plus roughly 150px, so the screen always scrolls and
  // the buy button is always below the fold, on every phone, no matter how
  // short the copy is. That is the primary call to action on the only screen
  // that asks anyone for money.
  //
  // `full` resolves against the padded content box instead, which is what
  // "fill the screen" actually means here. Where the parent has no definite
  // height it degrades to auto, which is harmless: the content is what sizes
  // the page, and nothing is pushed off it.
  //
  // A dark island: the screen is black on every palette, Parchment's too.
  return <div className="dark-island flex min-h-full flex-col bg-night text-paper">{children}</div>;
}

/** The screen's last part: the plans, the action, the small print. */
function Foot({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="paywall-in mx-auto mt-6 w-full max-w-[520px] px-5 pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)]"
      style={{ animationDelay: "420ms" }}
    >
      {children}
    </div>
  );
}

/**
 * The scribe, black and white, lit from above and falling into the page,
 * with the tier's name on him. The picture is held to a phone's width and
 * its sides fall away on a tablet, so it is never drawn larger than it is.
 */
function Hero({ tier }: { tier: Tier }) {
  const lede = tier === "pro" ? "Everything in Plus, and the members’ layer." : "Study the Scriptures more closely.";
  return (
    <div className="relative mx-auto h-[min(46svh,400px)] w-full max-w-[600px] overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element -- carried in the apps, served as it is. */}
      <img
        src="/premium/scribe.v1.webp"
        alt=""
        width={600}
        height={750}
        decoding="async"
        fetchPriority="high"
        className="paywall-glow-in absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: "50% 22%" }}
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(75% 55% at 50% 0%, rgba(255,255,255,0.16), rgba(255,255,255,0) 72%), linear-gradient(to bottom, rgb(16 16 19 / 0.45) 0%, rgb(16 16 19 / 0) 26%, rgb(16 16 19 / 0.35) 58%, var(--color-night) 100%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 hidden sm:block"
        style={{ background: "linear-gradient(to right, var(--color-night), transparent 16%, transparent 84%, var(--color-night))" }}
      />
      <div className="absolute inset-x-0 bottom-1.5 flex flex-col items-center px-6 text-center">
        <h1
          className="paywall-in text-display-sm font-semibold leading-[1.1] tracking-[-0.01em] text-paper [text-shadow:0_0_28px_rgba(255,255,255,0.28),0_2px_12px_rgba(0,0,0,0.6)]"
          style={{ animationDelay: "120ms" }}
        >
          Purify {tier === "pro" ? "Pro" : "Plus"}
        </h1>
        <p
          className="paywall-in mt-2 font-sans text-ui leading-relaxed text-paper/75 [text-shadow:0_1px_10px_rgba(0,0,0,0.7)]"
          style={{ animationDelay: "200ms" }}
        >
          {lede}
        </p>
      </div>
    </div>
  );
}

/** Plus and Pro: the chosen one white, as the action is. */
function TierSwitch({
  tier,
  onSwitch,
}: {
  tier: Tier;
  onSwitch: (t: Tier) => void;
}) {
  return (
    <div className="flex gap-1 rounded-pill bg-paper/[0.06] p-1">
      {(["plus", "pro"] as const).map((t) => {
        const on = tier === t;
        return (
          <button
            key={t}
            type="button"
            onClick={() => onSwitch(t)}
            aria-pressed={on}
            className={cn(
              "min-h-11 flex-1 rounded-pill px-4 text-center font-sans text-ui font-semibold transition-colors",
              on ? "bg-paper text-night" : "text-paper/60 hover:text-paper",
            )}
          >
            {t === "pro" ? "Pro" : "Plus"}
          </button>
        );
      })}
    </div>
  );
}

/**
 * What the tier opens, as small posters in a row, each of which opens to say
 * what it does (components/premium/FeatureShowcase.tsx). The rows come straight
 * from lib/premium/plans.ts (the single copy source shared with /pricing and
 * /premium), through getPremiumPlan(locale), never PREMIUM_PLAN_EN: the
 * direct import bypassed both the locale switch and the withdrawn-feature
 * filter, which is how this screen advertised a feature that answered 404 in
 * production on 2026-08-26 while /pricing beside it had already stopped.
 * Perks marked `soon` (Studio Audio) carry the coming-soon pill; every
 * unmarked poster is a REAL, live entitlement.
 */
function Included({ tier }: { tier: Tier }) {
  const { locale } = useTranslate();
  const plan = getPremiumPlan(locale);
  const items = tier === "pro" ? plan.proItems : plan.plusItems;
  const label = tier === "pro" ? "What Pro adds" : "What Plus opens";
  return (
    <section className="paywall-in mx-auto mt-6 w-full max-w-[600px] px-5" style={{ animationDelay: "340ms" }}>
      <p className="font-sans text-caption font-semibold text-paper/55">{label}</p>
      <FeatureShowcase items={items} soonLabel={plan.soonLabel} label={label} className="mt-2.5" />
      <p className="mt-3 font-sans text-caption leading-relaxed text-paper/45">
        {tier === "pro" ? plan.proNote : "Core Orthodox resources remain free. Plus is what pays the servers, and it keeps the core free for everyone."}
      </p>
    </section>
  );
}

/** Restore | Terms | Privacy, shared by every selling state. */
function FooterRow({
  onRestore,
  busy,
}: {
  onRestore: () => void;
  busy: string | null;
}) {
  return (
    <div className="mt-5 flex items-center justify-center gap-6 font-sans text-caption text-paper/55">
      <button
        type="button"
        onClick={onRestore}
        disabled={busy !== null}
        className="min-h-11 hover:text-paper disabled:opacity-50"
      >
        {busy === "restore" ? "Restoring…" : "Restore"}
      </button>
      <Link href="/terms" className="inline-flex min-h-11 items-center hover:text-paper">
        Terms
      </Link>
      <Link href="/privacy" className="inline-flex min-h-11 items-center hover:text-paper">
        Privacy
      </Link>
    </div>
  );
}

/** One plan: its name, its price as the store gives it, and what that buys. */
function PlanTile({
  label,
  price,
  note,
  chip,
  selected,
  disabled,
  onSelect,
}: {
  label: string;
  price?: string;
  note: string;
  chip?: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "relative flex min-h-[96px] flex-col gap-0.5 rounded-[16px] p-3.5 text-start transition-colors disabled:opacity-40",
        selected ? "border-[1.5px] border-paper bg-paper/[0.06]" : "border border-paper/15 hover:border-paper/30",
      )}
    >
      {chip ? (
        <span className="absolute -top-2.5 end-3 rounded-pill bg-paper px-2.5 py-0.5 font-sans text-[11.5px] font-semibold text-night">
          {chip}
        </span>
      ) : null}
      <span className="font-sans text-detail font-semibold text-paper/80">{label}</span>
      <span className="font-sans text-[22px] font-bold leading-tight tracking-[-0.01em] text-paper tabular-nums">
        {price ?? "Not available"}
      </span>
      <span className="font-sans text-caption text-paper/55">{note}</span>
    </button>
  );
}
