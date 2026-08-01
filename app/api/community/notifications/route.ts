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
  const unread = notifications.filter((n) => !n.read_at).length;
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
