"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { MerchantApplyForm } from "@/components/shop/MerchantApplyForm";
import { resolveUser } from "@/lib/supabase/resolveUser";
import { useTranslate } from "@/components/i18n/MessagesProvider";

/**
 * The "Apply" section of the Sell page, gated on the signed-in state resolved
 * client-side so the page works in the native local-first export. When the
 * check can't complete (auth lock, network — F-13), offer a retry instead of
 * showing "Sign in to apply" to someone who may already be signed in.
 */
export function MerchantApplyGate() {
  const { t } = useTranslate();
  const [state, setState] = useState<
    "loading" | "in" | "out" | "unresolved"
  >("loading");
  const [attempt, setAttempt] = useState(0);

  // The retry handler resets to "loading" before bumping `attempt` (state
  // updates belong in handlers, not effect bodies).
  useEffect(() => {
    let cancelled = false;
    resolveUser().then((auth) => {
      if (cancelled) return;
      if (auth.state === "signed-in") setState("in");
      else if (auth.state === "signed-out") setState("out");
      else setState("unresolved");
    });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (state === "loading") {
    return (
      <p className="mt-5 font-sans text-caption text-paper/45">{t("common.loading")}</p>
    );
  }
  if (state === "unresolved") {
    return (
      <div className="mt-5 rounded-lg border border-paper/10 bg-night-soft/60 p-6">
        <p className="font-serif text-body text-paper/70 leading-[1.65]">
          {t("ui.weCouldnTConfirmYour")}
        </p>
        <button
          type="button"
          onClick={() => {
            setState("loading");
            setAttempt((n) => n + 1);
          }}
          className="tap-press mt-4 inline-flex min-h-[44px] items-center rounded-pill border border-paper/25 px-6 font-sans text-ui font-semibold text-paper hover:border-paper/45"
        >
          {t("error.tryAgain")}
        </button>
      </div>
    );
  }
  if (state === "in") {
    return (
      <div className="mt-5">
        <MerchantApplyForm />
      </div>
    );
  }
  return (
    <div className="mt-5 rounded-lg border border-paper/10 bg-night-soft/60 p-6">
      <p className="font-serif text-body text-paper/70 leading-[1.65]">
        {t("shop.applicationsAreTiedToA")}
      </p>
      <Link
        href="/signin?next=/shop/sell"
        className="tap-press mt-4 inline-flex min-h-[48px] items-center rounded-pill bg-paper px-7 font-sans text-ui font-semibold text-night hover:bg-paper/90"
      >
        {t("shop.signInToApply")}
      </Link>
    </div>
  );
}
