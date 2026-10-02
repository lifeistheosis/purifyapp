import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { communityPushCopy, type CommunityPushKind } from "@/lib/push/copy";
import { broadcast, type NativeToken, type WebSub } from "@/lib/push/send";
import { rateLimited } from "@/lib/security/ratelimit";

// Community notifications on the reader's own devices: a reply, a mention, a
// follow, a name day greeting, a prayer, an answer from clergy. Sent after
// the inbox row is written (lib/community/notify.ts), to every device the
// reader has turned notifications on for, unless they switched community
// notifications off (profiles.push_community, 20261005).
//
// The words come from lib/push/copy.ts and nowhere else, like every other
// push. Best effort throughout: a push that cannot go never fails the request
// that caused it, and the inbox row is already there.

/** At most this many community pushes reach one reader in an hour. */
export const PUSH_PER_HOUR = 12;

export type PushRow = {
  user_id: string;
  kind: CommunityPushKind;
  post_id?: string | null;
  actor_name: string;
  actor_handle?: string | null;
};

/** Where a notification opens: the post when there is one, else the person. */
function targetOf(row: PushRow): string | null {
  return row.post_id ?? row.actor_handle ?? null;
}

async function devicesOf(
  admin: SupabaseClient,
  userIds: string[],
): Promise<Map<string, { webSubs: WebSub[]; tokens: NativeToken[] }>> {
  const [web, native] = await Promise.all([
    admin.from("push_subscriptions").select("user_id, endpoint, p256dh, auth").in("user_id", userIds).limit(200),
    admin.from("device_push_tokens").select("user_id, token, platform").in("user_id", userIds).limit(200),
  ]);
  const out = new Map<string, { webSubs: WebSub[]; tokens: NativeToken[] }>();
  const slot = (id: string) => {
    if (!out.has(id)) out.set(id, { webSubs: [], tokens: [] });
    return out.get(id)!;
  };
  for (const r of (web.data ?? []) as (WebSub & { user_id: string })[]) {
    slot(r.user_id).webSubs.push({ endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth });
  }
  for (const r of (native.data ?? []) as (NativeToken & { user_id: string })[]) {
    if (r.platform === "ios" || r.platform === "android") slot(r.user_id).tokens.push({ token: r.token, platform: r.platform });
  }
  return out;
}

/** Send one push per row, to readers who have devices and have not switched these off. */
export async function sendCommunityPushes(admin: SupabaseClient, rows: PushRow[]): Promise<void> {
  try {
    const ids = [...new Set(rows.map((r) => r.user_id))];
    if (ids.length === 0) return;
    // Who switched community notifications off. Before 20261005 the column
    // is absent, and nobody has: the read fails and everyone counts as on.
    const { data: prefs } = await admin.from("profiles").select("id, push_community").in("id", ids);
    const off = new Set(
      ((prefs ?? []) as { id: string; push_community?: boolean | null }[]).filter((p) => p.push_community === false).map((p) => p.id),
    );
    const wanted = rows.filter((r) => !off.has(r.user_id));
    if (wanted.length === 0) return;
    const devices = await devicesOf(admin, [...new Set(wanted.map((r) => r.user_id))]);
    for (const row of wanted) {
      const targets = devices.get(row.user_id);
      if (!targets || (targets.webSubs.length === 0 && targets.tokens.length === 0)) continue;
      // A burst (a popular post, a busy name day) reaches the inbox in full
      // and the lock screen only so often.
      if (await rateLimited(`community-push:${row.user_id}`, 3600, PUSH_PER_HOUR)) continue;
      await broadcast(admin, communityPushCopy(row.kind, row.actor_name, targetOf(row)), targets);
    }
  } catch (e) {
    console.warn("[community] push not sent", e instanceof Error ? e.message : String(e));
  }
}
