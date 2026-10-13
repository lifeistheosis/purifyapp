import fs from "node:fs";
import { describe, expect, it } from "vitest";

import { isNetworkFailure } from "@/lib/api/networkFailure";

describe("telling the engine's 'no connection' from a message of ours", () => {
  it("knows each engine's way of saying the request went nowhere", () => {
    for (const message of [
      "Failed to fetch", // Chrome, the Android app
      "Load failed", // Safari, the iPhone app
      "NetworkError when attempting to fetch resource.", // Firefox
      "Network request failed",
      "fetch failed", // Node
      "The Internet connection appears to be offline.",
      "The network connection was lost.",
      "  Failed to fetch  ",
      "FAILED TO FETCH",
      "net::ERR_INTERNET_DISCONNECTED",
      "GET https://example.test/api net::ERR_NAME_NOT_RESOLVED",
    ]) {
      expect(isNetworkFailure(message), message).toBe(true);
    }
  });

  it("leaves alone a message a route or a screen wrote on purpose", () => {
    for (const message of [
      "That order could not be found.",
      "Sign in to see your orders.",
      "Couldn't load your payout status.",
      "We failed to fetch your cart, and here is why.",
      "Load failed for this seller only",
      "Too many requests",
      "",
      null,
      undefined,
    ]) {
      expect(isNetworkFailure(message), String(message)).toBe(false);
    }
  });
});

describe("the shop's error state", () => {
  const states = fs.readFileSync("components/shop/ShopStates.tsx", "utf8");
  const en = JSON.parse(fs.readFileSync("lib/i18n/messages/en.json", "utf8")) as Record<string, string>;

  it("says its own plain line when the phone has no signal, never the engine's", () => {
    expect(states).toContain("isNetworkFailure(message)");
    // The plain line was written out in the component until 1.6, which kept
    // it in English on a phone set to any other language. It is in the
    // catalogs now: the screen asks for it by key, and the English under
    // that key is the same line.
    expect(states).toContain('ours ?? t("shop.couldntReachTheShop")');
    expect(en["shop.couldntReachTheShop"]).toBe("We couldn't reach the shop. Check your connection and try again.");
  });
});
