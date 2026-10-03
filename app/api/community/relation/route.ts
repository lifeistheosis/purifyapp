import { NextResponse } from "next/server";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { communityEnabled } from "@/lib/community/flags";
import { giftConfig, handleFrom, signedInUser } from "@/lib/community/social";
import { nameDay } from "@/lib/profile/nameDay";
import type { ProfileRelation } from "@/lib/profile/publicProfile";
import { activePrayerRequest, identity, loadProfileRow } from "@/lib/profile/server";
import { getSaint } from "@/lib/saints/saints";
import { rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { isColumnAbsent } from "@/lib/supabase/columnAbsent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * How the signed-in viewer stands with a profile: following, followed back,
 * who they both follow, whether they have already greeted or prayed, and
 * whether Gift Plus is on. Read separately from the profile itself, which is
 * public and cached for everyone; this is one viewer's and never cached.
 *
 * Follows are never listed. The only lists that leave are the readers the
 * viewer ALSO follows, which the viewer could see for themselves anyway.
 */
const MUTUALS = 8;

async function handleGET(req: Request) {
  if (!communityEnabled()) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const user = await signedInUser(req);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (await rateLimited(`community-relation:${user.id}`, 3600, 600)) {
    return NextResponse.json({ error: "Slow down a little." }, { status: 429 });
  }
  const handle = handleFrom(new URL(req.url).searchParams.get("h"));
  if (!handle) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const admin = createAdminClient();
  const row = await loadProfileRow(admin, { handle });
  if (!row || row === "unavailable") return NextResponse.json({ error: "Not found." }, { status: 404 });
  const mine = row.id === user.id;
  const gift = giftConfig();

  if (mine) {
    const relation: ProfileRelation = {
      mine: true,
      following: false,
      followsYou: false,
      mutuals: [],
      greeted: false,
      prayed: false,
      canGift: false,
      muted: false,
    };
    return NextResponse.json({ relation }, { headers: { "Cache-Control": "private, no-store" } });
  }

  const saint = row.patron_saint ? getSaint(row.patron_saint) : null;
  const day = saint ? nameDay(saint.feastDays, row.calendar_reckoning) : null;
  const request = activePrayerRequest(row);

  const [mineFollows, theirFollows, followsYou, greeted, prayed, muted] = await Promise.all([
    admin.from("community_follows").select("followee_id").eq("follower_id", user.id).limit(1000),
    admin.from("community_follows").select("followee_id").eq("follower_id", row.id).limit(1000),
    admin
      .from("community_follows")
      .select("follower_id")
      .eq("follower_id", row.id)
      .eq("followee_id", user.id)
      .maybeSingle(),
    day?.today
      ? admin
          .from("name_day_greetings")
          .select("sender_id")
          .eq("recipient_id", row.id)
          .eq("sender_id", user.id)
          .eq("year", day.year)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    request
      ? admin
          .from("profile_prayers")
          .select("prayer_id")
          .eq("owner_id", row.id)
          .eq("prayer_id", user.id)
          .eq("request_at", request)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    // Absent before 20261005, which reads as not muted.
    admin.from("community_mutes").select("id").eq("muter_id", user.id).eq("muted_id", row.id).maybeSingle(),
  ]);

  const mineSet = new Set(((mineFollows.data ?? []) as { followee_id: string }[]).map((r) => r.followee_id));
  const both = ((theirFollows.data ?? []) as { followee_id: string }[])
    .map((r) => r.followee_id)
    .filter((id) => mineSet.has(id) && id !== user.id)
    .slice(0, MUTUALS);

  let mutuals: ProfileRelation["mutuals"] = [];
  if (both.length > 0) {
    // avatar_url, each reader's own upload, arrives with 20261003000000_profile_pictures.sql.
    const pick = (cols: string) => admin.from("profiles").select(cols).in("id", both);
    const first = await pick("id, handle, display_name, avatar_url");
    let people = first.data;
    if (first.error && isColumnAbsent(first.error)) ({ data: people } = await pick("id, handle, display_name"));
    const rows = (
      (people ?? []) as unknown as { id: string; handle: string | null; display_name: string | null; avatar_url?: string | null }[]
    ).filter((p) => p.handle);
    const named = await Promise.all(rows.map((p) => identity(admin, p)));
    mutuals = rows.map((p, i) => ({
      handle: p.handle as string,
      name: named[i].name,
      avatar: named[i].avatar,
      // No frame here: a frame shows only while its wearer's Plus is live,
      // and that is not worth eight more reads for a row of small pictures.
      decoration: null,
    }));
  }

  const relation: ProfileRelation = {
    mine: false,
    following: mineSet.has(row.id),
    followsYou: Boolean(followsYou.data),
    mutuals,
    greeted: Boolean(greeted.data),
    prayed: Boolean(prayed.data),
    canGift: gift !== null,
    muted: !muted.error && Boolean(muted.data),
  };
  return NextResponse.json({ relation }, { headers: { "Cache-Control": "private, no-store" } });
}

export const GET = corsRoute(handleGET);
export const OPTIONS = corsPreflight;
