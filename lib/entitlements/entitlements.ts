// The v10 entitlement model, in one place. Pure derivation, no fs and
// no "use client", importable from server routes and client components
// alike.
//
// The locked model (docs/launch/SHIP-HIDE-DEFER.md, pricing page, FAQ):
//   * Free: the entire library and every local reader tool, no account.
//   * Purify Plus: cross-device sync + the enhanced layer (Florilegium,
//     custom florilegia, guided collections, ambience, future audio).
//   * Pre-launch supporter: LIFETIME cross-device sync. Sync only; the
//     wider Plus feature set stays with the subscription.
//
// ── Enforcement: ON wherever Plus can be bought, and nowhere else ───────
// The owner's direction, 2026-09-25: Plus is locked. A free reader sees every
// Plus feature, and using one opens the Purify Plus sheet. Until then all
// three switches shipped off, so Plus gated nothing anywhere, while it sold on
// Google Play and on the web.
//
// One rule decides every surface, resolveEnforcement() below:
//
//   1. NEVER LOCK WHAT CANNOT BE BOUGHT. A surface is enforced only when the
//      build carries that surface's purchase key. Without it the upgrade sheet
//      has nothing to sell, and a reader would be locked out of something
//      they have no way to buy back. This holds even against an explicit
//      "true", because that failure is the one this module exists to prevent.
//   2. An explicit "false" (or "0") turns a surface off. That is the
//      emergency switch, set in Render or the GitHub secret, no deploy of code.
//   3. Otherwise the surface's default applies. Web and Android default ON.
//      iOS defaults OFF: its App Store products sit at MISSING_METADATA, and
//      App Review was told iOS enforcement ships off
//      (docs/app-store-review-notes.md). It needs its products live and an
//      explicit NEXT_PUBLIC_PLUS_ENFORCED_IOS="true".
//
// A purchase on any surface writes the same entitlement row, so the account is
// correctly Plus everywhere; the surfaces differ only in what they require.

/** "true"/"1" is on, "false"/"0" is off, anything else (unset, empty) is no
 * opinion, so the default applies. Empty matters: a GitHub secret that does
 * not exist arrives as "". */
export function envSwitch(value: string | undefined): boolean | null {
  const v = value?.trim().toLowerCase();
  if (v === "true" || v === "1") return true;
  if (v === "false" || v === "0") return false;
  return null;
}

/** The one rule, pure so it can be tested without a build. */
export function resolveEnforcement(opts: {
  /** envSwitch() of the surface's own variable. */
  explicit: boolean | null;
  /** What the surface does when nobody has said. */
  defaultOn: boolean;
  /** Does this build carry the key the upgrade sheet buys with? */
  canSell: boolean;
}): boolean {
  if (!opts.canSell) return false;
  return opts.explicit ?? opts.defaultOn;
}

function present(value: string | undefined): boolean {
  return !!value && value.trim().length > 0;
}

/** Android: Google Play through RevenueCat (lib/billing/revenuecat.ts). The
 * legacy NEXT_PUBLIC_PLUS_ENFORCED_NATIVE still speaks for Android when the
 * Android variable is silent, and deliberately never reaches iOS. */
export const PLUS_ENFORCED_ANDROID = resolveEnforcement({
  explicit:
    envSwitch(process.env.NEXT_PUBLIC_PLUS_ENFORCED_ANDROID) ??
    envSwitch(process.env.NEXT_PUBLIC_PLUS_ENFORCED_NATIVE),
  defaultOn: true,
  canSell: present(process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY),
});

/**
 * iOS, separate from Android on purpose.
 *
 * The SAME GitHub secret, NEXT_PUBLIC_PLUS_ENFORCED_NATIVE, is passed to both
 * .github/workflows/android-apk.yml and .github/workflows/ios-release.yml, so a
 * shared native switch would enforce Plus on an iOS build where nobody can buy
 * it. Off by default, and off without the iOS purchase key whatever is set.
 */
export const PLUS_ENFORCED_IOS = resolveEnforcement({
  explicit: envSwitch(process.env.NEXT_PUBLIC_PLUS_ENFORCED_IOS),
  defaultOn: false,
  canSell: present(process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY),
});

/** Web: RevenueCat Web Billing, backed by Stripe
 * (components/billing/WebPlusCheckout.tsx). On wherever the website build has
 * the Web Billing key, which is also what makes the sheet able to sell. */
export const PLUS_ENFORCED_WEB = resolveEnforcement({
  explicit: envSwitch(process.env.NEXT_PUBLIC_PLUS_ENFORCED_WEB),
  defaultOn: true,
  canSell: present(process.env.NEXT_PUBLIC_REVENUECAT_WEB_KEY),
});

/**
 * Where a request or render is happening.
 *
 * "native-unknown" is a real state, not a fallback for laziness: the server
 * sees one "PurifyNative" UA token for both shells, deliberately
 * (lib/platform/native.ts explains why splitting the token is worse), and on
 * the client Capacitor may not have injected itself yet.
 */
export type Surface = "web" | "android" | "ios" | "native-unknown";

/** Is the Plus layer enforced for this surface? */
export function plusEnforcedFor(surface: Surface): boolean {
  switch (surface) {
    case "web":
      return PLUS_ENFORCED_WEB;
    case "android":
      return PLUS_ENFORCED_ANDROID;
    case "ios":
      return PLUS_ENFORCED_IOS;
    case "native-unknown":
      // Cannot tell which store build is asking, so enforce only when BOTH are
      // launched. Erring open leaves a subscriber briefly ungated, which costs
      // nothing; erring closed locks a reader out of something they have no way
      // to buy, which is the failure this whole module is shaped to prevent.
      return PLUS_ENFORCED_ANDROID && PLUS_ENFORCED_IOS;
  }
}

/** Shape of a public.entitlements row (absent row = no entitlements). */
export type EntitlementRow = {
  is_supporter: boolean;
  plus_until: string | null;
  plus_source: string | null;
  /** Active Purify Pro subscription end, if any. Optional so older callers
   * and rows without the column still type. NULL or past = not Pro. */
  pro_until?: string | null;
};

export type Entitlements = {
  /** Pre-launch supporter flag (lifetime sync promise). */
  supporter: boolean;
  /** Active Purify Plus subscription (or Pro, which includes Plus). */
  plus: boolean;
  /** Active Purify Pro subscription (the members' tier: monthly mailed
   * icon + shop codes). Pro implies Plus, not the reverse. */
  pro: boolean;
  /** May this account use cross-device sync? plus OR supporter. */
  sync: boolean;
  /** May this account use the Plus feature layer (Florilegium,
   * collections, ambience, audio)? Subscription only — the supporter
   * promise covers sync, not the feature layer. */
  plusFeatures: boolean;
  /** May this account use the Pro software layer (premium reading modes,
   * future studio audio)? Feature access only — unlike `pro` it says
   * nothing about physical fulfillment (the EIKON Box loop reads
   * pro_until from the table directly, same as shipping). */
  proFeatures: boolean;
};

/** Fully entitled. Returned for any surface where Plus is not enforced
 * (the web today, and the native app until its launch switch flips). */
export const OPEN_ENTITLEMENTS: Entitlements = {
  supporter: false,
  plus: false,
  // Pro is a real, paid membership; never granted to everyone by the open
  // gate. The Pro fulfillment loop reads pro_until from the table directly.
  pro: false,
  sync: true,
  plusFeatures: true,
  proFeatures: true,
};

/** Signed-out / no-row baseline once enforcement is on. Local reading
 * and saving never depend on entitlements; only sync and the Plus
 * layer do. */
export const FREE_ENTITLEMENTS: Entitlements = {
  supporter: false,
  plus: false,
  pro: false,
  sync: false,
  plusFeatures: false,
  proFeatures: false,
};

/**
 * Derive the entitlement model from a row.
 *
 * @param row      the user's public.entitlements row, or null when absent.
 * @param opts.enforced  whether Plus is enforced for this surface — pass
 *                       plusEnforcedFor(isNative). When false, everyone is
 *                       fully entitled (OPEN_ENTITLEMENTS) and the row is
 *                       ignored. When true, the row governs.
 * @param opts.now  clock injection point for tests; defaults to now.
 */
export function deriveEntitlements(
  row: EntitlementRow | null | undefined,
  opts: { enforced: boolean; now?: Date },
): Entitlements {
  if (!opts.enforced) return OPEN_ENTITLEMENTS;
  if (!row) return FREE_ENTITLEMENTS;
  const now = opts.now ?? new Date();
  const active = (ts: string | null | undefined) =>
    !!ts && new Date(ts).getTime() > now.getTime();
  const supporter = row.is_supporter === true;
  const pro = active(row.pro_until);
  // Pro is a superset of Plus: an active Pro subscription grants Plus too.
  const plus = pro || active(row.plus_until);
  return {
    supporter,
    plus,
    pro,
    sync: supporter || plus,
    plusFeatures: plus,
    proFeatures: pro,
  };
}

/**
 * Does this account's row earn free EIKON shipping? Pro only — the perk
 * moved from Plus to Pro with the ladder restructure (Beta 2.1). Pure so
 * the server checkout (lib/shop/checkout.ts) and the client cart display
 * apply the identical rule. Unlike deriveEntitlements this is NOT gated
 * by the enforcement flags: shipping is a perk of paying for Pro, never
 * something the open pre-launch gate hands out.
 */
export function proShipsFree(
  row: Pick<EntitlementRow, "pro_until"> | null | undefined,
  now?: Date,
): boolean {
  const until = row?.pro_until;
  if (!until) return false;
  const at = (now ?? new Date()).getTime();
  const ts = new Date(until).getTime();
  return Number.isFinite(ts) && ts > at;
}
