"use client";

// Native-only Purify premium paywall: a fully custom UI driving RevenueCat
// (Play Billing and StoreKit). Returns null on the web. Inside the apps the
// pricing route renders this full-screen. The website's /pricing draws the
// same screen from the pieces exported below, driven by its own web billing
// (components/billing/WebPaywall.tsx).
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
//
// The owner's second round (2026-10-28, "add every single thing we left
// out"): every line on this screen in the reader's language, the states
// around the ready one too (signed out, unavailable, subscribed) and the Pro
// rows with the EIKON Box's terms (lib/premium/plusRows.ts, PRO_ROWS); the
// stores' own reviews between the features and the plans; and the renewal
// said plainly wherever the screen sells.

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
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
import { NO_OFFERS, firstPlan, type Plan, type PlusOffers } from "@/lib/billing/offers";
import { PRO_ROWS, PRO_TERMS, SOON_LABEL } from "@/lib/premium/plusRows";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import {
  DockNote,
  FeatureRow,
  KeptHero,
  PlansDock,
  PlusFeatureRows,
  PlusReviews,
  type BuyPlace,
} from "@/components/billing/KeptPaywall";
import { PlusTryHead, PlusTryPage, usePlusTry, type PlusTry } from "@/components/billing/PlusTry";
import { PREMIUM_CTA, PREMIUM_GHOST } from "@/components/premium/PremiumUI";
import { cn } from "@/lib/cn";
import { useAndroidBack } from "@/lib/platform/useAndroidBack";

type Phase = "loading" | "signed-out" | "unavailable" | "ready" | "subscribed";
export type Tier = "plus" | "pro";

/** A message in the dock, said in the reader's language. */
export type Note = "failed" | "restoreNone" | "restoreError";

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

/** Is the App Store the one billing this reader? Otherwise it is Google Play. */
function onAppStore(): boolean {
  return nativePlatform() === "ios";
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

  // Web renders nothing; the website draws its own (WebPaywall.tsx).
  if (!isNative || phase === "loading") return null;

  if (phase === "signed-out") {
    return <SignedOutScreen />;
  }

  if (phase === "unavailable") {
    return (
      <PaywallScreen>
        <KeptHero place="screen" eyebrow={t("plus.sheet.title")} heading="h1" />
        <PaywallFoot>
          <p className="mx-auto max-w-[320px] text-center font-sans text-ui leading-relaxed text-paper/65">
            {t("plus.screen.unavailable")}
          </p>
        </PaywallFoot>
      </PaywallScreen>
    );
  }

  if (phase === "subscribed") {
    return (
      <PaywallScreen>
        <KeptHero place="screen" eyebrow={t("profile.badge.pro")} heading="h1" />
        <ProOwnedFoot onManage={onManage} />
      </PaywallScreen>
    );
  }

  // ── ready ───────────────────────────────────────────────────────────────
  return (
    <PaywallReadyView
      place="store"
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
 * The screen with Plus and Pro side by side: the scribe and why, the switch,
 * the tier's features in depth (with the supporters' promise under Plus on
 * the website, where /pricing has always carried it), and what readers say.
 * `children` stands at the bottom: the plans, or a word where nothing is
 * sold. The apps' ready screen and every state of the website's /pricing
 * draw it.
 */
export function TierScreen({
  tier,
  onTier,
  place,
  children,
}: {
  tier: Tier;
  onTier: (t: Tier) => void;
  place: BuyPlace;
  children: ReactNode;
}) {
  const { t } = useTranslate();
  const list = useRef<HTMLElement>(null);
  const tryer = usePlusTry(null, list);
  useAndroidBack(tryer.row !== null, tryer.back);

  // A Plus feature being tried (r3-07 A): its screen in place of the list,
  // the plans still held at the foot.
  if (tier === "plus" && tryer.row) {
    return (
      <PaywallScreen>
        <TryingOnScreen tryer={tryer} />
        {children}
      </PaywallScreen>
    );
  }

  return (
    <PaywallScreen>
      <KeptHero place="screen" eyebrow={t(tier === "pro" ? "profile.badge.pro" : "plus.sheet.title")} heading="h1" />

      {/* Plus / Pro */}
      <div className="paywall-in mx-auto mt-5 w-full max-w-[520px] px-5" style={{ animationDelay: "260ms" }}>
        <TierSwitch tier={tier} onSwitch={onTier} />
      </div>

      {/* The features working, in depth. Plus in the app's own words, each
          ending in Try it; Pro with the terms of the EIKON Box under it, as
          before; every word in the reader's language. Then what readers say,
          before the plans. */}
      <section ref={list} className="mx-auto mt-4 w-full max-w-[520px] px-5">
        {tier === "pro" ? <ProRows /> : <PlusFeatureRows onTry={tryer.start} />}
        {tier === "plus" && place === "web" ? (
          <p className="mt-3 font-sans text-caption leading-[1.5] text-paper/45">{t("plus.promise.supporters")}</p>
        ) : null}
        <PlusReviews className="mt-6" />
      </section>

      {children}
    </PaywallScreen>
  );
}

/** The apps' screen signed out: the features to try, what readers say, then the way to sign in. */
function SignedOutScreen() {
  const { t } = useTranslate();
  const list = useRef<HTMLElement>(null);
  const tryer = usePlusTry(null, list);
  useAndroidBack(tryer.row !== null, tryer.back);
  return (
    <PaywallScreen>
      {tryer.row ? (
        <TryingOnScreen tryer={tryer} />
      ) : (
        <>
          <KeptHero place="screen" eyebrow={t("plus.sheet.title")} heading="h1" />
          {/* The same features the ready phase shows, and what readers say,
              so the screen sells the thing before asking for a sign-in. */}
          <section ref={list} className="mx-auto mt-5 w-full max-w-[520px] px-5">
            <PlusFeatureRows onTry={tryer.start} />
            <PlusReviews className="mt-6" />
          </section>
        </>
      )}
      <SignedOutFoot place="store" />
    </PaywallScreen>
  );
}

/** A feature tried on the full screen: its title bar (no close: the screen is the page), then its screen. */
function TryingOnScreen({ tryer }: { tryer: PlusTry }) {
  const { t } = useTranslate();
  if (!tryer.row) return null;
  return (
    <div className="mx-auto w-full max-w-[520px] px-5 pt-2">
      <PlusTryPage
        row={tryer.row}
        next={tryer.next}
        onNext={tryer.start}
        head={<PlusTryHead name={t(tryer.row.name)} onBack={tryer.back} />}
      />
    </div>
  );
}

type ReadyProps = {
  /** Who bills: the app's store, or the website's checkout (no restore there). */
  place?: BuyPlace;
  tier: Tier;
  /** The tier's plans, as the store offers them to this reader. */
  offers: PlusOffers;
  selected: Plan;
  onSelect: (p: Plan) => void;
  plusOwned: boolean;
  busy: "buy" | "restore" | null;
  note: Note | null;
  onSubscribe: () => void;
  /** Restore purchases, where the store can (the apps). */
  onRestore?: () => void;
  onManage: () => void;
};

/**
 * The ready screen, drawn from what the store answered. Apart from the
 * loading so it can be drawn from known offers too (a design check), as
 * components/premium/PlanScreen.tsx's PlanView is.
 */
export function PaywallReadyView({ onTier, ...ready }: ReadyProps & { onTier: (t: Tier) => void }) {
  return (
    <TierScreen tier={ready.tier} onTier={onTier} place={ready.place ?? "store"}>
      <ReadyBottom {...ready} />
    </TierScreen>
  );
}

/**
 * What stands at the bottom once the store has answered: the plans, the
 * action and the small print, held there while the features scroll; or, on
 * a tab with nothing to sell, a word and the way on.
 */
export function ReadyBottom({
  place = "store",
  tier,
  offers,
  selected,
  onSelect,
  plusOwned,
  busy,
  note,
  onSubscribe,
  onRestore,
  onManage,
}: ReadyProps) {
  const { t } = useTranslate();
  const tierName = t(tier === "pro" ? "profile.badge.pro" : "plus.sheet.title");
  const tierAvailable = Boolean(offers.monthly || offers.yearly);
  const sellingThisTier = tierAvailable && !(tier === "plus" && plusOwned);
  const message =
    note === "failed"
      ? t("plus.failed")
      : note === "restoreNone"
        ? t("plus.restoreNone")
        : note === "restoreError"
          ? t("plus.screen.restoreError")
          : null;
  // Where Plus is cancelled, so a reader who takes Pro is not billed twice.
  const both = t(
    place === "web" ? "plus.screen.bothWeb" : onAppStore() ? "plus.screen.bothApple" : "plus.screen.bothGoogle",
  );

  if (tier === "plus" && plusOwned) {
    // Already on Plus: nothing to sell on this tab, manage instead.
    return <PlusOwnedFoot onManage={onManage} onRestore={onRestore} busy={busy} message={message} />;
  }

  if (!sellingThisTier) {
    // This tier's packages aren't live (offering dark / store hiccup).
    return (
      <PaywallFoot>
        <p className="mx-auto max-w-[320px] text-center font-sans text-ui leading-relaxed text-paper/65">
          {t("plus.screen.tierUnavailable", { tier: tierName })}
        </p>
        {message ? <DockNote>{message}</DockNote> : null}
        <FooterRow onRestore={onRestore} busy={busy} />
      </PaywallFoot>
    );
  }

  // The plans, the action and the small print, held at the bottom the whole
  // time the features scroll.
  return (
    <PlansDock
      className="paywall-in sticky z-10 mt-6 pb-2"
      style={{ ...DOCK_BOTTOM, animationDelay: "420ms" }}
      offers={offers}
      plan={selected}
      onPlan={onSelect}
      tier={tier}
      place={place}
      busy={busy}
      note={
        <>
          {tier === "pro" && plusOwned ? (
            <p className="mt-3 text-center font-sans text-caption leading-relaxed text-paper/55">{both}</p>
          ) : null}
          {message ? <DockNote>{message}</DockNote> : null}
        </>
      }
      onBuy={onSubscribe}
      onRestore={onRestore}
    />
  );
}

/* ── layout pieces ───────────────────────────────────────────────────────── */

/** The whole screen: black on every palette. */
export function PaywallScreen({ children }: { children: ReactNode }) {
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
export function PaywallFoot({ children }: { children: ReactNode }) {
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
 * The small print where nothing is priced yet: that it renews until
 * cancelled, then who bills it and that it can be cancelled any time, in the
 * words this place has always used (the store by name in the apps).
 */
export function BilledLine({ place }: { place: BuyPlace }) {
  const { t } = useTranslate();
  const billed =
    place === "web"
      ? t("plus.billedOnWeb")
      : t(onAppStore() ? "plus.screen.billedApple" : "plus.screen.billedGoogle");
  return <p className="mt-3 text-center font-sans text-caption text-paper/50">{`${t("plus.fine.renews")} ${billed}`}</p>;
}

/** Signed out: Plus and Pro follow the account, so the way on is to sign in. */
export function SignedOutFoot({ place }: { place: BuyPlace }) {
  const { t } = useTranslate();
  return (
    <PaywallFoot>
      <p className="mx-auto max-w-[320px] text-center font-sans text-ui leading-relaxed text-paper/70">
        {t("plus.screen.signedOut")}
      </p>
      <Link href="/signin?next=/pricing" className={cn(PREMIUM_CTA, "mt-5 min-h-14 w-full text-lede")}>
        {t("plus.screen.signIn")}
      </Link>
      <BilledLine place={place} />
    </PaywallFoot>
  );
}

/** Plus is already theirs: nothing to sell on the Plus tab, the way to manage it instead. */
export function PlusOwnedFoot({
  onManage,
  onRestore,
  busy,
  message,
}: {
  onManage: () => void;
  onRestore?: () => void;
  busy: "buy" | "restore" | null;
  message?: string | null;
}) {
  const { t } = useTranslate();
  return (
    <PaywallFoot>
      <p className="text-center font-heading text-title-sm font-semibold text-paper">{t("plus.screen.plusTitle")}</p>
      <p className="mx-auto mt-2 max-w-[300px] text-center font-sans text-ui leading-relaxed text-paper/65">
        {t("plus.screen.plusBody")}
      </p>
      <button type="button" onClick={onManage} className={cn(PREMIUM_GHOST, "mt-5 w-full")}>
        {t("ui.manageSubscription")}
      </button>
      {message ? <DockNote>{message}</DockNote> : null}
      <FooterRow onRestore={onRestore} busy={busy} />
    </PaywallFoot>
  );
}

/** Pro is the top tier: nothing left to sell, only thanks and the way to manage it. */
export function ProOwnedFoot({ onManage }: { onManage: () => void }) {
  const { t } = useTranslate();
  return (
    <PaywallFoot>
      <p className="text-center font-heading text-title font-semibold text-paper">{t("plus.screen.proTitle")}</p>
      <p className="mx-auto mt-3 max-w-[300px] text-center font-sans text-ui leading-relaxed text-paper/65">
        {t("plus.screen.proBody")}
      </p>
      <button type="button" onClick={onManage} className={cn(PREMIUM_GHOST, "mt-6 w-full")}>
        {t("ui.manageSubscription")}
      </button>
    </PaywallFoot>
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
 * What Pro adds, in depth like the Plus features, in the reader's language
 * (lib/premium/plusRows.ts, PRO_ROWS: the plan's own rows, held to
 * lib/premium/plans.ts by a test). Perks marked `soon` (Studio Audio) carry
 * the coming-soon pill; every unmarked row is a REAL, live entitlement. The
 * EIKON Box's terms stand under them, as they always have.
 */
function ProRows() {
  const { t } = useTranslate();
  return (
    <>
      <ul className="flex flex-col gap-2.5" aria-label={t("profile.badge.pro")}>
        {PRO_ROWS.map((row) => (
          <FeatureRow
            key={row.id}
            id={row.id}
            name={t(row.name)}
            body={t(row.body)}
            soon={row.soon ? t(SOON_LABEL) : undefined}
          />
        ))}
      </ul>
      <p className="mt-3 font-sans text-caption leading-relaxed text-paper/45">{t(PRO_TERMS)}</p>
    </>
  );
}

/** Restore purchases (where the store can) | Terms | Privacy, where nothing is sold on the tab. */
export function FooterRow({
  onRestore,
  busy,
}: {
  onRestore?: () => void;
  busy: "buy" | "restore" | null;
}) {
  const { t } = useTranslate();
  return (
    <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 font-sans text-caption text-paper/55">
      {onRestore ? (
        <button
          type="button"
          onClick={onRestore}
          disabled={busy !== null}
          className="min-h-11 hover:text-paper disabled:opacity-50"
        >
          {busy === "restore" ? t("plus.restoring") : t("plus.restore")}
        </button>
      ) : null}
      <Link href="/terms" className="inline-flex min-h-11 items-center hover:text-paper">
        {t("shop.terms")}
      </Link>
      <Link href="/privacy" className="inline-flex min-h-11 items-center hover:text-paper">
        {t("footer.privacy")}
      </Link>
    </div>
  );
}
