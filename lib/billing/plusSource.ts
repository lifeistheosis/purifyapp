/**
 * The store a RevenueCat event names, to Purify's word for where a member's
 * Plus came from (entitlements.plus_source).
 *
 * Read by the plan screen (which store to name), the support console (who can
 * refund it, lib/admin/support.ts), the renewal-failed email (where to fix the
 * card, lib/email/templates/account.ts) and every paying count in the admin
 * (lib/entitlements/adminStats.ts).
 */

// RevenueCat store to our plus_source vocabulary (entitlements.plus_source).
//
// FIXED 2026-11-09. This mapped every store it did not name to "google", and
// it named neither RC_BILLING nor TEST_STORE. RC_BILLING is RevenueCat Web
// Billing, which is how the website sells Plus (lib/billing/revenuecatWeb.ts),
// so every member who paid on the website was recorded as a Google Play
// member: the plan screen said "Google Play", the support console said only
// Google could refund them, a failed renewal emailed them to fix it in Google
// Play, and the admin priced their Plus with a store's cut. PROMOTIONAL, an
// entitlement granted free from RevenueCat's dashboard, was counted as a
// paying Google member, and so was every purchase made with test money.
//
//   APP_STORE, MAC_APP_STORE  -> apple
//   PLAY_STORE                -> google
//   STRIPE, RC_BILLING        -> stripe   (the website)
//   PROMOTIONAL               -> comp     (nobody paid)
//   SANDBOX, TEST_STORE       -> test     (test money: access, never income)
//   anything else             -> unknown  (said, never guessed)
//
// A test purchase still grants Plus, so testing works; "test" keeps it out of
// every paying count (lib/entitlements/adminStats.ts).
export function sourceForStore(store: string | undefined, environment?: string): string {
  if (environment === "SANDBOX" || store === "TEST_STORE") return "test";
  switch (store) {
    case "APP_STORE":
    case "MAC_APP_STORE":
      return "apple";
    case "PLAY_STORE":
      return "google";
    case "STRIPE":
    case "RC_BILLING":
      return "stripe";
    case "PROMOTIONAL":
      return "comp";
    default:
      console.warn(`[revenuecat] unmapped store ${store ?? "(none)"}; recorded as unknown`);
      return "unknown";
  }
}
