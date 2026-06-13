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
// DARK LAUNCH: while ENTITLEMENTS_ENFORCED is false, everyone derives
// as fully entitled and nothing in the app is gated. The v10 release
// flips the flag after billing (store IAP + web) is live and the
// supporter rows are seeded. Flipping the flag is the launch switch;
// no call-site changes needed.

export const ENTITLEMENTS_ENFORCED = false;

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

/** Everyone is fully entitled until enforcement flips at v10. */
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

export function deriveEntitlements(
  row: EntitlementRow | null | undefined,
  now: Date = new Date(),
): Entitlements {
  if (!ENTITLEMENTS_ENFORCED) return OPEN_ENTITLEMENTS;
  if (!row) return FREE_ENTITLEMENTS;
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
