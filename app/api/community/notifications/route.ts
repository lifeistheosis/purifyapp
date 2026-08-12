// The reader's own inbox.
//
// GET  -> their notifications, newest first, plus the unread count.
// POST -> mark every unread one read (the inbox does this on open).
//
// Authenticated only, and scoped to the caller by RLS rather than by a
// filter we could forget: community_notifications has a select policy of
// `auth.uid() = user_id`, so this deliberately uses the REQUEST-scoped
// client and NOT the service role. A service-role read here would bypass
// that policy and one wrong `.eq()` would serve somebody else's inbox.

import { NextResponse } from "next/server";

import { corsPreflight, withCors } from "@/lib/api/cors";
import { communityEnabled } from "@/lib/community/flags";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { createClientFromRequest } from "@/lib/supabase/server";

const COLS =
  "id, kind, post_id, reply_id, actor_name, excerpt, read_at, created_at";

async function handleGET(req: Request) {
  if (!communityEnabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const supabase = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in." }, { status: 401 });
  }

  // Keyed on the user, not the IP, and applied after auth for that reason.
  // The badge polls this once a minute while the app is in the foreground,
  // so the budget has to clear that comfortably; an IP key would collapse
  // every reader behind one carrier NAT into a single bucket, which is the
  // problem app/api/campaigns/image/route.ts already documents.
  if (await rateLimited(`community-inbox:${user.id}`, 3600, 240)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const { data, error } = await supabase
    .from("community_notifications")
    .select(COLS)
    .order("created_at", { ascending: false })
    .limit(50);

  // Absent table (migration not yet applied) reads as an empty inbox rather
  // than an error, so the badge simply never appears and nothing breaks.
  if (error) {
    return NextResponse.json({ notifications: [], unread: 0 });
  }

  const notifications = data ?? [];

  // Count over the whole table, not over the fifty rows we just fetched.
  //
  // This used to be `notifications.filter((n) => !n.read_at).length`, which
  // is only correct while a reader has fewer than fifty notifications. Past
  // that, someone whose newest fifty are all read was told they had none
  // unread while older unread rows sat behind the window. The partial index
  // community_notifications_unread_idx was built for exactly this query and
  // was going unused.
  //
  // `head: true` sends no rows back, so this costs one index scan and no
  // payload. RLS still scopes it to the caller.
  const { count, error: countError } = await supabase
    .from("community_notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);

  const unread = countError
    ? notifications.filter((n) => !n.read_at).length
    : (count ?? 0);

  return NextResponse.json({ notifications, unread });
}

async function handlePOST(req: Request) {
  if (!communityEnabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (await rateLimited(`community-notif-read:${ipKey(req.headers)}`, 3600, 120)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  const supabase = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in." }, { status: 401 });
  }

  // One statement for the whole inbox. The function is security definer but
  // filters on auth.uid() internally, so it can only ever touch the
  // caller's own rows.
  const { error } = await supabase.rpc("community_mark_notifications_read");
  if (error) {
    return NextResponse.json({ ok: false });
  }
  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  return withCors(await handleGET(req), req);
}
export async function POST(req: Request) {
  return withCors(await handlePOST(req), req);
}
export const OPTIONS = corsPreflight;
