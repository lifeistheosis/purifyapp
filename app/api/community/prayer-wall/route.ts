import { NextResponse } from "next/server";

import { corsPreflight, withCors } from "@/lib/api/cors";
import { hiddenAuthors } from "@/lib/community/blocks";
import { communityEnabled } from "@/lib/community/flags";
import { signedInUser } from "@/lib/community/social";
import { PRAYER_REQUEST_MS, identity } from "@/lib/profile/server";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The prayer wall: every reader asking for prayers right now, in one place,
 * newest first, with how many have prayed (20261002's "pray for me", which
 * is a button and no text, so there is nothing here to moderate). A private
 * profile is never on it.
 *
 * The wall itself is the same for everyone and is put together at most once
 * a minute per server, because naming sixty readers is sixty sign-in reads.
 * What is one viewer's (whom they blocked or muted, whom they already prayed
 * for, which request is theirs) is laid over it per request and never cached.
 */

type WallEntry = { id: string; handle: string; name: string; avatar: string | null; since: string; count: number };

const TTL_MS = 60_000;
let cache: { at: number; entries: WallEntry[] } | null = null;

async function loadWall(admin: ReturnType<typeof createAdminClient>): Promise<WallEntry[] | null> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.entries;
  const since = new Date(Date.now() - PRAYER_REQUEST_MS).toISOString();
  const { data, error } = await admin
    .from("profiles")
    .select("id, handle, display_name, avatar_url, prayer_request_at")
    .gte("prayer_request_at", since)
    .eq("profile_private", false)
    .not("handle", "is", null)
    .order("prayer_request_at", { ascending: false })
    .limit(60);
  if (error) {
    console.warn("[community] prayer wall read failed", error.message);
    return null;
  }
  const rows = (data ?? []) as { id: string; handle: string; display_name: string | null; avatar_url?: string | null; prayer_request_at: string }[];
  const ids = rows.map((r) => r.id);
  const { data: prayers } = ids.length
    ? await admin.from("profile_prayers").select("owner_id, request_at").in("owner_id", ids).gte("request_at", since).limit(10000)
    : { data: [] };
  const counts = new Map<string, number>();
  for (const p of (prayers ?? []) as { owner_id: string; request_at: string }[]) {
    const key = `${p.owner_id}|${new Date(p.request_at).getTime()}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const named = await Promise.all(rows.map((r) => identity(admin, r)));
  const entries = rows.map((r, i) => ({
    id: r.id,
    handle: r.handle,
    name: named[i].name,
    avatar: named[i].avatar,
    since: r.prayer_request_at,
    count: counts.get(`${r.id}|${new Date(r.prayer_request_at).getTime()}`) ?? 0,
  }));
  cache = { at: Date.now(), entries };
  return entries;
}

export async function GET(req: Request) {
  if (!communityEnabled()) return withCors(NextResponse.json({ error: "Not found." }, { status: 404 }), req);
  if (await rateLimited(`community-wall:${ipKey(req.headers)}`, 60, 60)) {
    return withCors(NextResponse.json({ error: "Too many requests." }, { status: 429 }), req);
  }
  const admin = createAdminClient();
  const wall = await loadWall(admin);
  if (!wall) return withCors(NextResponse.json({ error: "The prayer wall could not be read." }, { status: 500 }), req);

  const user = await signedInUser(req);
  let prayed = new Set<string>();
  let hidden = new Set<string>();
  let entries = wall;
  if (user) {
    // The reader's own request as it is now, not as the minute-old wall has
    // it: asking or withdrawing shows at once for the one who did it.
    const { data: me } = await admin
      .from("profiles")
      .select("id, handle, display_name, avatar_url, prayer_request_at, profile_private")
      .eq("id", user.id)
      .maybeSingle();
    const row = me as { id: string; handle: string | null; display_name: string | null; avatar_url?: string | null; prayer_request_at: string | null; profile_private: boolean } | null;
    const active = row?.prayer_request_at && Date.now() - new Date(row.prayer_request_at).getTime() < PRAYER_REQUEST_MS ? row.prayer_request_at : null;
    entries = wall.filter((w) => w.id !== user.id);
    if (row && row.handle && active && !row.profile_private) {
      const [{ count }, who] = await Promise.all([
        admin.from("profile_prayers").select("prayer_id", { count: "exact", head: true }).eq("owner_id", row.id).eq("request_at", active),
        identity(admin, row),
      ]);
      entries = [{ id: row.id, handle: row.handle, name: who.name, avatar: who.avatar, since: active, count: count ?? 0 }, ...entries];
    }
  }
  if (user && entries.length > 0) {
    const [mine, h] = await Promise.all([
      admin
        .from("profile_prayers")
        .select("owner_id, request_at")
        .eq("prayer_id", user.id)
        .in(
          "owner_id",
          entries.map((w) => w.id),
        )
        .limit(500),
      hiddenAuthors(req, admin),
    ]);
    const asked = new Map(entries.map((w) => [w.id, new Date(w.since).getTime()]));
    prayed = new Set(
      ((mine.data ?? []) as { owner_id: string; request_at: string }[])
        .filter((p) => asked.get(p.owner_id) === new Date(p.request_at).getTime())
        .map((p) => p.owner_id),
    );
    hidden = new Set([...h.blocked, ...h.muted]);
  }

  // The ids stop here: what leaves is a handle, a name, a picture and a count.
  const requests = entries
    .filter((w) => !hidden.has(w.id))
    .map((w) => ({
      handle: w.handle,
      name: w.name,
      avatar: w.avatar,
      since: w.since,
      count: w.count,
      prayed: prayed.has(w.id),
      mine: user?.id === w.id,
    }));
  return withCors(
    NextResponse.json(
      { requests },
      { headers: { "Cache-Control": user ? "private, no-store" : "public, max-age=30", Vary: "Origin, Authorization" } },
    ),
    req,
  );
}

export const OPTIONS = corsPreflight;
