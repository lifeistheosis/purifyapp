"use client";

// Native-only Purify premium paywall: a fully custom UI driving RevenueCat
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
// (package.product.priceString, and pricePerMonthString for what a year comes
// to a month), so changing a price in the store consoles flows through with
// no code change, and so does a free trial: the screen says "7 days free"
// only when the store says this reader may have it (lib/billing/revenuecat.ts,
// freeTrialPeriod).
//
// DRAWN (1.8) as the owner locked the Plus paywall on 2026-10-27, round 10
// refined as R2 (boards/purify-master/variants/10b-paywall.png): "Purify is
// kept by those it helps" over the young scribe of St Prochorus's icon, then
// the features in depth as you scroll, each with a small working picture,
// then the plans and the button held at the bottom the whole time, the billed
// price the big number and what it comes to a month the small one
// (components/billing/KeptPaywall.tsx, shared with the upgrade sheet). Before
// it (1.7.2, his pick B) the features stood as posters in a row and the two
// plans side by side. No gold, no star: the screen is dark on every palette
// (a dark island), as the paywall always was. The picture is carried in the
// apps (public/premium); it is the reading room's cover of St Prochorus made
// black and white (docs/licensing/COVER_ICONS.md).

import { useCallback, useEffect, useState, type CSSProperties } from "react";
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
  freeTrialPeriod,
  nativeOffer,
  type PlusPackages,
} from "@/lib/billing/revenuecat";
import { presentCustomerCenter } from "@/lib/billing/revenuecatUi";
import { createClient } from "@/lib/supabase/client";
import { nativePlatform, useIsNative } from "@/lib/platform/native";
import { getPremiumPlan, type PlanFeature } from "@/lib/premium/plans";
import { NO_OFFERS, firstPlan, type Plan, type PlusOffers } from "@/lib/billing/offers";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { DockNote, FeatureRow, KeptHero, PlansDock, PlusFeatureRows } from "@/components/billing/KeptPaywall";
import { PREMIUM_CTA, PREMIUM_GHOST } from "@/components/premium/PremiumUI";
import { cn } from "@/lib/cn";

type Phase = "loading" | "signed-out" | "unavailable" | "ready" | "subscribed";
export type Tier = "plus" | "pro";

/** A message in the dock, said in the reader's language where it has one. */
type Note = "failed" | "restoreNone" | "restoreError";

const NO_PACKAGES: PlusPackages = { monthly: null, yearly: null };

/** A tier's two plans as the store offers them to this reader: its prices, the month a year comes to, its trials. */
async function offersFor(pkgs: PlusPackages): Promise<PlusOffers> {
  // The store's own word on each trial, for this reader. Never throws.
  const [yearlyTrial, monthlyTrial] = await Promise.all([
    freeTrialPeriod(pkgs.yearly),
    freeTrialPeriod(pkgs.monthly),
  ]);
  return {
    yearly: nativeOffer(pkgs.yearly, yearlyTrial, true),
    monthly: nativeOffer(pkgs.monthly, monthlyTrial, false),
  };
}

/** The store the charge comes from, as a sentence names it. */
function storeName(): string {
  return nativePlatform() === "ios" ? "the App Store" : "Google Play";
}

/**
 * Where the held plans stop: on the tab bar, and on the player when one is
 * up, never under either (app/globals.css, --tab-bar-h and --now-playing-h).
 */
const DOCK_BOTTOM: CSSProperties = {
  bottom: "calc(var(--inset-bottom, 0px) + var(--tab-bar-h, 0px) + var(--now-playing-h, 0px))",
};

export function PlusPaywall() {
  const isNative = useIsNative();
  const { t } = useTranslate();

  const [phase, setPhase] = useState<Phase>("loading");
  const [tier, setTier] = useState<Tier>("plus");
  // What the account already has. `pro` short-circuits to the subscribed
  // screen; `plus` keeps the paywall up so Pro stays one tap away.
  const [active, setActive] = useState<"none" | "plus">("none");
  const [plusPkgs, setPlusPkgs] = useState<PlusPackages>(NO_PACKAGES);
  const [proPkgs, setProPkgs] = useState<PlusPackages>(NO_PACKAGES);
  const [plusOffers, setPlusOffers] = useState<PlusOffers>(NO_OFFERS);
  const [proOffers, setProOffers] = useState<PlusOffers>(NO_OFFERS);
  const [selected, setSelected] = useState<Plan>("yearly");
  const [busy, setBusy] = useState<"buy" | "restore" | null>(null);
  const [note, setNote] = useState<Note | null>(null);

  const load = useCallback(async () => {
    // Any failure in the RevenueCat/plugin chain must degrade to the calm
    // "unavailable" state, never throw uncaught (an unhandled error here
    // white-screened the WebView: the "Purify Plus crashes" report).
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
      const [plusO, proO] = await Promise.all([offersFor(plus), offersFor(pro)]);
      setPlusOffers(plusO);
      setProOffers(proO);
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
  const offers = tier === "pro" ? proOffers : plusOffers;

  const onTier = useCallback(
    (next: Tier) => {
      setTier(next);
      setNote(null);
      // Stay on the same plan across the switch when the other tier has it.
      const theirs = next === "pro" ? proOffers : plusOffers;
      if (!theirs[selected]) setSelected(firstPlan(theirs) ?? selected);
    },
    [proOffers, plusOffers, selected],
  );

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
        setNote("failed");
      }
    } catch (e) {
      console.error("[PlusPaywall] purchase failed:", e);
      setNote("failed");
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
      else setNote("restoreNone");
    } catch (e) {
      console.error("[PlusPaywall] restore failed:", e);
      setNote("restoreError");
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
        <KeptHero place="screen" eyebrow={t("plus.sheet.title")} heading="h1" />
        {/* The same features the ready phase shows, so the screen sells the
            thing before asking for a sign-in. */}
        <section className="mx-auto mt-5 w-full max-w-[520px] px-5">
          <PlusFeatureRows />
        </section>
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
        <KeptHero place="screen" eyebrow={t("plus.sheet.title")} heading="h1" />
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
        <KeptHero place="screen" eyebrow={t("profile.badge.pro")} heading="h1" />
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
      onTier={onTier}
      offers={offers}
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
 * loading so it can be drawn from known offers too (a design check), as
 * components/premium/PlanScreen.tsx's PlanView is.
 */
export function PaywallReadyView({
  tier,
  onTier,
  offers,
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
  /** The tier's plans, as the store offers them to this reader. */
  offers: PlusOffers;
  selected: Plan;
  onSelect: (p: Plan) => void;
  plusOwned: boolean;
  busy: "buy" | "restore" | null;
  note: Note | null;
  onSubscribe: () => void;
  onRestore: () => void;
  onManage: () => void;
}) {
  const { t, locale } = useTranslate();
  const plan = getPremiumPlan(locale);
  const tierName = tier === "pro" ? plan.proTitle : plan.plusTitle;
  const tierAvailable = Boolean(offers.monthly || offers.yearly);
  const sellingThisTier = tierAvailable && !(tier === "plus" && plusOwned);
  const message =
    note === "failed"
      ? t("plus.failed")
      : note === "restoreNone"
        ? t("plus.restoreNone")
        : note === "restoreError"
          ? "Couldn’t check for a previous subscription. Please try again."
          : null;

  return (
    <Screen>
      <KeptHero place="screen" eyebrow={tierName} heading="h1" />

      {/* Plus / Pro */}
      <div className="paywall-in mx-auto mt-5 w-full max-w-[520px] px-5" style={{ animationDelay: "260ms" }}>
        <TierSwitch tier={tier} onSwitch={onTier} />
      </div>

      {/* The features working, in depth. Plus in the app's own words, in
          every language; Pro from the plan's list, with the terms of the
          EIKON Box under it, as before. */}
      <section className="mx-auto mt-4 w-full max-w-[520px] px-5">
        {tier === "pro" ? (
          <ProRows items={plan.proItems} soonLabel={plan.soonLabel} terms={plan.proNote} />
        ) : (
          <PlusFeatureRows />
        )}
      </section>

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
          {message ? <DockNote>{message}</DockNote> : null}
          <FooterRow onRestore={onRestore} busy={busy} />
        </Foot>
      ) : !sellingThisTier ? (
        /* This tier's packages aren't live (offering dark / store hiccup). */
        <Foot>
          <p className="mx-auto max-w-[320px] text-center font-sans text-ui leading-relaxed text-paper/65">
            {tierName} isn’t available to purchase right now. Please check back
            soon.
          </p>
          {message ? <DockNote>{message}</DockNote> : null}
          <FooterRow onRestore={onRestore} busy={busy} />
        </Foot>
      ) : (
        /* The plans, the action and the small print, held at the bottom the
           whole time the features scroll. */
        <PlansDock
          className="paywall-in sticky z-10 mt-6 pb-2"
          style={{ ...DOCK_BOTTOM, animationDelay: "420ms" }}
          offers={offers}
          plan={selected}
          onPlan={onSelect}
          tier={tier}
          place="store"
          busy={busy}
          note={
            <>
              {tier === "pro" && plusOwned ? (
                <p className="mt-3 text-center font-sans text-caption leading-relaxed text-paper/55">
                  You have Plus today. After Pro starts, cancel Plus in {storeName()} so you aren’t billed for both.
                </p>
              ) : null}
              {message ? <DockNote>{message}</DockNote> : null}
            </>
          }
          onBuy={onSubscribe}
          onRestore={onRestore}
        />
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
  // the page, and nothing is pushed off it. Since 1.8 the action is held at
  // the bottom besides (the plans dock is sticky), so it is in view however
  // far the features go.
  //
  // A dark island: the screen is black on every palette, Parchment's too.
  return <div className="dark-island flex min-h-full flex-col bg-night text-paper">{children}</div>;
}

/** The screen's last part where nothing is sold: a word, the way to manage, the small print. */
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

/** Plus and Pro: the chosen one white, softly lit, as the chosen plan is. */
function TierSwitch({
  tier,
  onSwitch,
}: {
  tier: Tier;
  onSwitch: (t: Tier) => void;
}) {
  const { t } = useTranslate();
  return (
    <div className="flex gap-1 rounded-pill bg-paper/[0.06] p-1">
      {(["plus", "pro"] as const).map((x) => {
        const on = tier === x;
        return (
          <button
            key={x}
            type="button"
            onClick={() => onSwitch(x)}
            aria-pressed={on}
            className={cn(
              "paywall-choice min-h-11 flex-1 rounded-pill px-4 text-center font-sans text-ui font-semibold",
              on ? "bg-paper text-night shadow-[0_0_18px_-4px_rgba(255,255,255,0.55)]" : "text-paper/60 hover:text-paper",
            )}
          >
            {x === "pro" ? t("nav.proPill") : t("nav.plusPill")}
          </button>
        );
      })}
    </div>
  );
}

/**
 * What Pro adds, in depth like the Plus features, from lib/premium/plans.ts
 * through getPremiumPlan(locale), never PREMIUM_PLAN_EN (the direct import
 * bypassed both the locale switch and the withdrawn-feature filter, which is
 * how this screen advertised a feature that answered 404 in production on
 * 2026-08-26). Perks marked `soon` (Studio Audio) carry the coming-soon pill;
 * every unmarked row is a REAL, live entitlement. The EIKON Box's terms stand
 * under them, as they always have.
 */
function ProRows({ items, soonLabel, terms }: { items: PlanFeature[]; soonLabel: string; terms: string }) {
  return (
    <>
      <ul className="flex flex-col gap-2.5">
        {items.map((item, i) => (
          <FeatureRow key={item.id} index={i} id={item.id} name={item.title} body={item.sub} soon={item.soon ? soonLabel : undefined} />
        ))}
      </ul>
      <p className="mt-3 font-sans text-caption leading-relaxed text-paper/45">{terms}</p>
    </>
  );
}

/** Restore purchases | Terms | Privacy, where nothing is sold on the tab. */
function FooterRow({
  onRestore,
  busy,
}: {
  onRestore: () => void;
  busy: "buy" | "restore" | null;
}) {
  const { t } = useTranslate();
  return (
    <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 font-sans text-caption text-paper/55">
      <button
        type="button"
        onClick={onRestore}
        disabled={busy !== null}
        className="min-h-11 hover:text-paper disabled:opacity-50"
      >
        {busy === "restore" ? t("plus.restoring") : t("plus.restore")}
      </button>
      <Link href="/terms" className="inline-flex min-h-11 items-center hover:text-paper">
        {t("shop.terms")}
      </Link>
      <Link href="/privacy" className="inline-flex min-h-11 items-center hover:text-paper">
        {t("footer.privacy")}
      </Link>
    </div>
  );
}
