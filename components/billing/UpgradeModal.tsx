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

import { GoldCheck, GoldStar, PREMIUM_CTA } from "@/components/premium/PremiumUI";
import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";
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
  | "crossrefs"
  | "wordstudy"
  | "journal"
  | "plans"
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
 * The sheet itself. Redrawn 2026-09-28 with the premium redesign: a gold star
 * and the Purify Plus chip over the lock the reader met, the pitch in DM
 * Sans, and the one gold action (components/premium/PremiumUI.tsx). The
 * primary button was `bg-gold`, which renders grey on this palette.
 */
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
      {/* The sheet's own title bar already says Purify Plus; the mark says
          which of its states this is. */}
      <span
        aria-hidden
        className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-premium/[0.10] ring-1 ring-inset ring-premium/30"
      >
        {done ? <GoldCheck size={22} /> : <GoldStar size={22} />}
      </span>

      {done ? (
        <>
          <h2 className="mt-5 text-title-sm font-bold leading-tight text-paper md:text-title">
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
                  <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-premium-ink">
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
          <h2 className="mt-5 text-title-sm font-bold leading-tight text-paper text-balance md:text-title">
            {t(`plus.${feature ?? "general"}.title`)}
          </h2>
          <p className="mt-3 font-sans text-ui leading-[1.65] text-paper/75">
            {t(`plus.${feature ?? "general"}.body`)}
          </p>
          <p className="mt-3 font-sans text-detail leading-[1.6] text-paper/55">
            {t(`plus.${feature ?? "general"}.keep`)}
          </p>

          {phase === "failed" ? (
            <p role="alert" className="mt-4 font-sans text-detail text-crimson-soft">
              {t("plus.failed")}
            </p>
          ) : null}

          {canBuyHere ? (
            <button
              type="button"
              onClick={onBuy}
              disabled={phase === "buying"}
              className={cn(PREMIUM_CTA, "mt-6 w-full")}
            >
              {phase === "buying" ? t("plus.opening") : t("plus.start")}
            </button>
          ) : (
            <Link href="/pricing" onClick={onClose} className={cn(PREMIUM_CTA, "mt-6 w-full")}>
              {t("plus.start")}
            </Link>
          )}

          {/* The price is whatever the store just said. When the store did not
              answer, no price is shown at all rather than a remembered one. */}
          {priced ? (
            <p className="mt-3 text-center font-sans text-detail tabular-nums text-paper/60">
              {priced.period === "year"
                ? t("plus.perYear", { price: priced.price })
                : t("plus.perMonth", { price: priced.price })}
            </p>
          ) : null}

          <div className="mt-4 flex items-center justify-center gap-2">
            {/* Only beside a buy button: without one, the gold button already
                goes to /pricing. */}
            {canBuyHere ? (
              <Link
                href="/pricing"
                onClick={onClose}
                className="inline-flex min-h-11 items-center rounded-pill px-4 font-sans text-detail font-medium text-premium-ink transition-colors hover:bg-premium/[0.08]"
              >
                {t("plus.seeAllPlans")}
              </Link>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-11 items-center rounded-pill px-4 font-sans text-detail font-medium text-paper/60 transition-colors hover:bg-paper/10 hover:text-paper"
            >
              {t("plus.notNow")}
            </button>
          </div>

          <p className="mt-4 text-center font-sans text-caption leading-[1.55] text-paper/45">
            {t("plus.footer")}
          </p>
          {/* Marks which store the charge will come from, so the reader is not
              surprised by the receipt. Native only: on the web the hosted
              checkout names itself. */}
          {isNative ? (
            <p className="mt-2 text-center font-sans text-caption text-paper/35">
              {t("plus.billedThroughStore")}
            </p>
          ) : null}
        </>
      )}
    </Sheet>
  );
}
