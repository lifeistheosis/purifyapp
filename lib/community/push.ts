import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getMessages } from "@/lib/i18n";
import { communityPushCopy, type CommunityPushKind } from "@/lib/push/copy";
import { broadcast, type NativeToken, type WebSub } from "@/lib/push/send";
import { rateLimited } from "@/lib/security/ratelimit";

// Community notifications on the reader's own devices: a reply, a mention, a
// follow, a name day greeting, a prayer, an answer from clergy. Sent after
// the inbox row is written (lib/community/notify.ts), to every device the
// reader has turned notifications on for, and only to a reader who turned
// community notifications on (profiles.push_community, 20261005). Asked for,
// never on by default (CONTRIBUTING's reminders bar, clause 1): from
// 20261101 a new profile starts off, and a reader whose setting cannot be
// read is sent nothing.
//
// The words come from lib/push/copy.ts and nowhere else, like every other
// push, in the reader's own language (profiles.preferred_language, the
// catalogs' push.community.* keys), and they name nobody: the other reader's
// name is in the inbox row, inside the app, and never on a lock screen, so it
// is not even handed to this module. Best effort throughout: a push that
// cannot go never fails the request that caused it, and the inbox row is
// already there.

/** At most this many community pushes reach one reader in an hour. */
export const PUSH_PER_HOUR = 12;

export type PushRow = {
  user_id: string;
  kind: CommunityPushKind;
  post_id?: string | null;
  /** The address of the actor's profile, opened after the phone is unlocked; never shown. */
  actor_handle?: string | null;
};

type Prefs = { id: string; push_community?: boolean | null; preferred_language?: string | null };

/**
 * Who turned community notifications on, and each reader's language.
 *
 * Read with the language when the column is there (20260719), and without it
 * when it is not: asked for together on a database without it, the read
 * would fail, and a failed read sends nothing at all. Before 20261005
 * push_community is absent too, and nobody has asked: nothing is sent.
 */
async function readPrefs(admin: SupabaseClient, ids: string[]): Promise<Prefs[]> {
  const withLanguage = await admin.from("profiles").select("id, push_community, preferred_language").in("id", ids);
  if (!withLanguage.error) return (withLanguage.data ?? []) as Prefs[];
  const without = await admin.from("profiles").select("id, push_community").in("id", ids);
  return without.error ? [] : ((without.data ?? []) as Prefs[]);
}

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
    const prefs = await readPrefs(admin, ids);
    // On only where the reader turned them on: never a default, never a guess.
    const on = new Set(prefs.filter((p) => p.push_community === true).map((p) => p.id));
    const language = new Map(prefs.map((p) => [p.id, p.preferred_language ?? null]));
    const wanted = rows.filter((r) => on.has(r.user_id));
    if (wanted.length === 0) return;
    const devices = await devicesOf(admin, [...new Set(wanted.map((r) => r.user_id))]);
    for (const row of wanted) {
      const targets = devices.get(row.user_id);
      if (!targets || (targets.webSubs.length === 0 && targets.tokens.length === 0)) continue;
      // A burst (a popular post, a busy name day) reaches the inbox in full
      // and the lock screen only so often.
      if (await rateLimited(`community-push:${row.user_id}`, 3600, PUSH_PER_HOUR)) continue;
      await broadcast(admin, communityPushCopy(row.kind, targetOf(row), getMessages(language.get(row.user_id))), targets);
    }
  } catch (e) {
    console.warn("[community] push not sent", e instanceof Error ? e.message : String(e));
  }
}
