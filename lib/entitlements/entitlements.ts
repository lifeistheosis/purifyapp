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
// ── Enforcement is SCOPED PER SURFACE ──────────────────────────────────
// Billing is platform-specific: the Android app sells Purify Plus through
// Google Play (RevenueCat → Play Billing); the website has no checkout
// yet. Enforcing Plus globally would lock web users out of features they
// have no way to buy back. So enforcement is gated by *where the request
// comes from*:
//   * Android (Play Billing via RevenueCat, the only place Plus sells
//     today): enforced once PLUS_ENFORCED_ANDROID flips at the Play launch.
//   * iOS: its own switch, PLUS_ENFORCED_IOS, because the App Store
//     products are not purchasable yet. One shared native switch would have
//     locked iOS readers out of features they cannot buy.
//   * Web (ordinary browser): stays open until PLUS_ENFORCED_WEB flips,
//     which waits for a web checkout (Stripe) to exist.
// All three ship false; flipping a flag is the launch switch for that
// surface, with no call-site changes. A purchase on Android still writes the
// entitlement row, so the account is correctly Plus everywhere. The other
// surfaces simply do not *require* Plus yet.

function envEnabled(value: string | undefined): boolean {
  return value === "true" || value === "1";
}

/** The legacy single native switch. Kept because every launch checklist and
 * doc names it, and all of them mean the ANDROID launch
 * (docs/google-play/ANDROID_SUBSCRIPTION_CHECKLIST.md,
 * docs/launch/ANDROID-LAUNCH-CHECKLIST.md). It continues to mean exactly
 * that, and deliberately does NOT reach iOS. See PLUS_ENFORCED_IOS. */
const LEGACY_NATIVE = envEnabled(process.env.NEXT_PUBLIC_PLUS_ENFORCED_NATIVE);

/** Android launch switch. Enabled (without a code change) by setting
 * NEXT_PUBLIC_PLUS_ENFORCED_ANDROID="true" once Play Billing + the webhook
 * are verified on a real internal-testing device. Defaults OFF. */
export const PLUS_ENFORCED_ANDROID =
  envEnabled(process.env.NEXT_PUBLIC_PLUS_ENFORCED_ANDROID) || LEGACY_NATIVE;

/**
 * iOS launch switch, separate from Android on purpose.
 *
 * The two store builds are not interchangeable: Purify Plus sells on Play
 * today, while on the App Store its two products sit at MISSING_METADATA and
 * are not attached to any submission. A single native switch would therefore
 * enforce Plus in a build where nobody can buy it, which is precisely the harm
 * PLUS_ENFORCED_WEB was created to avoid on the web.
 *
 * This is not hypothetical. The SAME GitHub secret,
 * NEXT_PUBLIC_PLUS_ENFORCED_NATIVE, is passed to both
 * .github/workflows/android-apk.yml and .github/workflows/ios-release.yml, so
 * throwing the Android launch switch would have enforced Plus on the next iOS
 * build as a side effect.
 *
 * Requires its own explicit opt-in. Defaults OFF, and should stay OFF until
 * the iOS subscriptions are approved and purchasable.
 */
export const PLUS_ENFORCED_IOS = envEnabled(
  process.env.NEXT_PUBLIC_PLUS_ENFORCED_IOS,
);

/** Web launch switch. Stays OFF until a web checkout (Stripe) exists, so
 * browser users always have a way to buy back anything that gets gated.
 * Env-overridable (NEXT_PUBLIC_PLUS_ENFORCED_WEB) for when that day comes;
 * defaults OFF and should remain so for launch. */
export const PLUS_ENFORCED_WEB = envEnabled(
  process.env.NEXT_PUBLIC_PLUS_ENFORCED_WEB,
);

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
