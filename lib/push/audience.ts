import "server-only";

// Resolve a broadcast audience to the actual push destinations (web
// subscriptions + native tokens). Recipient count = number of
// destinations, i.e. how many notifications actually go out.
//
//   all    → every push_subscriptions row + every device_push_tokens row
//   plus   → users with active Plus (entitlements.plus_until > now)
//   pro    → users with active Pro (entitlements.pro_until > now)
//   web    → all web push subscriptions
//   native → all native device tokens

import type { SupabaseClient } from "@supabase/supabase-js";
import type { WebSub, NativeToken } from "./send";

export type Audience = "all" | "plus" | "pro" | "web" | "native";

export type ResolvedAudience = {
  webSubs: WebSub[];
  tokens: NativeToken[];
  webCount: number;
  nativeCount: number;
  total: number;
  /**
   * Query failures encountered while resolving. A missing table (the push
   * migrations were never applied to prod) previously surfaced as an empty
   * `data` and therefore as "0 recipients", which the broadcast log then
   * recorded as a successful-looking `enqueued`. Callers MUST treat a
   * non-empty list as a precondition failure and refuse to claim a send.
   */
  errors: string[];
};

async function activeUserIds(
  supa: SupabaseClient,
  column: "plus_until" | "pro_until",
  errors: string[],
): Promise<Set<string>> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supa
    .from("entitlements")
    .select("user_id")
    .gt(column, nowIso);
  if (error) errors.push(`entitlements.${column}: ${error.message}`);
  return new Set((data ?? []).map((r) => (r as { user_id: string }).user_id));
}

export async function resolveAudience(
  supa: SupabaseClient,
  audience: Audience,
): Promise<ResolvedAudience> {
  const wantWeb = audience !== "native";
  const wantNative = audience !== "web";

  let webSubs: WebSub[] = [];
  let tokens: NativeToken[] = [];
  const errors: string[] = [];

  // Restrict to entitled users for plus/pro.
  let allowIds: Set<string> | null = null;
  if (audience === "plus")
    allowIds = await activeUserIds(supa, "plus_until", errors);
  else if (audience === "pro")
    allowIds = await activeUserIds(supa, "pro_until", errors);

  if (wantWeb) {
    const { data, error } = await supa
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth, user_id");
    if (error) errors.push(`push_subscriptions: ${error.message}`);
    webSubs = (data ?? [])
      .filter((r) => !allowIds || allowIds.has((r as { user_id: string }).user_id))
      .map((r) => {
        const s = r as { endpoint: string; p256dh: string; auth: string };
        return { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth };
      });
  }

  if (wantNative) {
    const { data, error } = await supa
      .from("device_push_tokens")
      .select("token, platform, user_id");
    if (error) errors.push(`device_push_tokens: ${error.message}`);
    tokens = (data ?? [])
      .filter((r) => !allowIds || allowIds.has((r as { user_id: string }).user_id))
      .map((r) => {
        const t = r as { token: string; platform: "ios" | "android" };
        return { token: t.token, platform: t.platform };
      });
  }

  return {
    webSubs,
    tokens,
    webCount: webSubs.length,
    nativeCount: tokens.length,
    total: webSubs.length + tokens.length,
    errors,
  };
}
