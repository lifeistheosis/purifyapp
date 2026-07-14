"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { readLocalSessionUser } from "@/lib/supabase/localSession";
import {
  webBillingAvailable,
  getWebPlusPackages,
  getWebProPackages,
  packagePrice,
  purchaseWebPlus,
  isWebPlusActive,
  isWebProActive,
  webManagementURL,
  type WebPlusPackages,
} from "@/lib/billing/revenuecatWeb";
import type { Package } from "@revenuecat/purchases-js";

/**
 * The web purchase surface for Purify Plus, on /pricing. Buys through
 * RevenueCat Web Billing (Stripe-backed) and binds the subscription to the
 * signed-in Supabase account, so the shared webhook writes the same
 * entitlement the mobile app reads: buy here, unlocked on your phone too.
 *
 * Degrades gracefully: when the Web Billing key is not configured yet
 * (NEXT_PUBLIC_REVENUECAT_WEB_KEY unset) it shows only the Play Store link,
 * exactly the prior behavior, so the page is correct before and after the
 * RevenueCat dashboard is set up.
 */

export type WebCheckoutCopy = {
  monthlyLabel: string;
  yearlyLabel: string;
  signedOut: string;
  signIn: string;
  subscribeMonthly: string;
  subscribeYearly: string;
  processing: string;
  billedNote: string;
  errorNote: string;
  subscribedTitle: string;
  subscribedSub: string;
  manage: string;
  orGetInApp: string;
  getInApp: string;
};

type Phase = "loading" | "signed-out" | "ready" | "subscribed" | "unavailable";

export function WebSubscribeCheckout({
  tier = "plus",
  copy,
  playStoreUrl,
}: {
  tier?: "plus" | "pro";
  copy: WebCheckoutCopy;
  playStoreUrl: string;
}) {
  const [phase, setPhase] = useState<Phase>(
    webBillingAvailable() ? "loading" : "unavailable",
  );
  const [userId, setUserId] = useState<string | null>(null);
  const [packages, setPackages] = useState<WebPlusPackages>({
    monthly: null,
    yearly: null,
    offering: null,
  });
  const [busy, setBusy] = useState<"monthly" | "yearly" | null>(null);
  const [manageUrl, setManageUrl] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!webBillingAvailable()) {
      setPhase("unavailable");
      return;
    }
    try {
      // F-13: read the signed-in user from the local session (cookie), never
      // supabase.auth.getUser(). That call network-validates through the
      // cross-tab auth lock; a jammed lock makes it hang forever, which strands
      // the checkout on the loading skeleton until the 8s safety timeout drops
      // it to the app-store fallback. Observed live 2026-07-14: the auth lock
      // sat held-exclusive, getUser() never returned, so signed-in desktop
      // users saw "Get it in the app" instead of the subscribe buttons. The
      // local read is synchronous, lock-free, and cannot hang.
      const user = readLocalSessionUser();
      if (!user) {
        setPhase("signed-out");
        return;
      }
      setUserId(user.id);
      const active =
        tier === "pro"
          ? await isWebProActive(user.id)
          : await isWebPlusActive(user.id);
      if (active) {
        setManageUrl(await webManagementURL(user.id));
        setPhase("subscribed");
        return;
      }
      const pkgs =
        tier === "pro"
          ? await getWebProPackages(user.id)
          : await getWebPlusPackages(user.id);
      setPackages(pkgs);
      setPhase(pkgs.monthly || pkgs.yearly ? "ready" : "unavailable");
    } catch {
      // Any bootstrap failure falls back to the Play link, never a stuck box.
      setPhase("unavailable");
    }
  }, [tier]);

  useEffect(() => {
    // Client-only billing bootstrap; state is set after awaits.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  // Safety net: if the SDK bootstrap hangs (a slow or unreachable RevenueCat
  // web offering), don't leave the reader on the loading skeleton forever.
  // After the grace period, drop to the Play-link fallback.
  useEffect(() => {
    if (phase !== "loading") return;
    const t = window.setTimeout(() => {
      setPhase((p) => (p === "loading" ? "unavailable" : p));
    }, 8000);
    return () => window.clearTimeout(t);
  }, [phase]);

  const buy = useCallback(
    async (plan: "monthly" | "yearly", pkg: Package | null) => {
      if (!userId || !pkg || busy) return;
      setBusy(plan);
      setNote(null);
      const outcome = await purchaseWebPlus(userId, pkg);
      setBusy(null);
      if (outcome === "active") {
        setManageUrl(await webManagementURL(userId));
        setPhase("subscribed");
      } else if (outcome === "error") {
        setNote(copy.errorNote);
      }
    },
    [userId, busy, copy.errorNote],
  );

  // No web billing configured: keep the prior Play-Store-only behavior.
  if (phase === "unavailable") {
    return <GetInApp copy={copy} playStoreUrl={playStoreUrl} primary />;
  }

  if (phase === "loading") {
    return (
      <div className="mt-7 border-t border-paper/8 pt-6">
        <div className="h-12 w-full max-w-[320px] animate-pulse rounded-pill bg-paper/[0.06]" />
      </div>
    );
  }

  if (phase === "signed-out") {
    return (
      <div className="mt-7 border-t border-paper/8 pt-6">
        <p className="max-w-[460px] font-sans text-ui leading-relaxed text-paper/70">
          {copy.signedOut}
        </p>
        <Link
          href="/signin?next=/pricing"
          className="mt-5 inline-flex items-center justify-center rounded-pill bg-paper px-6 py-3.5 font-sans text-ui font-semibold text-night transition-colors hover:bg-paper/90"
        >
          {copy.signIn}
        </Link>
        <div className="mt-4">
          <GetInApp copy={copy} playStoreUrl={playStoreUrl} />
        </div>
      </div>
    );
  }

  if (phase === "subscribed") {
    return (
      <div className="mt-7 border-t border-paper/8 pt-6">
        <p className="font-display-serif text-title-sm text-paper">
          {copy.subscribedTitle}
        </p>
        <p className="mt-2 max-w-[460px] font-sans text-ui leading-relaxed text-paper/65">
          {copy.subscribedSub}
        </p>
        {manageUrl ? (
          <a
            href={manageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center font-sans text-ui font-semibold text-gold/90 hover:text-gold"
          >
            {copy.manage}
          </a>
        ) : null}
      </div>
    );
  }

  // ready — signed in, not subscribed: live subscribe buttons.
  const monthlyPrice = packagePrice(packages.monthly) ?? copy.monthlyLabel;
  const yearlyPrice = packagePrice(packages.yearly) ?? copy.yearlyLabel;

  return (
    <div className="mt-7 border-t border-paper/8 pt-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        {packages.monthly ? (
          <button
            type="button"
            onClick={() => buy("monthly", packages.monthly)}
            disabled={busy !== null}
            className="inline-flex flex-1 items-center justify-center rounded-pill bg-paper px-6 py-3.5 font-sans text-ui font-semibold text-night transition-colors hover:bg-paper/90 disabled:opacity-60"
          >
            {busy === "monthly"
              ? copy.processing
              : `${copy.subscribeMonthly} · ${monthlyPrice}`}
          </button>
        ) : null}
        {packages.yearly ? (
          <button
            type="button"
            onClick={() => buy("yearly", packages.yearly)}
            disabled={busy !== null}
            className="inline-flex flex-1 items-center justify-center rounded-pill border border-gold/45 bg-gold/[0.10] px-6 py-3.5 font-sans text-ui font-semibold text-gold-pale transition-colors hover:bg-gold/[0.16] disabled:opacity-60"
          >
            {busy === "yearly"
              ? copy.processing
              : `${copy.subscribeYearly} · ${yearlyPrice}`}
          </button>
        ) : null}
      </div>
      {note ? (
        <p className="mt-3 font-sans text-caption text-crimson-soft">{note}</p>
      ) : null}
      <p className="mt-3 max-w-[520px] font-sans text-caption leading-[1.5] text-paper/50">
        {copy.billedNote}
      </p>
      <div className="mt-2">
        <GetInApp copy={copy} playStoreUrl={playStoreUrl} />
      </div>
    </div>
  );
}

function GetInApp({
  copy,
  playStoreUrl,
  primary = false,
}: {
  copy: WebCheckoutCopy;
  playStoreUrl: string;
  primary?: boolean;
}) {
  if (primary) {
    return (
      <div className="mt-7 border-t border-paper/8 pt-6">
        <a
          href={playStoreUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-pill bg-paper px-6 py-3.5 font-sans text-ui font-semibold text-night transition-colors hover:bg-paper/90"
        >
          {copy.getInApp}
        </a>
      </div>
    );
  }
  return (
    <a
      href={playStoreUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="font-sans text-caption text-gold/80 underline underline-offset-2 hover:text-gold"
    >
      {copy.orGetInApp}
    </a>
  );
}
