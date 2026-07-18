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
};

async function activeUserIds(
  supa: SupabaseClient,
  column: "plus_until" | "pro_until",
): Promise<Set<string>> {
  const nowIso = new Date().toISOString();
  const { data } = await supa
    .from("entitlements")
    .select("user_id")
    .gt(column, nowIso);
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

  // Restrict to entitled users for plus/pro.
  let allowIds: Set<string> | null = null;
  if (audience === "plus") allowIds = await activeUserIds(supa, "plus_until");
  else if (audience === "pro") allowIds = await activeUserIds(supa, "pro_until");

  if (wantWeb) {
    const { data } = await supa
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth, user_id");
    webSubs = (data ?? [])
      .filter((r) => !allowIds || allowIds.has((r as { user_id: string }).user_id))
      .map((r) => {
        const s = r as { endpoint: string; p256dh: string; auth: string };
        return { endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth };
      });
  }

  if (wantNative) {
    const { data } = await supa
      .from("device_push_tokens")
      .select("token, platform, user_id");
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
  };
}
