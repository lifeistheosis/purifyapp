"use client";

// Desktop / web Purify Plus checkout, driven by RevenueCat Web Billing
// (lib/billing/revenuecatWeb). Renders only on the website (never the
// native app, which uses Play Billing) and only once Web Billing is
// configured — until the web key + dashboard products exist it returns
// null, so the pricing page's informational copy stands as the fallback.
//
// Positioning: the foundation stays free; Plus enhances and unlocks new
// features and a better experience.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useIsNative } from "@/lib/platform/native";
import {
  webBillingAvailable,
  getWebPlusPackages,
  purchaseWeb,
  isWebPlusActive,
  type WebPlusPackages,
} from "@/lib/billing/revenuecatWeb";
import type { Package } from "@revenuecat/purchases-js";

type Phase = "loading" | "signed-out" | "unavailable" | "ready" | "subscribed";
type Plan = "monthly" | "yearly";

function fmt(pkg: Package | null): string | undefined {
  return pkg?.webBillingProduct?.currentPrice?.formattedPrice;
}

export function WebPlusCheckout() {
  const isNative = useIsNative();

  const [phase, setPhase] = useState<Phase>("loading");
  const [uid, setUid] = useState<string | null>(null);
  const [packages, setPackages] = useState<WebPlusPackages>({
    monthly: null,
    yearly: null,
  });
  const [selected, setSelected] = useState<Plan>("yearly");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!webBillingAvailable()) {
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
    setUid(user.id);
    if (await isWebPlusActive(user.id)) {
      setPhase("subscribed");
      return;
    }
    const pkgs = await getWebPlusPackages(user.id);
    setPackages(pkgs);
    setSelected(pkgs.yearly ? "yearly" : "monthly");
    setPhase(pkgs.monthly || pkgs.yearly ? "ready" : "unavailable");
  }, []);

  useEffect(() => {
    if (isNative) return;
    // External-system effect (RevenueCat Web + Supabase); state set after awaits.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [isNative, load]);

  const onBuy = useCallback(async () => {
    const pkg = selected === "yearly" ? packages.yearly : packages.monthly;
    if (!pkg || !uid || busy) return;
    setBusy(true);
    setNote(null);
    const outcome = await purchaseWeb(uid, pkg);
    setBusy(false);
    if (outcome === "active") setPhase("subscribed");
    else if (outcome === "error")
      setNote("That didn't go through. Nothing was charged.");
  }, [selected, packages, uid, busy]);

  // Native renders the Play-Billing paywall instead. Web without Web Billing
  // configured stays silent so the informational pricing copy is shown.
  if (isNative || phase === "loading" || phase === "unavailable") return null;

  if (phase === "signed-out") {
    return (
      <Shell>
        <Header />
        <p className="mt-5 font-sans text-ui text-paper/70">
          Purify Plus is tied to your account, so it follows you across every
          device.
        </p>
        <Link
          href="/signin?next=/pricing"
          className="mt-5 inline-flex items-center justify-center rounded-pill bg-gold px-6 py-3 font-sans text-ui font-semibold text-night transition-colors hover:bg-gold-soft"
        >
          Sign in to continue
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
      </Shell>
    );
  }

  // ready
  return (
    <Shell>
      <Header />
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <PlanCard
          label="Monthly"
          price={fmt(packages.monthly)}
          unit="per month"
          selected={selected === "monthly"}
          disabled={!packages.monthly}
          onSelect={() => setSelected("monthly")}
        />
        <PlanCard
          label="Yearly"
          price={fmt(packages.yearly)}
          unit="per year"
          badge="Best value"
          selected={selected === "yearly"}
          disabled={!packages.yearly}
          onSelect={() => setSelected("yearly")}
        />
      </div>

      {note ? (
        <p className="mt-4 font-sans text-caption text-crimson-soft">{note}</p>
      ) : null}

      <button
        type="button"
        onClick={onBuy}
        disabled={busy}
        className="mt-6 inline-flex w-full items-center justify-center rounded-pill bg-paper px-6 py-4 font-display-serif text-lede text-night transition-colors hover:bg-paper/90 disabled:opacity-50 sm:w-auto sm:px-10"
      >
        {busy ? "Starting…" : "Get Purify Plus"}
      </button>

      <p className="mt-3 font-sans text-caption text-paper/45">
        Secure checkout. Cancel anytime. The foundation of Purify stays free
        whether or not you subscribe.
      </p>
    </Shell>
  );
}

function Header() {
  return (
    <>
      <p className="font-sans text-eyebrow font-semibold uppercase tracking-[1.5px] text-gold/80">
        Purify Plus
      </p>
      <h2 className="mt-2 font-display-serif text-title text-paper">
        Premium enhances and unlocks more.
      </h2>
      <p className="mt-2 font-sans text-ui leading-relaxed text-paper/65">
        The foundation stays free, always. Plus adds cross-device sync, custom
        collections, and new features for a deeper, better experience.
      </p>
    </>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto mt-10 w-full max-w-[640px] rounded-2xl border border-gold/25 bg-gold/[0.04] p-6 md:p-8">
      {children}
    </div>
  );
}

function PlanCard({
  label,
  price,
  unit,
  badge,
  selected,
  disabled,
  onSelect,
}: {
  label: string;
  price?: string;
  unit: string;
  badge?: string;
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
      className={`relative rounded-xl border px-5 py-4 text-left transition-colors disabled:opacity-40 ${
        selected
          ? "border-gold/55 bg-gold/[0.08] ring-1 ring-inset ring-gold/25"
          : "border-paper/12 bg-paper/[0.03] hover:border-paper/25"
      }`}
    >
      {badge ? (
        <span className="absolute right-4 top-0 -translate-y-1/2 rounded-pill bg-paper px-2.5 py-0.5 font-sans text-eyebrow font-semibold uppercase tracking-[1px] text-night">
          {badge}
        </span>
      ) : null}
      <span className="block font-sans text-ui font-semibold text-paper">
        {label}
      </span>
      <span className="mt-1 block font-display-serif text-title text-paper tabular-nums">
        {price ?? "—"}
      </span>
      <span className="block font-sans text-caption text-paper/50">{unit}</span>
    </button>
  );
}
