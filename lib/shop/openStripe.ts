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
