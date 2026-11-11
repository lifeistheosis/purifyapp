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
// The one service-role read below is not of notifications: it looks up the
// campaign of a thread post the reader's own rows already name
// (withCampaignIds).

import { NextResponse } from "next/server";

import { corsPreflight, withCors } from "@/lib/api/cors";
import { communityEnabled } from "@/lib/community/flags";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { isColumnAbsent } from "@/lib/supabase/columnAbsent";
import { createClientFromRequest } from "@/lib/supabase/server";

const COLS =
  "id, kind, post_id, reply_id, actor_name, excerpt, read_at, created_at";
// actor_handle arrives with 20261002000000_community_social.sql.
const COLS_WITH_HANDLE = `${COLS}, actor_handle`;
// A removal notice's two fields arrive with supabase/migrations/20261110204814_removal_notices.sql.
const COLS_WITH_REMOVAL = `${COLS_WITH_HANDLE}, target_kind, reason`;

type Row = { kind?: string; read_at: string | null; target_kind?: string | null; post_id?: string | null; campaign_id?: string | null };

/**
 * The notices 1.9 added are handed only to an inbox that asks for them with
 * "inbox=2": a notice about a prayer campaign (a moderator approved yours, or
 * one in your prayers has an update) and the care note (lib/community/
 * careNote.ts). An app built before them would draw one as "replied to your
 * post", and a campaign's would open a thread Community does not show, so it
 * never sees one, and its unread count leaves them out too.
 */
function asksForNewNotices(req: Request): boolean {
  return new URL(req.url).searchParams.get("inbox") === "2";
}

/** A notice an app built before 1.9 cannot draw. */
function isNewNotice(r: Row): boolean {
  return r.target_kind === "campaign" || r.kind === "care";
}

/**
 * Each campaign notice that names a post, with the campaign the post is the
 * thread of, so a tap opens the campaign's updates. Read with the service
 * role, because a campaign's thread is not a post Community lets a reader
 * read; and only for the post ids already in this reader's own rows, which
 * RLS chose, so it can tell them nothing about anyone else's. A row it
 * cannot place keeps campaign_id null and opens Your campaigns.
 */
async function withCampaignIds(rows: Row[]): Promise<Row[]> {
  const ids = [...new Set(rows.filter((r) => r.target_kind === "campaign" && r.post_id).map((r) => r.post_id as string))];
  if (ids.length === 0) return rows;
  let byPost = new Map<string, string>();
  try {
    const { data } = await createAdminClient().from("community_posts").select("id, campaign_id").in("id", ids);
    byPost = new Map(
      ((data ?? []) as { id: string; campaign_id: string | null }[])
        .filter((p) => p.campaign_id)
        .map((p) => [p.id, p.campaign_id as string]),
    );
  } catch {
    /* each row opens Your campaigns instead */
  }
  return rows.map((r) => (r.target_kind === "campaign" ? { ...r, campaign_id: (r.post_id && byPost.get(r.post_id)) || null } : r));
}

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

  const list = (cols: string) =>
    supabase.from("community_notifications").select(cols).order("created_at", { ascending: false }).limit(50);
  let { data, error } = await list(COLS_WITH_REMOVAL);
  if (error && isColumnAbsent(error)) ({ data, error } = await list(COLS_WITH_HANDLE));
  if (error && isColumnAbsent(error)) ({ data, error } = await list(COLS));

  // Absent table (migration not yet applied) reads as an empty inbox rather
  // than an error, so the badge simply never appears and nothing breaks.
  if (error) {
    return NextResponse.json({ notifications: [], unread: 0 });
  }

  const asksNew = asksForNewNotices(req);
  const rows = (data ?? []) as unknown as Row[];
  const notifications = asksNew ? await withCampaignIds(rows) : rows.filter((r) => !isNewNotice(r));

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
  const unreadQuery = () => supabase.from("community_notifications").select("id", { count: "exact", head: true }).is("read_at", null);
  // An inbox that cannot draw a 1.9 notice is not told of an unread one. A
  // null target_kind is every older kind, so it is kept by name.
  let { count, error: countError } = asksNew
    ? await unreadQuery()
    : await unreadQuery().neq("kind", "care").or("target_kind.is.null,target_kind.neq.campaign");
  // Before the removal notice's SQL there is no target_kind, and so no 1.9 notice to leave out.
  if (countError && !asksNew && isColumnAbsent(countError)) ({ count, error: countError } = await unreadQuery());

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
