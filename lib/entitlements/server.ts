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

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isNativeRequest } from "@/lib/platform/nativeRequest";
import { IS_STATIC_EXPORT } from "@/lib/platform/buildTarget";
import {
  isDeveloperEmail,
  DEV_PLUS_COOKIE,
  DEV_PLUS_ENTITLEMENTS,
} from "@/lib/dev/developer";
import {
  deriveEntitlements,
  plusEnforcedFor,
  OPEN_ENTITLEMENTS,
  FREE_ENTITLEMENTS,
  type Entitlements,
  type EntitlementRow,
} from "./entitlements";

/**
 * IS_STATIC_EXPORT is true while either native bundle is being exported, and it
 * is a build-time constant, so the branch it guards below is eliminated rather
 * than skipped and `cookies()` is never reached during the export.
 *
 * That matters here specifically: there is no request to read a cookie from in a
 * static render, so calling it opts the route into dynamic rendering, and the
 * export runs with `dynamic = "error"`. Merging feat/developer-options broke
 * `npm run build:android` on /florilegium in exactly this way. The same trap now
 * exists twice over, once per platform.
 */

export async function getEntitlements(): Promise<Entitlements> {
  // Developer test-premium override. Cookie is only a hint; we verify the
  // signed-in account is an allowlisted developer before granting.
  //
  // Absent from the native bundle on purpose. The Developer panel is a
  // web convenience, and the override is still honoured on the client
  // (lib/entitlements/client.ts), which is where the native app resolves
  // its entitlements anyway.
  if (
    !IS_STATIC_EXPORT &&
    (await cookies()).get(DEV_PLUS_COOKIE)?.value === "1"
  ) {
    const dev = await createClient();
    const {
      data: { user },
    } = await dev.auth.getUser();
    if (isDeveloperEmail(user?.email)) return DEV_PLUS_ENTITLEMENTS;
  }

  // The server cannot tell the two store builds apart: both shells send the
  // same "PurifyNative" UA token, deliberately (lib/platform/native.ts). It
  // therefore asks as "native-unknown", which enforces only when both stores
  // are launched. The native app resolves its own entitlements on the client
  // anyway (lib/entitlements/client.ts), where Capacitor names the platform.
  const enforced = plusEnforcedFor(
    (await isNativeRequest()) ? "native-unknown" : "web",
  );
  if (!enforced) return OPEN_ENTITLEMENTS;

  const supabase = await createClient();
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
    // Never hard-fail a page on an entitlement read. Treat a lookup
    // error as "no extra entitlements" — the free experience always
    // works, so the user is never locked out of what they own locally.
    console.error("[entitlements] lookup failed", error.message);
    return FREE_ENTITLEMENTS;
  }

  return deriveEntitlements(data as EntitlementRow | null, { enforced: true });
}
