"use client";

// The website's /pricing, redrawn as the owner's R2 (his second round of 1.8,
// 2026-10-28: "add every single thing we left out"). Until then the website
// kept its own page, three plans side by side with the prices written into
// lib/premium/plans.ts, while the apps and the upgrade sheet had the paywall
// he locked on 2026-10-27 (boards/purify-master/variants/10b-paywall.png).
//
// Now it is the same screen as the apps' (components/billing/PlusPaywall.tsx,
// whose pieces it draws): "Purify is kept by those it helps" over the scribe,
// Plus and Pro, the features in depth, what readers say in the stores, and
// the plans held at the bottom. What differs is who bills: RevenueCat Web
// Billing, backed by Stripe (lib/billing/revenuecatWeb.ts), so every figure
// is the website's own Stripe price as RevenueCat formats it (webOffer), the
// trial is the one its offering carries, and none is written in code.
//
// What the page always had, it keeps: Pro and the EIKON Box's terms under
// Pro (the switch, PRO_ROWS); the promise to the supporters before launch;
// Terms and Privacy; the way to manage a subscription, which the Terms name
// as the way to cancel one bought here; and, where the website cannot sell,
// the way to Google Play. Whatever the entitlement row says a reader already
// holds is never sold to them again, however it was bought (a legacy grant,
// Google Play, a gift), as /pricing's TierPurchaseOrStatus did.
//
// The hero, the switch, the rows and the reviews are drawn on the server, so
// the page reads whole before any script runs; only the bottom waits on the
// reader's account.

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import {
  FooterRow,
  PaywallFoot,
  PlusOwnedFoot,
  ProOwnedFoot,
  ReadyBottom,
  SignedOutFoot,
  TierScreen,
  type Note,
  type Tier,
} from "@/components/billing/PlusPaywall";
import { PREMIUM_CTA } from "@/components/premium/PremiumUI";
import { NO_OFFERS, firstPlan, type Plan, type PlusOffers } from "@/lib/billing/offers";
import {
  getWebPlusPackages,
  getWebProPackages,
  isWebPlusActive,
  isWebProActive,
  purchaseWebPlus,
  webBillingAvailable,
  webManagementURL,
  webOffer,
  type WebPlusPackages,
} from "@/lib/billing/revenuecatWeb";
import { cn } from "@/lib/cn";
import { emitEntitlementsChanged } from "@/lib/entitlements/refresh";
import { usePremiumTier } from "@/lib/entitlements/usePremiumTier";
import { PLAY_STORE_URL } from "@/lib/site";
import { readLocalSessionUser } from "@/lib/supabase/localSession";

type Phase = "loading" | "signed-out" | "unavailable" | "ready" | "subscribed";

const NO_PACKAGES: WebPlusPackages = { monthly: null, yearly: null, offering: null };

/** A tier's two plans as the website's checkout offers them to this reader. */
function offersOf(pkgs: WebPlusPackages): PlusOffers {
  return { yearly: webOffer(pkgs.yearly, true), monthly: webOffer(pkgs.monthly, false) };
}

export function WebPaywall() {
  const { t } = useTranslate();
  const router = useRouter();
  // The entitlement row: what the reader holds however it was bought.
  const held = usePremiumTier();

  // Without the Web Billing key the website cannot sell, and says where to.
  const [phase, setPhase] = useState<Phase>(() => (webBillingAvailable() ? "loading" : "unavailable"));
  const [tier, setTier] = useState<Tier>("plus");
  const [userId, setUserId] = useState<string | null>(null);
  const [active, setActive] = useState<"none" | "plus">("none");
  const [plusPkgs, setPlusPkgs] = useState<WebPlusPackages>(NO_PACKAGES);
  const [proPkgs, setProPkgs] = useState<WebPlusPackages>(NO_PACKAGES);
  const [plusOffers, setPlusOffers] = useState<PlusOffers>(NO_OFFERS);
  const [proOffers, setProOffers] = useState<PlusOffers>(NO_OFFERS);
  const [selected, setSelected] = useState<Plan>("yearly");
  const [busy, setBusy] = useState<"buy" | null>(null);
  const [note, setNote] = useState<Note | null>(null);
  const [manageUrl, setManageUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!webBillingAvailable()) {
      setPhase("unavailable");
      return;
    }
    try {
      // F-13: the signed-in reader from the local session, never a network
      // getUser(), which can hang on a jammed auth lock and strand the page.
      const user = readLocalSessionUser();
      if (!user) {
        setPhase("signed-out");
        return;
      }
      setUserId(user.id);
      if (await isWebProActive(user.id)) {
        setManageUrl(await webManagementURL(user.id));
        setPhase("subscribed");
        return;
      }
      const hasPlus = await isWebPlusActive(user.id);
      if (hasPlus) setManageUrl(await webManagementURL(user.id));
      setActive(hasPlus ? "plus" : "none");
      const [plus, pro] = await Promise.all([getWebPlusPackages(user.id), getWebProPackages(user.id)]);
      const plusO = offersOf(plus);
      const proO = offersOf(pro);
      setPlusPkgs(plus);
      setProPkgs(pro);
      setPlusOffers(plusO);
      setProOffers(proO);
      setSelected(firstPlan(plusO) ?? firstPlan(proO) ?? "yearly");
      // A Plus subscriber lands on the Pro tab: Plus is already theirs.
      if (hasPlus) setTier("pro");
      setPhase(firstPlan(plusO) || firstPlan(proO) || hasPlus ? "ready" : "unavailable");
    } catch (e) {
      // Any failure falls back to the way to the app, never a stuck screen.
      console.warn("[WebPaywall] load failed", e);
      setPhase("unavailable");
    }
  }, []);

  useEffect(() => {
    // Client-only billing bootstrap; state is set after awaits.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  // If the bootstrap hangs (a slow or unreachable web offering), the reader
  // is not left on the waiting bar: after a grace period, the way to the app.
  useEffect(() => {
    if (phase !== "loading") return;
    const timer = window.setTimeout(() => {
      setPhase((p) => (p === "loading" ? "unavailable" : p));
    }, 8000);
    return () => window.clearTimeout(timer);
  }, [phase]);

  // The entitlement row is given a moment to answer before any plan is
  // shown, so a subscriber's first visit never offers what they hold (the
  // tier is remembered after it). Only a moment: a read that hangs never
  // holds the plans back for good.
  const [heldGrace, setHeldGrace] = useState(true);
  useEffect(() => {
    const timer = window.setTimeout(() => setHeldGrace(false), 3000);
    return () => window.clearTimeout(timer);
  }, []);

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
    const pkgs = tier === "pro" ? proPkgs : plusPkgs;
    // The plan the reader chose, and only that one.
    const pkg = selected === "yearly" ? pkgs.yearly : pkgs.monthly;
    if (!pkg || !userId || busy) return;
    setBusy("buy");
    setNote(null);
    try {
      const outcome = await purchaseWebPlus(userId, pkg);
      if (outcome === "active") {
        emitEntitlementsChanged();
        setManageUrl(await webManagementURL(userId));
        // Pro is proved by Pro itself, not by the Plus it includes.
        if (tier === "pro" && (await isWebProActive(userId))) setPhase("subscribed");
        else setActive("plus");
      } else if (outcome === "error") {
        setNote("failed");
      }
      // "cancelled" is the reader changing their mind: the plans stay.
    } catch (e) {
      console.error("[WebPaywall] purchase failed", e);
      setNote("failed");
    } finally {
      setBusy(null);
    }
  }, [tier, proPkgs, plusPkgs, selected, userId, busy]);

  // The way to cancel a subscription bought here, as the Terms name it: the
  // checkout's own management page; anything bought elsewhere is managed from
  // the account.
  const onManage = useCallback(() => {
    if (manageUrl) window.open(manageUrl, "_blank", "noopener,noreferrer");
    else router.push("/account");
  }, [manageUrl, router]);

  const ownsPro = phase === "subscribed" || held === "pro";
  const ownsPlus = ownsPro || active === "plus" || held === "plus";

  let bottom: ReactNode;
  if (ownsPro) {
    bottom = <ProOwnedFoot onManage={onManage} />;
  } else if (tier === "plus" && ownsPlus) {
    bottom = <PlusOwnedFoot onManage={onManage} busy={busy} />;
  } else if (phase === "loading" || (phase === "ready" && held === "loading" && heldGrace)) {
    bottom = (
      <PaywallFoot>
        <div aria-hidden className="h-[50px] w-full animate-pulse rounded-pill bg-paper/[0.06] motion-reduce:animate-none" />
      </PaywallFoot>
    );
  } else if (phase === "signed-out") {
    bottom = <SignedOutFoot place="web" />;
  } else if (phase === "unavailable") {
    // The website cannot sell here: Plus and Pro are bought in the app.
    bottom = (
      <PaywallFoot>
        <a
          href={PLAY_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(PREMIUM_CTA, "min-h-[50px] w-full text-[16px]")}
        >
          {t("plus.web.getOnPlay", { tier: t(tier === "pro" ? "profile.badge.pro" : "plus.sheet.title") })}
        </a>
        <FooterRow busy={busy} />
      </PaywallFoot>
    );
  } else {
    bottom = (
      <ReadyBottom
        place="web"
        tier={tier}
        offers={tier === "pro" ? proOffers : plusOffers}
        selected={selected}
        onSelect={setSelected}
        // On the Pro tab: Plus bought somewhere and billed, so the reader is
        // told to cancel it once Pro starts. A grant is never billed.
        plusOwned={active === "plus"}
        busy={busy}
        note={note}
        onSubscribe={onSubscribe}
        onManage={onManage}
      />
    );
  }

  return (
    <TierScreen tier={tier} onTier={onTier} place="web">
      {bottom}
    </TierScreen>
  );
}
