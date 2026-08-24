"use client";

import { useEffect, useState } from "react";

import { apiFetch } from "@/lib/api/client";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * Payout setup, from the seller's side.
 *
 * The page is a client component because it has to re-ask the server after
 * Stripe sends the seller back. Onboarding leaves the app entirely, and the
 * `account.updated` webhook is a manual dashboard subscription that may not be
 * switched on, so returning to a page rendered before the seller left would
 * show them "not set up" immediately after they set it up. It asks again on
 * mount with ?refresh=1, which pulls the answer from Stripe itself.
 */

type View = {
  status: "none" | "onboarding" | "charges_only" | "ready";
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  commissionRateBps: number | null;
  hasAccount: boolean;
  /** False when the platform has no Stripe key at all; the UI says so. */
  configured: boolean;
};

/** Message keys per state, resolved through t() at render. */
const COPY: Record<View["status"], { title: string; body: string; cta: string }> = {
  none: {
    title: "shop.payoutsNoneTitle",
    body: "shop.payoutsNoneBody",
    cta: "shop.payoutsNoneCta",
  },
  onboarding: {
    title: "shop.payoutsOnboardingTitle",
    body: "shop.payoutsOnboardingBody",
    cta: "shop.payoutsOnboardingCta",
  },
  charges_only: {
    title: "shop.payoutsChargesOnlyTitle",
    body: "shop.payoutsChargesOnlyBody",
    cta: "shop.payoutsChargesOnlyCta",
  },
  ready: {
    title: "shop.payoutsReadyTitle",
    body: "shop.payoutsReadyBody",
    cta: "shop.payoutsReadyCta",
  },
};

export function PayoutsClient() {
  const { t } = useTranslate();
  const [view, setView] = useState<View | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The house pattern (see components/shop/CheckoutCancelledClient.tsx): the
  // request is started inside the effect and every setState is guarded, so a
  // seller who navigates away mid-request does not get written to.
  //
  // Always ?refresh=1: see the component note. A stale "not set up" shown to
  // somebody who has just finished setting up is the failure this page exists
  // to prevent.
  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/shop/seller/payouts?refresh=1", { cache: "no-store" })
      .then(async (res) => {
        if (cancelled) return;
        // Checked BEFORE the body is read. Every route here answers a failure
        // with JSON, so an error body parses cleanly and would otherwise be
        // stored as if it were the status.
        if (!res.ok) {
          setError(t("shop.payoutsCouldntLoad"));
          return;
        }
        const data = (await res.json()) as View;
        if (!cancelled) setView(data);
      })
      .catch(() => {
        if (!cancelled) setError(t("shop.payoutsCouldntLoad"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch("/api/shop/seller/payouts", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error ?? t("shop.payoutsCouldntStart"));
    } catch {
      setError(t("shop.payoutsCouldntStart"));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <p className="mt-6 font-sans text-ui text-paper/55">
        {t("shop.payoutsChecking")}
      </p>
    );
  }

  if (!view) {
    return (
      <p role="alert" className="mt-6 font-sans text-ui text-crimson-soft">
        {error ?? t("shop.payoutsCouldntLoad")}
      </p>
    );
  }

  if (!view.configured) {
    return (
      <div className="mt-6 rounded-lg border border-gold/30 bg-gold/[0.06] p-5">
        <p className="font-sans text-ui font-semibold text-paper">
          {t("shop.payoutsUnconfiguredTitle")}
        </p>
        <p className="mt-1.5 font-serif text-body text-paper/70 leading-[1.6]">
          {t("shop.payoutsUnconfiguredBody")}
        </p>
      </div>
    );
  }

  const copy = COPY[view.status];
  const ready = view.status === "ready";
  // Built outside the JSX: a template literal inside it reads as hardcoded
  // copy to the i18n ratchet, and a percentage is a number either way.
  const commissionLabel =
    view.commissionRateBps == null
      ? null
      : `${(view.commissionRateBps / 100).toFixed(
          view.commissionRateBps % 100 === 0 ? 0 : 2,
        )}%`;

  return (
    <div className="mt-6 space-y-5">
      <div
        className={
          ready
            ? "rounded-lg border border-paper/12 bg-night-soft/60 p-5"
            : "rounded-lg border border-gold/30 bg-gold/[0.06] p-5"
        }
      >
        <p className="font-sans text-ui font-semibold text-paper">
          {t(copy.title)}
        </p>
        <p className="mt-1.5 font-serif text-body text-paper/70 leading-[1.6]">
          {t(copy.body)}
        </p>
        {error ? (
          <p role="alert" className="mt-3 font-sans text-detail text-crimson-soft">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          onClick={start}
          disabled={busy}
          className="tap-press mt-4 inline-flex min-h-[44px] items-center rounded-pill bg-paper px-6 font-sans text-ui font-semibold text-night hover:bg-paper/90 disabled:opacity-60"
        >
          {busy ? t("shop.payoutsOpeningStripe") : t(copy.cta)}
        </button>
      </div>

      <dl className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-paper/10 bg-night-soft/60 p-5">
          <dt className="font-sans text-caption font-semibold uppercase tracking-[1.2px] text-paper/55">
            {t("shop.payoutsCanTakePayment")}
          </dt>
          <dd className="mt-2 font-sans text-ui text-paper">
            {view.chargesEnabled ? t("shop.payoutsYes") : t("shop.payoutsNotYet")}
          </dd>
        </div>
        <div className="rounded-lg border border-paper/10 bg-night-soft/60 p-5">
          <dt className="font-sans text-caption font-semibold uppercase tracking-[1.2px] text-paper/55">
            {t("shop.payoutsToYourBank")}
          </dt>
          <dd className="mt-2 font-sans text-ui text-paper">
            {view.payoutsEnabled ? t("shop.payoutsYes") : t("shop.payoutsNotYet")}
          </dd>
        </div>
      </dl>

      {commissionLabel ? (
        <div className="rounded-lg border border-paper/10 bg-night-soft/60 p-5">
          <p className="font-sans text-caption font-semibold uppercase tracking-[1.2px] text-paper/55">
            {t("shop.payoutsYourCommission")}
          </p>
          <p className="mt-2 font-display-serif text-heading text-paper">
            {commissionLabel}
          </p>
          <p className="mt-1.5 font-serif text-body text-paper/70 leading-[1.6]">
            {t("shop.payoutsCommissionNote")}
          </p>
        </div>
      ) : null}
    </div>
  );
}
