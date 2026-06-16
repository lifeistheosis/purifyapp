// Server-side entitlement lookup. Reads the signed-in user's
// entitlements row (RLS-scoped to the owner) and derives the model.
//
// Enforcement is surface-scoped (see lib/entitlements/entitlements.ts):
// the native shell enforces Plus once its launch switch flips, the web
// stays open until web billing exists. We detect the surface from the
// PurifyNative UA token on the request. While the relevant switch is
// false this never even queries — every caller gets OPEN_ENTITLEMENTS —
// so it is free to sprinkle at call sites now and have them light up
// correctly when the flag flips.

import { createClient } from "@/lib/supabase/server";
import { isNativeRequest } from "@/lib/platform/nativeRequest";
import {
  deriveEntitlements,
  plusEnforcedFor,
  OPEN_ENTITLEMENTS,
  FREE_ENTITLEMENTS,
  type Entitlements,
  type EntitlementRow,
} from "./entitlements";

export async function getEntitlements(): Promise<Entitlements> {
  const enforced = plusEnforcedFor(await isNativeRequest());
  if (!enforced) return OPEN_ENTITLEMENTS;

  const supabase = await createClient();
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
    // Never hard-fail a page on an entitlement read. Treat a lookup
    // error as "no extra entitlements" — the free experience always
    // works, so the user is never locked out of what they own locally.
    console.error("[entitlements] lookup failed", error.message);
    return FREE_ENTITLEMENTS;
  }

  return deriveEntitlements(data as EntitlementRow | null, { enforced: true });
}
