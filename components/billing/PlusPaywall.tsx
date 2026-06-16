"use client";

// Native-only Purify Plus purchase surface. Rendered inside the pricing
// page; returns null on the web (the website keeps the quiet, price-free
// pricing copy and has no checkout yet — see lib/entitlements for why
// enforcement is native-scoped). Inside the Android app it shows the live
// Monthly / Yearly plans from RevenueCat and drives Play Billing.
//
// Plus is keyed to the account (the webhook writes entitlements by Supabase
// uid), so a signed-out user is asked to sign in first.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useIsNative } from "@/lib/platform/native";
import { createClient } from "@/lib/supabase/client";
import {
  initBilling,
  getPlusPackages,
  isPlusActive,
  purchase,
  restore,
  billingAvailable,
  MANAGE_SUBSCRIPTION_URL,
  type PlusPackages,
} from "@/lib/billing/revenuecat";
import type { PurchasesPackage } from "@revenuecat/purchases-typescript-internal-esm";

type Phase = "loading" | "signed-out" | "unavailable" | "ready" | "subscribed";

export function PlusPaywall() {
  const isNative = useIsNative();

  const [phase, setPhase] = useState<Phase>("loading");
  const [packages, setPackages] = useState<PlusPackages>({
    monthly: null,
    yearly: null,
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
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
    const ok = await initBilling(user.id);
    if (!ok) {
      setPhase("unavailable");
      return;
    }
    if (await isPlusActive()) {
      setPhase("subscribed");
      return;
    }
    const pkgs = await getPlusPackages();
    setPackages(pkgs);
    // No live products usually means the Play subscription / RevenueCat
    // offering is not finished — never strand the user on a dead screen.
    setPhase(pkgs.monthly || pkgs.yearly ? "ready" : "unavailable");
  }, []);

  useEffect(() => {
    if (!isNative) return;
    // Async load from RevenueCat + Supabase (an external-system effect, the
    // sanctioned use): state is set after awaits, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [isNative, load]);

  const onBuy = useCallback(
    async (pkg: PurchasesPackage | null, key: string) => {
      if (!pkg || busy) return;
      setBusy(key);
      setNote(null);
      const outcome = await purchase(pkg);
      setBusy(null);
      if (outcome === "active") {
        setPhase("subscribed");
      } else if (outcome === "error") {
        setNote("That didn't go through. Nothing was charged.");
      }
      // 'cancelled' → silent, the user chose to back out.
    },
    [busy],
  );

  const onRestore = useCallback(async () => {
    if (busy) return;
    setBusy("restore");
    setNote(null);
    const ok = await restore();
    setBusy(null);
    if (ok) setPhase("subscribed");
    else setNote("No previous Purify Plus subscription was found on this account.");
  }, [busy]);

  // Web: render nothing. The server pricing page already carries the
  // price-free "Purify Plus, when it arrives" copy for browsers.
  if (!isNative || phase === "loading") return null;

  if (phase === "unavailable") {
    return (
      <Shell>
        <p className="font-sans text-ui text-paper/65">
          Purify Plus is not available to purchase right now. The whole core
          of Purify stays free, and everything you have gathered is safe on
          this device.
        </p>
      </Shell>
    );
  }

  if (phase === "signed-out") {
    return (
      <Shell>
        <p className="font-sans text-ui text-paper/70">
          Purify Plus is tied to your account, so it follows you across your
          devices. Sign in to subscribe.
        </p>
        <Link
          href="/signin?next=/pricing"
          className="mt-5 inline-flex items-center justify-center rounded-pill bg-gold px-6 py-3 font-sans text-ui font-semibold text-night transition-colors hover:bg-gold-soft"
        >
          Sign in
        </Link>
      </Shell>
    );
  }

  if (phase === "subscribed") {
    return (
      <Shell>
        <p className="font-display-serif text-title text-paper">
          You have Purify Plus.
        </p>
        <p className="mt-3 font-sans text-ui text-paper/65">
          Thank you for keeping the lamps lit. Your reading syncs across every
          device you sign in on.
        </p>
        <a
          href={MANAGE_SUBSCRIPTION_URL}
          className="mt-5 inline-flex items-center font-sans text-ui font-semibold text-gold/90 hover:text-gold"
        >
          Manage subscription
        </a>
      </Shell>
    );
  }

  // phase === "ready"
  return (
    <Shell>
      <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-gold/80">
        Purify Plus
      </p>
      <p className="mt-3 font-sans text-ui leading-relaxed text-paper/70">
        Cross-device sync, custom florilegia, and the enhanced reading layer.
        The whole Orthodox core stays free, always.
      </p>

      <div className="mt-6 space-y-3">
        <PlanButton
          label="Yearly"
          sublabel="Best value"
          price={packages.yearly?.product.priceString}
          busy={busy === "yearly"}
          disabled={!packages.yearly || busy !== null}
          onClick={() => onBuy(packages.yearly, "yearly")}
        />
        <PlanButton
          label="Monthly"
          price={packages.monthly?.product.priceString}
          busy={busy === "monthly"}
          disabled={!packages.monthly || busy !== null}
          onClick={() => onBuy(packages.monthly, "monthly")}
        />
      </div>

      {note ? (
        <p className="mt-4 font-sans text-caption text-crimson-soft">{note}</p>
      ) : null}

      <button
        type="button"
        onClick={onRestore}
        disabled={busy !== null}
        className="mt-5 font-sans text-caption text-paper/55 underline-offset-4 hover:underline disabled:opacity-50"
      >
        {busy === "restore" ? "Restoring…" : "Restore purchase"}
      </button>

      <p className="mt-4 font-sans text-caption leading-[1.55] text-paper/40">
        Subscriptions renew automatically until cancelled. Manage or cancel any
        time in Google Play.
      </p>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto mt-10 max-w-[520px] rounded-2xl border border-gold/25 bg-gold/[0.04] p-6 md:p-8">
      {children}
    </div>
  );
}

function PlanButton({
  label,
  sublabel,
  price,
  busy,
  disabled,
  onClick,
}: {
  label: string;
  sublabel?: string;
  price?: string;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-paper/15 bg-paper/[0.03] px-5 py-4 text-left transition-colors hover:border-gold/40 hover:bg-gold/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span>
        <span className="block font-sans text-ui font-semibold text-paper">
          {label}
        </span>
        {sublabel ? (
          <span className="block font-sans text-caption text-gold/70">
            {sublabel}
          </span>
        ) : null}
      </span>
      <span className="font-sans text-ui font-semibold text-paper/90 tabular-nums">
        {busy ? "…" : (price ?? "—")}
      </span>
    </button>
  );
}
