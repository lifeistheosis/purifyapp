"use client";

// Client-side entitlement lookup, the browser counterpart to
// lib/entitlements/server.ts. Used by the sync modules (lib/sync/*) to
// gate cross-device sync, which runs entirely on the client.
//
// Enforcement is surface-scoped exactly like the server: the native shell
// enforces Plus once PLUS_ENFORCED_NATIVE is on; the web stays open until
// web billing exists. When the relevant switch is off this never queries —
// the caller gets OPEN_ENTITLEMENTS — so gating is a no-op until launch.

import { createClient } from "@/lib/supabase/client";
import { isNativeClient, nativePlatform } from "@/lib/platform/native";
import { isDeveloperEmail, DEV_PLUS_ENTITLEMENTS } from "@/lib/dev/developer";
import { devPlusCookiePresent } from "@/lib/dev/options";
import {
  deriveEntitlements,
  plusEnforcedFor,
  proShipsFree,
  OPEN_ENTITLEMENTS,
  FREE_ENTITLEMENTS,
  type Entitlements,
  type EntitlementRow,
  type Surface,
} from "./entitlements";

/**
 * Which surface is this browser? The client is the only place that can tell
 * the two store builds apart: Capacitor names the platform, while the server
 * sees one shared "PurifyNative" UA token for both.
 *
 * A native shell whose Capacitor bridge has not injected itself yet reports
 * "native-unknown", which enforces only when both stores are launched. That is
 * the safe direction: a subscriber stays briefly ungated instead of a reader
 * being locked out of something their store does not sell.
 */
export function clientSurface(): Surface {
  if (!isNativeClient()) return "web";
  const platform = nativePlatform();
  if (platform === "ios") return "ios";
  if (platform === "android") return "android";
  return "native-unknown";
}

export async function getClientEntitlements(): Promise<Entitlements> {
  // Developer test-premium override. The cookie is only a hint (cheap
  // pre-check); we still verify the signed-in account is an allowlisted
  // developer, so a forged cookie grants a normal user nothing.
  if (devPlusCookiePresent()) {
    const dev = createClient();
    const {
      data: { user },
    } = await dev.auth.getUser();
    if (isDeveloperEmail(user?.email)) return DEV_PLUS_ENTITLEMENTS;
  }

  const enforced = plusEnforcedFor(clientSurface());
  if (!enforced) return OPEN_ENTITLEMENTS;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return FREE_ENTITLEMENTS;

  const { data, error } = await supabase
    .from("entitlements")
    .select("is_supporter, plus_until, plus_source, pro_until")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    // Never break the UI on an entitlement read; treat as no extra
    // entitlements (local reading/saving never depends on this).
    return FREE_ENTITLEMENTS;
  }

  return deriveEntitlements(data as EntitlementRow | null, { enforced: true });
}

/** May this client use cross-device sync right now? True on the web and on
 * the native app until its launch switch flips; once enforced, true only
 * for Plus subscribers or pre-launch supporters. */
export async function canSync(): Promise<boolean> {
  return (await getClientEntitlements()).sync;
}

export type PremiumTier = "free" | "plus" | "pro";

/**
 * The signed-in user's actual premium tier, read straight from the
 * entitlements row. Deliberately NOT gated on the enforcement flags: a
 * comped or paid account holds Plus/Pro regardless of whether the Plus
 * layer is enforced on this surface, and the nav "Activated" badge should
 * reflect what they actually have. Fails open to "free" and races a short
 * timeout so it can never hang the header (same guard as
 * hasActiveProClient — a held cross-tab auth lock must not stall the nav).
 */
export async function getClientPremiumTier(): Promise<PremiumTier | "unknown"> {
  const check = (async (): Promise<PremiumTier> => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return "free";
    const { data } = await supabase
      .from("entitlements")
      .select("plus_until, pro_until")
      .eq("user_id", user.id)
      .maybeSingle();
    const now = Date.now();
    const active = (ts?: string | null) => !!ts && new Date(ts).getTime() > now;
    if (active(data?.pro_until)) return "pro";
    if (active(data?.plus_until)) return "plus";
    return "free";
  })();
  // On a hung read (a held cross-tab auth lock), resolve to "unknown" rather
  // than "free": the caller keeps its last known / cached tier instead of
  // flashing the account down to Free. A genuine free/no-row read still
  // returns "free" from the check above.
  const timeout = new Promise<"unknown">((resolve) =>
    setTimeout(() => resolve("unknown"), 3000),
  );
  return Promise.race([check, timeout]).catch(() => "unknown");
}

export type ClientPlan = {
  tier: PremiumTier;
  plusUntil: string | null;
  proUntil: string | null;
  source: string | null;
  supporter: boolean;
};

/**
 * Full plan detail for the /plan screen: tier + the period-end dates +
 * source. Same direct entitlement read + timeout guard as
 * getClientPremiumTier; returns "unknown" on a hung read so the screen can
 * keep waiting rather than showing Free.
 */
export async function getClientPlan(): Promise<ClientPlan | "unknown"> {
  const FREE: ClientPlan = {
    tier: "free",
    plusUntil: null,
    proUntil: null,
    source: null,
    supporter: false,
  };
  const check = (async (): Promise<ClientPlan> => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return FREE;
    const { data } = await supabase
      .from("entitlements")
      .select("is_supporter, plus_until, plus_source, pro_until")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!data) return FREE;
    const now = Date.now();
    const active = (ts?: string | null) => !!ts && new Date(ts).getTime() > now;
    const pro = active(data.pro_until as string | null);
    const plus = pro || active(data.plus_until as string | null);
    return {
      tier: pro ? "pro" : plus ? "plus" : "free",
      plusUntil: (data.plus_until as string | null) ?? null,
      proUntil: (data.pro_until as string | null) ?? null,
      source: (data.plus_source as string | null) ?? null,
      supporter: data.is_supporter === true,
    };
  })();
  const timeout = new Promise<"unknown">((resolve) =>
    setTimeout(() => resolve("unknown"), 3500),
  );
  return Promise.race([check, timeout]).catch(() => "unknown");
}

/**
 * Do the signed-in user's EIKON orders ship free right now? The browser
 * counterpart to lib/shop/checkout → hasProShipping, used to show the
 * free-shipping line in the shop. Free shipping is a Purify PRO perk (it
 * moved from Plus with the Beta 2.1 ladder restructure); the date rule is
 * the shared proShipsFree predicate so display and checkout can never
 * disagree. Unlike getClientEntitlements this is NOT gated on the
 * enforcement flags: it is a perk of actually holding Pro, so it reads
 * the entitlements row directly (RLS self-select).
 *
 * HARD TIME LIMIT, fail open to `false`: supabase-js's getUser() waits on a
 * cross-tab navigator.locks auth lock, and a held lock in another tab can
 * block it indefinitely. This check is display-only (the server recomputes
 * shipping at checkout), and it sits in the product page's critical path —
 * observed live 2026-07-11: catalog APIs returned 200 while the page hung on
 * this call forever. A public page must never wait on an entitlement nicety.
 */
export async function hasActiveProClient(): Promise<boolean> {
  const check = (async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await supabase
      .from("entitlements")
      .select("pro_until")
      .eq("user_id", user.id)
      .maybeSingle();
    return proShipsFree(data);
  })();
  const timeout = new Promise<boolean>((resolve) =>
    setTimeout(() => resolve(false), 2500),
  );
  return Promise.race([check, timeout]).catch(() => false);
}
