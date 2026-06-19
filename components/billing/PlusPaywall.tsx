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
import { presentCustomerCenter } from "@/lib/billing/revenuecatUi";
import type { PurchasesPackage } from "@revenuecat/purchases-typescript-internal-esm";

type Phase = "loading" | "signed-out" | "unavailable" | "ready" | "subscribed";

// The actual, shipped Plus benefits (no unreleased items like ambience or
// the future audio library — those belong to the roadmap copy, not the
// purchase surface).
const PLUS_BENEFITS = [
  "Cross-device sync",
  "Notes, highlights, and bookmarks",
  "Custom collections and Florilegium",
] as const;

// Savings % of Yearly vs twelve months of Monthly, computed live from the
// RevenueCat product prices (never hardcoded). Returns null unless both
// plans are present and the math is a real, positive saving.
function yearlySavingsPercent(pkgs: PlusPackages): number | null {
  const monthly = pkgs.monthly?.product.price;
  const yearly = pkgs.yearly?.product.price;
  if (!monthly || !yearly) return null;
  const full = monthly * 12;
  if (yearly >= full) return null;
  return Math.round((1 - yearly / full) * 100);
}

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

  // Manage: open RevenueCat's native Customer Center (manage / cancel /
  // restore / refund / support). Falls back to the Play subscriptions deep
  // link if Customer Center isn't available (e.g. not yet enabled in the
  // RevenueCat dashboard).
  const onManage = useCallback(async () => {
    const shown = await presentCustomerCenter();
    if (!shown && typeof window !== "undefined") {
      window.open(MANAGE_SUBSCRIPTION_URL, "_blank");
    }
  }, []);

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
        <button
          type="button"
          onClick={onManage}
          className="mt-5 inline-flex items-center font-sans text-ui font-semibold text-gold/90 hover:text-gold"
        >
          Manage subscription
        </button>
      </Shell>
    );
  }

  // phase === "ready"
  const savings = yearlySavingsPercent(packages);
  const yearlySublabel = savings ? `Save ${savings}%` : "Best value";

  return (
    <Shell>
      <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-gold/80">
        Purify Plus
      </p>
      <p className="mt-3 font-sans text-ui leading-relaxed text-paper/70">
        The whole Orthodox core stays free, always. Purify Plus adds the
        gathered, cross-device reading layer:
      </p>

      <ul className="mt-4 space-y-2.5">
        {PLUS_BENEFITS.map((benefit) => (
          <li key={benefit} className="flex gap-2.5">
            <Check />
            <span className="font-sans text-ui leading-snug text-paper/85">
              {benefit}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-6 space-y-3">
        <PlanButton
          label="Yearly"
          sublabel={yearlySublabel}
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
        Billed through Google Play. Subscriptions renew automatically until
        cancelled; manage or cancel any time in Google Play.
      </p>

      <p className="mt-3 font-sans text-caption text-paper/40">
        <Link href="/terms" className="underline-offset-4 hover:underline">
          Terms
        </Link>
        <span className="px-1.5 text-paper/25">·</span>
        <Link href="/privacy" className="underline-offset-4 hover:underline">
          Privacy
        </Link>
      </p>
    </Shell>
  );
}

function Check() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="mt-[3px] shrink-0 text-gold/80"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
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
