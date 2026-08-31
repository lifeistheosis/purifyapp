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

import { Sheet } from "@/components/ui/Sheet";
import { useTranslate } from "@/components/i18n/MessagesProvider";
import { readLocalSessionUser } from "@/lib/supabase/localSession";
import { emitEntitlementsChanged } from "@/lib/entitlements/refresh";
import { useIsNative } from "@/lib/platform/native";
import {
  billingAvailable,
  getPlusPackages,
  initBilling,
  purchase,
} from "@/lib/billing/revenuecat";
import {
  getWebPlusPackages,
  packagePrice,
  purchaseWebPlus,
  webBillingAvailable,
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
 * billing available, a package loaded, one product. Every other state hands off
 * to /pricing through the secondary link, which is the real route and stays the
 * real route (lib/platform/useAndroidBack.ts:13 depends on that).
 *
 * PRICE. Read from the store at open time, never from a literal. lib/premium/
 * plans.ts, the Terms of Service, the Play listing and the patch notes
 * currently disagree about what Plus costs, and docs/brand/voice.md:15 says
 * that when sources disagree you write no price at all. A store-supplied price
 * cannot disagree with the store.
 */

/** Which lock the reader just met. Chooses the copy, nothing else. */
export type UpgradeFeature =
  | "florilegium"
  | "palettes"
  | "history"
  | "sync"
  | "general";

type Ctx = { open: (feature: UpgradeFeature) => void; available: boolean };

/** A price is never rendered without the period it buys. "$38.99" alone is a
 *  number a reader will read as a month. */
type Priced = { price: string; period: "month" | "year" } | null;

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

type Phase = "pitch" | "buying" | "active" | "failed";

export function UpgradeModalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [feature, setFeature] = useState<UpgradeFeature | null>(null);
  const [phase, setPhase] = useState<Phase>("pitch");
  const [priced, setPriced] = useState<Priced>(null);
  const [canBuyHere, setCanBuyHere] = useState(false);
  const isNative = useIsNative();

  const close = useCallback(() => {
    setFeature(null);
    // Left until the next open so the exit animation does not show the pitch
    // flashing back in behind a fading confirmation.
    setPhase("pitch");
  }, []);

  const open = useCallback((next: UpgradeFeature) => {
    setFeature(next);
    setPhase("pitch");
    setPriced(null);
    setCanBuyHere(false);

    // Price and purchasability are resolved lazily, on open. Doing it at mount
    // would initialise RevenueCat on every page in the app for the large
    // majority of readers who never tap any of this.
    void (async () => {
      try {
        const user = readLocalSessionUser();
        if (!user) return;
        if (billingAvailable()) {
          if (!(await initBilling(user.id))) return;
          const pkgs = await getPlusPackages();
          const yearly = Boolean(pkgs.yearly);
          const pkg = pkgs.yearly ?? pkgs.monthly;
          if (!pkg?.product.priceString) return;
          setPriced({
            price: pkg.product.priceString,
            period: yearly ? "year" : "month",
          });
          setCanBuyHere(true);
          return;
        }
        if (webBillingAvailable()) {
          // getWebPlusPackages configures the SDK and binds it to the uid.
          const pkgs = await getWebPlusPackages(user.id);
          const yearly = Boolean(pkgs.yearly);
          const pkg = pkgs.yearly ?? pkgs.monthly;
          const formatted = packagePrice(pkg);
          if (!formatted) return;
          setPriced({ price: formatted, period: yearly ? "year" : "month" });
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
        const pkg = pkgs.yearly ?? pkgs.monthly;
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
      const pkg = pkgs.yearly ?? pkgs.monthly;
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
  }, []);

  return (
    <UpgradeModalContext.Provider value={ctx}>
      {children}
      <UpgradeSheet
        feature={feature}
        phase={phase}
        priced={priced}
        canBuyHere={canBuyHere}
        isNative={isNative}
        onBuy={buy}
        onClose={close}
      />
    </UpgradeModalContext.Provider>
  );
}

function UpgradeSheet({
  feature,
  phase,
  priced,
  canBuyHere,
  isNative,
  onBuy,
  onClose,
}: {
  feature: UpgradeFeature | null;
  phase: Phase;
  priced: Priced;
  canBuyHere: boolean;
  isNative: boolean;
  onBuy: () => void;
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
      bodyClassName="px-5 pb-6 pt-1"
    >
      {done ? (
        <>
          <h2 className="font-sans text-title-sm font-bold text-paper leading-tight">
            {t("plus.active.title")}
          </h2>
          <p className="mt-3 font-serif text-body text-paper/80 leading-[1.7]">
            {t("plus.active.body")}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-6 w-full inline-flex items-center justify-center font-sans text-ui font-semibold rounded-pill px-5 py-3.5 bg-gold text-night hover:bg-gold-soft transition-colors"
          >
            {t("plus.active.back")}
          </button>
        </>
      ) : (
        <>
          <h2 className="font-sans text-title-sm font-bold text-paper leading-tight text-balance">
            {t(`plus.${feature ?? "general"}.title`)}
          </h2>
          <p className="mt-3 font-serif text-body text-paper/80 leading-[1.7]">
            {t(`plus.${feature ?? "general"}.body`)}
          </p>
          <p className="mt-3 font-sans text-detail text-paper/60 leading-[1.6]">
            {t(`plus.${feature ?? "general"}.keep`)}
          </p>

          {phase === "failed" ? (
            <p
              role="alert"
              className="mt-4 font-sans text-detail text-crimson-soft"
            >
              {t("plus.failed")}
            </p>
          ) : null}

          {canBuyHere ? (
            <button
              type="button"
              onClick={onBuy}
              disabled={phase === "buying"}
              className="mt-6 w-full inline-flex items-center justify-center font-sans text-ui font-semibold rounded-pill px-5 py-3.5 bg-gold text-night hover:bg-gold-soft transition-colors disabled:opacity-60"
            >
              {phase === "buying" ? t("plus.opening") : t("plus.start")}
            </button>
          ) : (
            <Link
              href="/pricing"
              onClick={onClose}
              className="mt-6 w-full inline-flex items-center justify-center font-sans text-ui font-semibold rounded-pill px-5 py-3.5 bg-gold text-night hover:bg-gold-soft transition-colors"
            >
              {t("plus.start")}
            </Link>
          )}

          {/* The price is whatever the store just said. When the store did not
              answer, no price is shown at all rather than a remembered one. */}
          {priced ? (
            <p className="mt-3 text-center font-sans text-detail text-paper/60 tabular-nums">
              {priced.period === "year"
                ? t("plus.perYear", { price: priced.price })
                : t("plus.perMonth", { price: priced.price })}
            </p>
          ) : null}

          <div className="mt-5 flex items-center justify-center gap-5">
            {canBuyHere ? (
              <Link
                href="/pricing"
                onClick={onClose}
                className="font-sans text-detail text-paper/60 hover:text-paper underline underline-offset-2"
              >
                {t("plus.seeAllPlans")}
              </Link>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="font-sans text-detail text-paper/60 hover:text-paper"
            >
              {t("plus.notNow")}
            </button>
          </div>

          <p className="mt-5 font-sans text-caption text-paper/45 leading-[1.55] text-center">
            {t("plus.footer")}
          </p>
          {/* Marks which store the charge will come from, so the reader is not
              surprised by the receipt. Native only: on the web the hosted
              checkout names itself. */}
          {isNative ? (
            <p className="mt-2 font-sans text-caption text-paper/35 text-center">
              {t("plus.billedThroughStore")}
            </p>
          ) : null}
        </>
      )}
    </Sheet>
  );
}
