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
import { isNativeClient } from "@/lib/platform/native";
import {
  deriveEntitlements,
  plusEnforcedFor,
  OPEN_ENTITLEMENTS,
  FREE_ENTITLEMENTS,
  type Entitlements,
  type EntitlementRow,
} from "./entitlements";

export async function getClientEntitlements(): Promise<Entitlements> {
  const enforced = plusEnforcedFor(isNativeClient());
  if (!enforced) return OPEN_ENTITLEMENTS;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return FREE_ENTITLEMENTS;

  const { data, error } = await supabase
    .from("entitlements")
    .select("is_supporter, plus_until, plus_source")
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

/**
 * Does the signed-in user hold an active Purify Plus subscription right now?
 * The browser counterpart to lib/shop/checkout → hasActivePlus, used to show
 * the free-shipping line in the shop. Unlike getClientEntitlements this is NOT
 * gated on the enforcement flags: free EIKON shipping is a perk of actually
 * holding Plus, so it reads the entitlements row directly (RLS self-select).
 */
export async function hasActivePlusClient(): Promise<boolean> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await supabase
      .from("entitlements")
      .select("plus_until")
      .eq("user_id", user.id)
      .maybeSingle();
    return !!data?.plus_until && new Date(data.plus_until) > new Date();
  } catch {
    return false;
  }
}
