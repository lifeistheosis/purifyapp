"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useTranslate } from "@/components/i18n/MessagesProvider";
import { apiFetch } from "@/lib/api/client";

/**
 * On a sold-out piece: "Tell me when it is back". One email when it returns,
 * then the alert is done. Signed in only, because the email goes to the
 * account's own address.
 */
export function BackInStockButton({ productId }: { productId: string }) {
  const { t } = useTranslate();
  const [state, setState] = useState<"loading" | "signed-out" | "off" | "on" | "unavailable">("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    apiFetch(`/api/shop/stock-alerts?productId=${encodeURIComponent(productId)}`)
      .then(async (res) => {
        if (!alive) return;
        if (!res.ok) return setState("unavailable");
        const data = (await res.json()) as { alerted: boolean; signedIn: boolean };
        setState(!data.signedIn ? "signed-out" : data.alerted ? "on" : "off");
      })
      .catch(() => alive && setState("unavailable"));
    return () => {
      alive = false;
    };
  }, [productId]);

  async function toggle() {
    if (busy || (state !== "on" && state !== "off")) return;
    setBusy(true);
    try {
      const res = await apiFetch("/api/shop/stock-alerts", {
        method: state === "on" ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (res.ok) {
        const data = (await res.json()) as { alerted: boolean };
        setState(data.alerted ? "on" : "off");
      }
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading" || state === "unavailable") return null;

  if (state === "signed-out") {
    return (
      <p className="mt-3 font-sans text-caption text-paper/60">
        <Link href="/signin" className="underline underline-offset-2">
          {t("shop.backInStock.signIn")}
        </Link>
      </p>
    );
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={busy}
        aria-pressed={state === "on"}
        className="tap-press w-full rounded-pill border border-gold/40 bg-gold/[0.08] px-5 py-2.5 font-sans text-detail font-semibold text-gold transition-colors hover:bg-gold/[0.14] disabled:opacity-50"
      >
        {state === "on" ? t("shop.backInStock.cancel") : t("shop.backInStock.ask")}
      </button>
      {state === "on" ? (
        <p className="mt-2 font-sans text-caption text-paper/60">{t("shop.backInStock.on")}</p>
      ) : null}
    </div>
  );
}
