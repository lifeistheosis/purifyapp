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
//   * Native (Capacitor shell, detected via the PurifyNative UA token):
//     enforced once PLUS_ENFORCED_NATIVE flips at the Android launch.
//   * Web (ordinary browser): stays open until PLUS_ENFORCED_WEB flips,
//     which waits for a web checkout (Stripe) to exist.
// Both ship false; flipping a flag is the launch switch for that surface,
// with no call-site changes. A purchase on Android still writes the
// entitlement row, so the account is correctly Plus everywhere — the web
// simply does not *require* Plus yet.

function envEnabled(value: string | undefined): boolean {
  return value === "true" || value === "1";
}

/** Android launch switch. Enabled (without a code change) by setting
 * NEXT_PUBLIC_PLUS_ENFORCED_NATIVE="true" once Play Billing + the webhook
 * are verified on a real internal-testing device. Gates the native app
 * only. Defaults OFF. */
export const PLUS_ENFORCED_NATIVE = envEnabled(
  process.env.NEXT_PUBLIC_PLUS_ENFORCED_NATIVE,
);

/** Web launch switch. Stays OFF until a web checkout (Stripe) exists, so
 * browser users always have a way to buy back anything that gets gated.
 * Env-overridable (NEXT_PUBLIC_PLUS_ENFORCED_WEB) for when that day comes;
 * defaults OFF and should remain so for launch. */
export const PLUS_ENFORCED_WEB = envEnabled(
  process.env.NEXT_PUBLIC_PLUS_ENFORCED_WEB,
);

/** Is the Plus layer enforced for the surface this request came from? */
export function plusEnforcedFor(isNative: boolean): boolean {
  return isNative ? PLUS_ENFORCED_NATIVE : PLUS_ENFORCED_WEB;
}

/** Shape of a public.entitlements row (absent row = no entitlements). */
export type EntitlementRow = {
  is_supporter: boolean;
  plus_until: string | null;
  plus_source: string | null;
};

export type Entitlements = {
  /** Pre-launch supporter flag (lifetime sync promise). */
  supporter: boolean;
  /** Active Purify Plus subscription. */
  plus: boolean;
  /** May this account use cross-device sync? plus OR supporter. */
  sync: boolean;
  /** May this account use the Plus feature layer (Florilegium,
   * collections, ambience, audio)? Subscription only — the supporter
   * promise covers sync, not the feature layer. */
  plusFeatures: boolean;
};

/** Fully entitled. Returned for any surface where Plus is not enforced
 * (the web today, and the native app until its launch switch flips). */
export const OPEN_ENTITLEMENTS: Entitlements = {
  supporter: false,
  plus: false,
  sync: true,
  plusFeatures: true,
};

/** Signed-out / no-row baseline once enforcement is on. Local reading
 * and saving never depend on entitlements; only sync and the Plus
 * layer do. */
export const FREE_ENTITLEMENTS: Entitlements = {
  supporter: false,
  plus: false,
  sync: false,
  plusFeatures: false,
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
  const supporter = row.is_supporter === true;
  const plus =
    !!row.plus_until && new Date(row.plus_until).getTime() > now.getTime();
  return {
    supporter,
    plus,
    sync: supporter || plus,
    plusFeatures: plus,
  };
}
