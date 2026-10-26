import { NextResponse } from "next/server";

import { corsPreflight, withCors } from "@/lib/api/cors";
import { circlesEnabled } from "@/lib/circles/circles";
import { circleUser } from "@/lib/circles/server";
import { rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Read together (1.8): leave a circle. The last member to leave takes the
 * circle with them, so no empty room is left behind with a live invite code.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function handleDELETE(req: Request, id: string) {
  if (!circlesEnabled() || !UUID.test(id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const user = await circleUser(req);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (await rateLimited(`circles-leave:${user.id}`, 3600, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  const admin = createAdminClient();
  const { data: removed, error } = await admin
    .from("prayer_campaign_group_members")
    .delete()
    .eq("group_id", id)
    .eq("user_id", user.id)
    .select("group_id");
  if (error) {
    console.warn("[circles] leave failed", error.message);
    return NextResponse.json({ error: "Couldn't update." }, { status: 500 });
  }
  // Not a member: answered as not found, so an id tells nobody it is real.
  if (!removed?.length) return NextResponse.json({ error: "Not found." }, { status: 404 });

  // The reader's marks in this circle go with them.
  await admin.from("group_path_days").delete().eq("group_id", id).eq("user_id", user.id);
  const { count } = await admin
    .from("prayer_campaign_group_members")
    .select("user_id", { count: "exact", head: true })
    .eq("group_id", id);
  if (!count) {
    // Only a circle that follows a path and no campaign is taken away here.
    await admin.from("prayer_campaign_groups").delete().eq("id", id).is("campaign_id", null);
  } else {
    await admin.rpc("prayer_campaign_group_bump_counts", { p_group_id: id, p_members: -1, p_prayers: 0 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withCors(await handleDELETE(req, id), req);
}

export const OPTIONS = corsPreflight;
