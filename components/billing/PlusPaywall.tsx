"use client";

// Native-only Purify Plus paywall — a fully custom UI driving RevenueCat
// (Play Billing). Returns null on the web (the website keeps the quiet,
// price-free pricing copy and has no checkout). Inside the Android app the
// pricing route renders this full-screen.
//
// RevenueCat is the billing engine only: prices come live from the store
// (package.product.priceString), so changing a price in Play Console flows
// through with no code change. Plus is keyed to the Supabase account (the
// webhook writes entitlements by uid), so a signed-out user signs in first.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
import { createClient } from "@/lib/supabase/client";
import { useIsNative } from "@/lib/platform/native";
import { PurifyBadge } from "@/components/ui/PurifyBadge";

type Phase = "loading" | "signed-out" | "unavailable" | "ready" | "subscribed";
type Plan = "monthly" | "yearly";

/** Yearly savings vs paying monthly for a year, rounded. Null when it can't
 * be computed or isn't a saving. */
function savingsPct(pkgs: PlusPackages): number | null {
  const m = pkgs.monthly?.product.price;
  const y = pkgs.yearly?.product.price;
  if (!m || !y || m <= 0) return null;
  const pct = Math.round((1 - y / (m * 12)) * 100);
  return pct > 0 ? pct : null;
}

export function PlusPaywall() {
  const isNative = useIsNative();

  const [phase, setPhase] = useState<Phase>("loading");
  const [packages, setPackages] = useState<PlusPackages>({
    monthly: null,
    yearly: null,
  });
  const [selected, setSelected] = useState<Plan>("yearly");
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    // Any failure in the RevenueCat/plugin chain must degrade to the calm
    // "unavailable" state, never throw uncaught (an unhandled error here
    // white-screened the WebView — the "Purify Plus crashes" report).
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
      if (await isPlusActive()) {
        setPhase("subscribed");
        return;
      }
      const pkgs = await getPlusPackages();
      setPackages(pkgs);
      setSelected(pkgs.yearly ? "yearly" : "monthly");
      setPhase(pkgs.monthly || pkgs.yearly ? "ready" : "unavailable");
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

  const onSubscribe = useCallback(async () => {
    const pkg = selected === "yearly" ? packages.yearly : packages.monthly;
    if (!pkg || busy) return;
    setBusy("buy");
    setNote(null);
    try {
      const outcome = await purchase(pkg);
      if (outcome === "active") setPhase("subscribed");
      else if (outcome === "error")
        setNote("That didn't go through. Nothing was charged.");
    } catch (e) {
      console.error("[PlusPaywall] purchase failed:", e);
      setNote("That didn't go through. Nothing was charged.");
    } finally {
      setBusy(null);
    }
  }, [selected, packages, busy]);

  const onRestore = useCallback(async () => {
    if (busy) return;
    setBusy("restore");
    setNote(null);
    try {
      const ok = await restore();
      if (ok) setPhase("subscribed");
      else setNote("No previous Purify Plus subscription was found.");
    } catch (e) {
      console.error("[PlusPaywall] restore failed:", e);
      setNote("Couldn't check for a previous subscription. Please try again.");
    } finally {
      setBusy(null);
    }
  }, [busy]);

  const onManage = useCallback(async () => {
    try {
      const shown = await presentCustomerCenter();
      if (!shown && typeof window !== "undefined") {
        window.open(MANAGE_SUBSCRIPTION_URL, "_blank");
      }
    } catch (e) {
      console.error("[PlusPaywall] manage failed:", e);
      if (typeof window !== "undefined") {
        window.open(MANAGE_SUBSCRIPTION_URL, "_blank");
      }
    }
  }, []);

  // Web renders nothing; the server pricing page carries the web copy.
  if (!isNative || phase === "loading") return null;

  if (phase === "signed-out") {
    return (
      <Screen>
        <Hero />

        {/* Same included-benefits card the ready phase shows, so the screen
            sells the thing before asking for a sign-in — and so tall screens
            have real content instead of one giant gap. */}
        <div className="paywall-in mt-7 px-5" style={{ animationDelay: "460ms" }}>
          <div className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-5">
            <p className="text-center font-sans text-eyebrow font-semibold uppercase tracking-[2px] text-paper/55">
              What’s included
            </p>
            <ul className="mt-4 space-y-4">
              <Included
                icon={<SyncIcon />}
                title="Cross-device sync"
                sub="Your library on every device you sign in on"
              />
              <Included
                icon={<BookmarkIcon />}
                title="Notes, highlights & bookmarks"
                sub="Kept private, carried everywhere"
              />
              <Included
                icon={<BookIcon />}
                title="Custom collections & Florilegium"
                sub="Build your own quote collections"
              />
            </ul>
          </div>
          <p className="mt-4 flex items-center justify-center gap-2 font-sans text-caption text-paper/55">
            <ShieldIcon />
            Core Orthodox resources remain free.
          </p>
        </div>

        <div
          className="paywall-in mt-6 w-full px-6 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] text-center"
          style={{ animationDelay: "560ms" }}
        >
          <p className="mx-auto max-w-[320px] font-sans text-ui leading-relaxed text-paper/70">
            Purify Plus is tied to your account, so it follows you across your
            devices.
          </p>
          <Link
            href="/signin?next=/pricing"
            className="mt-5 inline-flex w-full items-center justify-center rounded-pill bg-paper px-6 py-4 font-display-serif text-lede text-night transition-colors hover:bg-paper/90"
          >
            Sign in to continue
          </Link>
          <p className="mt-3 flex items-center justify-center gap-2 font-sans text-caption text-paper/45">
            <LockIcon />
            Secure billing through Google Play. Cancel anytime.
          </p>
        </div>
      </Screen>
    );
  }

  if (phase === "unavailable") {
    return (
      <Screen>
        <Hero />
        <div
          className="paywall-in mt-8 w-full px-6 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] text-center"
          style={{ animationDelay: "460ms" }}
        >
          <p className="mx-auto max-w-[320px] font-sans text-ui leading-relaxed text-paper/65">
            Purify Plus isn’t available to purchase right now. The whole core of
            Purify stays free, and everything you’ve gathered is safe on this
            device.
          </p>
        </div>
      </Screen>
    );
  }

  if (phase === "subscribed") {
    return (
      <Screen>
        <Hero />
        <div
          className="paywall-in mt-8 w-full px-6 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] text-center"
          style={{ animationDelay: "460ms" }}
        >
          <p className="font-display-serif text-title text-paper">
            You have Purify Plus.
          </p>
          <p className="mx-auto mt-3 max-w-[300px] font-sans text-ui leading-relaxed text-paper/65">
            Thank you for keeping the lamps lit. Your reading syncs across every
            device you sign in on.
          </p>
          <button
            type="button"
            onClick={onManage}
            className="mt-6 inline-flex items-center justify-center font-sans text-ui font-semibold text-gold/90 hover:text-gold"
          >
            Manage subscription
          </button>
        </div>
      </Screen>
    );
  }

  // ── ready ───────────────────────────────────────────────────────────────
  const saved = savingsPct(packages);
  const canBuy =
    (selected === "yearly" && packages.yearly) ||
    (selected === "monthly" && packages.monthly);

  return (
    <Screen>
      <Hero />

      {/* What's included */}
      <div className="paywall-in mt-7 px-5" style={{ animationDelay: "460ms" }}>
        <div className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-5">
          <p className="text-center font-sans text-eyebrow font-semibold uppercase tracking-[2px] text-paper/55">
            What’s included
          </p>
          <ul className="mt-4 space-y-4">
            <Included
              icon={<SyncIcon />}
              title="Cross-device sync"
              sub="Your library on every device you sign in on"
            />
            <Included
              icon={<BookmarkIcon />}
              title="Notes, highlights & bookmarks"
              sub="Kept private, carried everywhere"
            />
            <Included
              icon={<BookIcon />}
              title="Custom collections & Florilegium"
              sub="Build your own quote collections"
            />
          </ul>
        </div>

        <p className="mt-4 flex items-center justify-center gap-2 font-sans text-caption text-paper/55">
          <ShieldIcon />
          Core Orthodox resources remain free.
        </p>
      </div>

      {/* Plans */}
      <div className="paywall-in mt-6 space-y-3 px-5" style={{ animationDelay: "560ms" }}>
        <PlanRow
          label="Monthly"
          sub="Billed monthly"
          price={packages.monthly?.product.priceString}
          unit="per month"
          selected={selected === "monthly"}
          disabled={!packages.monthly}
          onSelect={() => setSelected("monthly")}
        />
        <PlanRow
          label="Yearly"
          sub="Billed yearly"
          price={packages.yearly?.product.priceString}
          unit="per year"
          badge="Most popular"
          footer={saved != null ? `Save ${saved}%` : undefined}
          selected={selected === "yearly"}
          disabled={!packages.yearly}
          onSelect={() => setSelected("yearly")}
        />
      </div>

      {/* CTA + trust + footer */}
      <div
        className="paywall-in mt-6 px-5 pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)]"
        style={{ animationDelay: "660ms" }}
      >
        {note ? (
          <p className="mb-3 text-center font-sans text-caption text-crimson-soft">
            {note}
          </p>
        ) : null}
        <button
          type="button"
          onClick={onSubscribe}
          disabled={!canBuy || busy !== null}
          className="flex w-full items-center justify-center gap-3 rounded-pill bg-paper px-6 py-4 font-display-serif text-lede text-night transition-[transform,background-color] hover:bg-paper/90 active:scale-[0.99] disabled:opacity-50"
        >
          <Sparkle />
          {busy === "buy" ? "Starting…" : "Start Purify Plus"}
          <ArrowRight />
        </button>

        <p className="mt-3 flex items-center justify-center gap-2 font-sans text-caption text-paper/45">
          <LockIcon />
          Secure billing through Google Play. Cancel anytime.
        </p>

        <div className="mt-4 flex items-center justify-center gap-5 border-t border-paper/8 pt-4 font-sans text-caption text-paper/55">
          <button
            type="button"
            onClick={onRestore}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 hover:text-paper disabled:opacity-50"
          >
            <RestoreIcon />
            {busy === "restore" ? "Restoring…" : "Restore"}
          </button>
          <span className="text-paper/15">|</span>
          <Link href="/terms" className="inline-flex items-center gap-1.5 hover:text-paper">
            <DocIcon />
            Terms
          </Link>
          <span className="text-paper/15">|</span>
          <Link href="/privacy" className="inline-flex items-center gap-1.5 hover:text-paper">
            <ShieldIcon />
            Privacy
          </Link>
        </div>
      </div>
    </Screen>
  );
}

/* ── layout pieces ───────────────────────────────────────────────────────── */

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-night text-paper safe-pt">
      {children}
    </div>
  );
}

/** Hero: light from above, the Orthodox cross, the wordmark, and the title.
 * Plays the subscription-onboarding cascade: the light blooms, the cross
 * settles with a soft overshoot, and the copy rises line by line.
 * The radiant background is CSS; drop a designed image at /plus-hero.png and
 * set it as the backgroundImage here to match a bespoke comp exactly. */
function Hero() {
  return (
    <div className="relative flex flex-col items-center px-6 pt-12 pb-2 text-center">
      <div
        aria-hidden
        className="paywall-glow-in pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 70% at 50% -10%, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.04) 28%, transparent 60%)",
        }}
      />
      <span className="paywall-mark-in">
        <PurifyBadge size={76} className="drop-shadow-[0_6px_28px_rgba(255,255,255,0.18)]" />
      </span>
      <p
        className="paywall-in mt-4 font-display-serif text-title text-paper/90"
        style={{ animationDelay: "120ms" }}
      >
        Purify
      </p>
      <h1
        className="paywall-in mt-2 font-display-serif text-display-sm font-bold tracking-[-0.02em] text-paper"
        style={{ animationDelay: "200ms" }}
      >
        Purify <span className="text-gold-pale">Plus</span>
      </h1>
      <span
        className="paywall-in my-3 inline-flex items-center gap-2 text-gold-pale/70"
        style={{ animationDelay: "280ms" }}
      >
        <span className="h-px w-10 bg-paper/15" />
        <Sparkle small />
        <span className="h-px w-10 bg-paper/15" />
      </span>
      <p
        className="paywall-in font-display-serif text-lede text-paper/90"
        style={{ animationDelay: "340ms" }}
      >
        Deeper focus. Stronger faith.
      </p>
      <p
        className="paywall-in mx-auto mt-3 max-w-[320px] font-sans text-ui leading-relaxed text-paper/60"
        style={{ animationDelay: "400ms" }}
      >
        Sync your spiritual journey across all your devices and go deeper with
        tools that inspire.
      </p>
    </div>
  );
}

function Included({
  icon,
  title,
  sub,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <li className="flex items-center gap-3.5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-paper/12 bg-paper/[0.04] text-gold-pale">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-sans text-ui font-semibold text-paper">
          {title}
        </span>
        <span className="block font-sans text-caption text-paper/55">{sub}</span>
      </span>
    </li>
  );
}

function PlanRow({
  label,
  sub,
  price,
  unit,
  badge,
  footer,
  selected,
  disabled,
  onSelect,
}: {
  label: string;
  sub: string;
  price?: string;
  unit: string;
  badge?: string;
  footer?: string;
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
      className={`relative block w-full rounded-2xl border px-5 py-4 text-left transition-colors disabled:opacity-40 ${
        selected
          ? "border-gold/55 bg-gold/[0.07] ring-1 ring-inset ring-gold/25"
          : "border-paper/12 bg-paper/[0.03] hover:border-paper/25"
      }`}
    >
      {badge ? (
        <span className="absolute right-4 top-0 -translate-y-1/2 rounded-pill bg-paper px-2.5 py-0.5 font-sans text-eyebrow font-semibold uppercase tracking-[1px] text-night">
          {badge}
        </span>
      ) : null}
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-3">
          <Radio on={selected} />
          <span>
            <span className="block font-sans text-lede font-semibold text-paper">
              {label}
            </span>
            <span className="block font-sans text-caption text-paper/50">
              {sub}
            </span>
          </span>
        </span>
        <span className="text-right">
          <span className="block font-display-serif text-title text-paper tabular-nums">
            {price ?? "—"}
          </span>
          <span className="block font-sans text-caption text-paper/50">
            {unit}
          </span>
        </span>
      </div>
      {footer ? (
        <p className="mt-2 flex items-center justify-center gap-1.5 font-sans text-caption text-gold-pale">
          <Sparkle small /> {footer} <Sparkle small />
        </p>
      ) : null}
    </button>
  );
}

function Radio({ on }: { on: boolean }) {
  return (
    <span
      className={`flex h-5 w-5 items-center justify-center rounded-full border ${
        on ? "border-gold" : "border-paper/30"
      }`}
    >
      {on ? <span className="h-2.5 w-2.5 rounded-full bg-gold" /> : null}
    </span>
  );
}

/* ── icons (inline; match the comp's quiet line style) ───────────────────── */

const S = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function SyncIcon() {
  return (
    <svg {...S}>
      <path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-7.5-4" />
      <path d="M3 12a9 9 0 0 1 9-9 9 9 0 0 1 7.5 4" />
      <path d="M19.5 3v4h-4M4.5 21v-4h4" />
    </svg>
  );
}
function BookIcon() {
  return (
    <svg {...S}>
      <path d="M12 6.5C10.5 5 8 4.5 4 4.5v13c4 0 6.5.5 8 2 1.5-1.5 4-2 8-2v-13c-4 0-6.5.5-8 2z" />
      <path d="M12 6.5v13" />
    </svg>
  );
}
function BookmarkIcon() {
  return (
    <svg {...S}>
      <path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1z" />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg {...S} width={14} height={14}>
      <path d="M12 3 5 6v5c0 4 3 6.5 7 8 4-1.5 7-4 7-8V6z" />
      <path d="m9 11 2 2 4-4" />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg {...S} width={13} height={13}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
function RestoreIcon() {
  return (
    <svg {...S} width={14} height={14}>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}
function DocIcon() {
  return (
    <svg {...S} width={14} height={14}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </svg>
  );
}
function ArrowRight() {
  return (
    <svg {...S} width={20} height={20}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
function Sparkle({ small }: { small?: boolean }) {
  const n = small ? 12 : 18;
  return (
    <svg width={n} height={n} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2c.4 4.5 2.5 6.6 7 7-4.5.4-6.6 2.5-7 7-.4-4.5-2.5-6.6-7-7 4.5-.4 6.6-2.5 7-7z" />
    </svg>
  );
}
