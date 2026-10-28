"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { DockNote, KeptHero, PlansDock, PlusFeatureRows, ScribePicture } from "@/components/billing/KeptPaywall";
import { PREMIUM_CTA } from "@/components/premium/PremiumUI";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { readLocalSessionUser } from "@/lib/supabase/localSession";
import { emitEntitlementsChanged } from "@/lib/entitlements/refresh";
import { useIsNative } from "@/lib/platform/native";
import { firstPlan, type Plan, type PlusOffers } from "@/lib/billing/offers";
import {
  billingAvailable,
  freeTrialPeriod,
  getPlusPackages,
  initBilling,
  nativeOffer,
  purchase,
  restore,
} from "@/lib/billing/revenuecat";
import {
  getWebPlusPackages,
  purchaseWebPlus,
  webBillingAvailable,
  webOffer,
} from "@/lib/billing/revenuecatWeb";

/**
 * The one upgrade surface that comes to the reader, rather than waiting to be
 * found.
 *
 * WHY IT EXISTS. Every Plus ask in the app before this was a place you had to
 * already be going: /pricing, /premium, or an inline card standing where a
 * feature would have been. A reader who tapped a locked palette was pushed out
 * of the reader and onto a pricing page, losing their place, and the page then
 * sold them the whole tier rather than the one thing they had just reached for.
 *
 * WHAT IT IS NOT. It is not an interruption. It opens only when a reader taps
 * something locked, or the Premium button, or immediately after a purchase
 * completes. Nothing here fires on a timer, on a page load, or on a scroll
 * depth, and there is no countdown, no scarcity, and no subscriber count. Those
 * would each need a fact the product does not have, and inventing one is a lie
 * told to somebody about to pay.
 *
 * WHY IT DOES NOT REIMPLEMENT CHECKOUT. /pricing carries a five-phase state
 * machine: signed out, unavailable, already subscribed, ready, and the Pro
 * cross-sell, plus restore and the manage-subscription link. Copying that here
 * would be a second source of truth for money, and this repo already has the
 * scar: PlusPaywall.tsx:526 imports PREMIUM_PLAN_EN directly and so bypasses
 * both the locale switch and the withdrawn-feature filter, which is how
 * /pricing advertised a 404ing feature in production on 2026-08-26.
 *
 * So this modal buys ONLY the happy path it can see for itself: signed in,
 * billing available, a package loaded, one product (Plus, in the plan the
 * reader picks). Every other state hands off to /pricing through the
 * secondary link, which is the real route and stays the real route
 * (lib/platform/useAndroidBack.ts:13 depends on that). Restoring a purchase
 * is the one thing it adds (1.8): the store's own answer, lit here.
 *
 * PRICE. Read from the store at open time, never from a literal. lib/premium/
 * plans.ts, the Terms of Service, the Play listing and the patch notes
 * currently disagree about what Plus costs, and docs/brand/voice.md:15 says
 * that when sources disagree you write no price at all. A store-supplied price
 * cannot disagree with the store.
 *
 * DRAWN (1.8) as the owner locked the paywall on 2026-10-27, round 10 R2
 * (components/billing/KeptPaywall.tsx): "Purify is kept by those it helps"
 * over the scribe, then every Plus feature in depth, the one the lock was
 * for first and lit in the words this sheet always had for it (its
 * headline, its body, what stays free), then the plans held at the bottom:
 * Yearly and Monthly, the billed price large and the month it comes to
 * small, the trial when the store grants it, the button, the small print,
 * Restore purchases (the apps), Terms and Privacy. The plan a reader picks
 * is the one bought; it was always the year before, with no choice shown.
 * "Not now" went with the redraw: the sheet's own close, a tap outside it,
 * a pull down and Back all still close it.
 */

/** Which lock the reader just met. Chooses which feature leads the sheet, lit, and its words; nothing else. */
export type UpgradeFeature =
  | "florilegium"
  | "palettes"
  | "history"
  | "sync"
  | "crossrefs"
  | "wordstudy"
  | "journal"
  | "plans"
  // The Community profile's Plus cosmetics: frames, effects, theme, banner.
  | "profile"
  // Remember a verse (1.7): the saved verses brought back until known.
  | "remember"
  // Ambience under the reading (1.7).
  | "ambience"
  // A book's readings saved on the phone to listen offline (1.8).
  | "offline"
  | "general";

/** `overPlayer`: the lock was met inside Now Playing or a sheet over it (the
 *  ambience sheet, 1.7), so the upgrade sheet stands over the player too. */
type OpenOptions = { overPlayer?: boolean };

type Ctx = { open: (feature: UpgradeFeature, opts?: OpenOptions) => void; available: boolean };

const UpgradeModalContext = createContext<Ctx | null>(null);

/**
 * Open the modal from any gate.
 *
 * Degrades rather than throwing when no provider is above it: the marketing
 * shell (app/page.tsx -> Navbar) renders PremiumNavCta outside the (app) group
 * where the provider is mounted, and a nav button that throws is worse than a
 * nav button that navigates.
 */
export function useUpgradeModal(): Ctx {
  const ctx = useContext(UpgradeModalContext);
  const router = useRouter();
  return useMemo(
    () =>
      ctx ?? {
        available: false,
        // A ROUTER PUSH, never `window.location.href`. The Android export is
        // trailingSlash:true, so the bundled file is /pricing/index.html; a raw
        // assignment to the bare string is unresolvable in the Capacitor shell,
        // which falls back to the root document and dumps the reader on Today.
        // Reported by a member on 2026-07-31, and the comment in
        // ReadingModeChips points at this line for the reason.
        open: () => router.push("/pricing"),
      },
    [ctx, router],
  );
}

/** `notFound`: a restore that found no subscription. Both it and `failed` leave the buttons live. */
type Phase = "pitch" | "buying" | "restoring" | "active" | "failed" | "notFound";

export function UpgradeModalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [feature, setFeature] = useState<UpgradeFeature | null>(null);
  const [overPlayer, setOverPlayer] = useState(false);
  const [phase, setPhase] = useState<Phase>("pitch");
  // What the store offers this reader, as it answered on open. Null until it
  // has, and while it is null no price is shown at all.
  const [offers, setOffers] = useState<PlusOffers | null>(null);
  const [plan, setPlan] = useState<Plan>("yearly");
  const [canBuyHere, setCanBuyHere] = useState(false);
  // The apps' store can look for a subscription bought before (a new phone, a
  // reinstall) once RevenueCat knows who is asking.
  const [canRestore, setCanRestore] = useState(false);
  // Which open the store's answer belongs to, so a slow answer to a sheet
  // already closed and opened again cannot land in the new one.
  const openSeq = useRef(0);
  const isNative = useIsNative();

  const close = useCallback(() => {
    setFeature(null);
    // Left until the next open so the exit animation does not show the pitch
    // flashing back in behind a fading confirmation.
    setPhase("pitch");
  }, []);

  const open = useCallback((next: UpgradeFeature, opts?: OpenOptions) => {
    const seq = ++openSeq.current;
    setFeature(next);
    setOverPlayer(Boolean(opts?.overPlayer));
    setPhase("pitch");
    setOffers(null);
    setPlan("yearly");
    setCanBuyHere(false);
    setCanRestore(false);

    // Prices and purchasability are resolved lazily, on open. Doing it at
    // mount would initialise RevenueCat on every page in the app for the large
    // majority of readers who never tap any of this.
    void (async () => {
      try {
        const user = readLocalSessionUser();
        if (!user) return;
        if (billingAvailable()) {
          if (!(await initBilling(user.id))) return;
          if (seq !== openSeq.current) return;
          setCanRestore(true);
          const pkgs = await getPlusPackages();
          // The store's own word on each trial, for this reader. Never throws.
          const [yearlyTrial, monthlyTrial] = await Promise.all([
            freeTrialPeriod(pkgs.yearly),
            freeTrialPeriod(pkgs.monthly),
          ]);
          const found: PlusOffers = {
            yearly: nativeOffer(pkgs.yearly, yearlyTrial, true),
            monthly: nativeOffer(pkgs.monthly, monthlyTrial, false),
          };
          const first = firstPlan(found);
          if (!first || seq !== openSeq.current) return;
          setOffers(found);
          setPlan(first);
          setCanBuyHere(true);
          return;
        }
        if (webBillingAvailable()) {
          // getWebPlusPackages configures the SDK and binds it to the uid.
          const pkgs = await getWebPlusPackages(user.id);
          const found: PlusOffers = {
            yearly: webOffer(pkgs.yearly, true),
            monthly: webOffer(pkgs.monthly, false),
          };
          const first = firstPlan(found);
          if (!first || seq !== openSeq.current) return;
          setOffers(found);
          setPlan(first);
          setCanBuyHere(true);
        }
      } catch (e) {
        // Silent: the modal still sells, it just sends them to /pricing.
        console.warn("[UpgradeModal] price lookup failed", e);
      }
    })();
  }, []);

  const ctx = useMemo<Ctx>(() => ({ open, available: true }), [open]);

  // The provider lives in the layout, so the sheet outlives a client-side route
  // change: open it, tap a tab bar item, and it rides along on top of a page it
  // has nothing to do with. Closing on pathname change is the whole fix.
  const pathname = usePathname();
  const firstPath = useRef(pathname);
  useEffect(() => {
    if (pathname === firstPath.current) return;
    firstPath.current = pathname;
    setFeature(null);
  }, [pathname]);

  const buy = useCallback(async () => {
    setPhase("buying");
    try {
      const user = readLocalSessionUser();
      if (!user) {
        setPhase("failed");
        return;
      }
      if (billingAvailable()) {
        const pkgs = await getPlusPackages();
        // The plan the reader chose in the dock, and only that one.
        const pkg = plan === "yearly" ? pkgs.yearly : pkgs.monthly;
        if (!pkg) {
          setPhase("failed");
          return;
        }
        const outcome = await purchase(pkg, "plus");
        // Every consumer resolved its entitlement once, on mount, and would
        // otherwise still be showing a lock behind this sheet.
        if (outcome === "active") emitEntitlementsChanged();
        // "cancelled" is the reader changing their mind, not an error. Putting
        // them back on the pitch is the honest response to it.
        setPhase(
          outcome === "active"
            ? "active"
            : outcome === "cancelled"
              ? "pitch"
              : "failed",
        );
        return;
      }
      const pkgs = await getWebPlusPackages(user.id);
      const pkg = plan === "yearly" ? pkgs.yearly : pkgs.monthly;
      if (!pkg) {
        setPhase("failed");
        return;
      }
      const outcome = await purchaseWebPlus(user.id, pkg);
      if (outcome === "active") emitEntitlementsChanged();
      setPhase(
        outcome === "active"
          ? "active"
          : outcome === "cancelled"
            ? "pitch"
            : "failed",
      );
    } catch (e) {
      console.error("[UpgradeModal] purchase failed", e);
      setPhase("failed");
    }
  }, [plan]);

  // Restore purchases (the apps): a subscription bought before, on another
  // phone or before a reinstall, found by the store and lit here. What it
  // finds is the store's answer, so a restore is never a purchase.
  const restorePurchases = useCallback(async () => {
    setPhase("restoring");
    try {
      if (await restore()) {
        emitEntitlementsChanged();
        setPhase("active");
      } else {
        setPhase("notFound");
      }
    } catch (e) {
      console.error("[UpgradeModal] restore failed", e);
      setPhase("notFound");
    }
  }, []);

  return (
    <UpgradeModalContext.Provider value={ctx}>
      {children}
      <UpgradeSheet
        feature={feature}
        overPlayer={overPlayer}
        phase={phase}
        offers={offers}
        plan={plan}
        onPlan={setPlan}
        canBuyHere={canBuyHere}
        canRestore={isNative && canRestore}
        isNative={isNative}
        onBuy={buy}
        onRestore={restorePurchases}
        onClose={close}
      />
    </UpgradeModalContext.Provider>
  );
}

/** The Plus tools a new subscriber is shown the way to, in the order of
 *  the Plus list (lib/premium/plans.ts). */
const UNLOCKED: { key: string; href: string }[] = [
  { key: "plus.active.crossrefs", href: "/bible/john/1" },
  { key: "plus.active.wordstudy", href: "/bible/genesis/1" },
  { key: "plus.active.journal", href: "/journal" },
  { key: "plus.active.plans", href: "/plans" },
  { key: "plus.active.modes", href: "/bible/john/1" },
  { key: "plus.active.florilegium", href: "/florilegium" },
];

/**
 * The sheet itself, as the owner locked the paywall (1.8, round 10 R2):
 * "Purify is kept by those it helps" over the scribe of St Prochorus's icon,
 * then every Plus feature in depth with the one this lock was for first and
 * lit, then the plans and the action held at the bottom of the sheet while
 * the features scroll under them (components/billing/KeptPaywall.tsx). The
 * sheet's own title bar names Purify Plus and closes it. No gold and no star.
 */
function UpgradeSheet({
  feature,
  overPlayer,
  phase,
  offers,
  plan,
  onPlan,
  canBuyHere,
  canRestore,
  isNative,
  onBuy,
  onRestore,
  onClose,
}: {
  feature: UpgradeFeature | null;
  overPlayer: boolean;
  phase: Phase;
  offers: PlusOffers | null;
  plan: Plan;
  onPlan: (p: Plan) => void;
  canBuyHere: boolean;
  canRestore: boolean;
  isNative: boolean;
  onBuy: () => void;
  onRestore: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslate();
  const done = phase === "active";

  return (
    <Sheet
      open={feature !== null}
      onClose={onClose}
      title={t("plus.sheet.title")}
      desktop
      openFull
      layer={overPlayer ? "over-player" : undefined}
      // No padding under the body: the plans stand on its bottom edge.
      bodyClassName={done ? "px-5 pb-6 pt-1" : "px-5 pt-1 !pb-0"}
    >
      {done ? (
        <>
          {/* The scribe at his first words, as the sheet has always opened. */}
          <ScribePicture className="-mx-5 h-[148px]" focus="50% 97%" />
          <h2 className="mt-1 text-title-sm font-semibold leading-tight text-paper md:text-title">
            {t("plus.active.title")}
          </h2>
          <p className="mt-3 font-sans text-ui leading-[1.65] text-paper/75">
            {t("plus.active.body")}
          </p>
          {/* What was just unlocked, each a way straight to it, so nobody
              pays and forgets what for (2026-09-30). */}
          <p className="mt-5 font-sans text-detail font-semibold text-paper">{t("plus.active.unlocked")}</p>
          <ul className="mt-2 divide-y divide-paper/10 border-y border-paper/10">
            {UNLOCKED.map((u) => (
              <li key={u.key}>
                <Link
                  href={u.href}
                  onClick={onClose}
                  className="flex min-h-11 items-center justify-between gap-3 py-2 font-sans text-ui text-paper/85 transition-colors hover:text-paper"
                >
                  {t(u.key)}
                  <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-paper/45">
                    <path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>
          <button type="button" onClick={onClose} className={cn(PREMIUM_CTA, "mt-6 w-full")}>
            {t("plus.active.back")}
          </button>
        </>
      ) : (
        <>
          {/* Kept by those it helps: the scribe, the headline and the app's
              own line, plus.footer, which used to close the sheet. */}
          <KeptHero place="sheet" />

          {/* The features working, in depth: the one this lock was for
              first, lit, with what stays free beside it. */}
          <PlusFeatureRows lead={feature} className="mt-4" />

          {/* The plans, held at the bottom while the features scroll. The
              price is whatever the store just said; when the store did not
              answer, no price is shown at all rather than a remembered one,
              and the action goes to /pricing. The store's small print
              (plus.billedThroughStore) stands in the apps whatever happens,
              as it always has. */}
          <PlansDock
            className="sticky bottom-0 z-10 -mx-5 mt-5 pb-1"
            offers={canBuyHere ? offers : null}
            plan={plan}
            onPlan={onPlan}
            place={isNative ? "store" : "web"}
            busy={phase === "buying" ? "buy" : phase === "restoring" ? "restore" : null}
            note={
              phase === "failed" ? (
                <DockNote>{t("plus.failed")}</DockNote>
              ) : phase === "notFound" ? (
                <DockNote>{t("plus.restoreNone")}</DockNote>
              ) : null
            }
            onBuy={onBuy}
            href={canBuyHere ? undefined : "/pricing"}
            onRestore={canRestore ? onRestore : undefined}
            onNavigate={onClose}
            more={
              // Pro and the full page, beside a buy button only: without one
              // the action itself already goes to /pricing.
              canBuyHere ? (
                <Link href="/pricing" onClick={onClose} className="inline-flex min-h-11 items-center transition-colors hover:text-paper">
                  {t("plus.seeAllPlans")}
                </Link>
              ) : null
            }
          />
        </>
      )}
    </Sheet>
  );
}
