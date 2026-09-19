"use client";

// Open a Stripe Checkout URL the right way per platform. On the web a plain
// redirect; inside the native shell the in-app browser, returning the buyer
// to their orders when it closes (the webhook settles payment state, and the
// success/cancelled pages inside the browser do their own work first).

import { isNativeClient } from "@/lib/platform/native";

export async function openStripe(
  url: string,
  onNativeReturn: () => void,
): Promise<void> {
  if (!isNativeClient()) {
    window.location.href = url;
    return;
  }
  const { Browser } = await import("@capacitor/browser");
  const sub = await Browser.addListener("browserFinished", () => {
    void sub.remove();
    onNativeReturn();
  });
  await Browser.open({ url });
}

export type NativeCheckoutOutcome = "paid" | "left" | "unknown";

/**
 * What happened, once the native in-app browser closes on a checkout.
 *
 * The web gets this from Stripe's own cancel link, which lands on
 * /shop/checkout/cancelled and cancels the order. The native shell had no
 * equivalent: closing the in-app browser went straight to "Your orders", with
 * the unpaid checkout sitting there, and a buyer who had only changed their
 * mind was shown an order. This asks the same cancel route, which asks Stripe
 * first: a session that completed is refused (409) and reads as paid, an open
 * one is expired and the order cancelled, so it can never cancel a real
 * payment.
 */
export async function closeNativeCheckout(orderId: string | undefined): Promise<NativeCheckoutOutcome> {
  if (!orderId) return "unknown";
  try {
    const { apiFetch } = await import("@/lib/api/client");
    const res = await apiFetch("/api/shop/checkout/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    if (res.status === 409) return "paid";
    const data = (await res.json().catch(() => ({}))) as { status?: string };
    if (data.status === "cancelled") return "left";
    if (data.status === "paid") return "paid";
    return "unknown";
  } catch {
    return "unknown";
  }
}
