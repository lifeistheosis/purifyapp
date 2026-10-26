import { NextResponse } from "next/server";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { circlesEnabled } from "@/lib/circles/circles";
import { circleUser } from "@/lib/circles/server";
import { rateLimited } from "@/lib/security/ratelimit";
import { circleReadSchema } from "@/lib/security/schemas";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Read together (1.8): a day of a path marked read, or unmarked, by the
 * reader, in every circle they keep on that path, so its members see it.
 * The path page sends this beside its own mark on the device.
 */
async function handlePOST(req: Request) {
  if (!circlesEnabled()) return NextResponse.json({ error: "Not found." }, { status: 404 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = circleReadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }
  const user = await circleUser(req);
  if (!user) return NextResponse.json({ error: "Sign in to read together." }, { status: 401 });
  if (await rateLimited(`circles-read-mark:${user.id}`, 60, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const admin = createAdminClient();
  const { data: mine } = await admin
    .from("prayer_campaign_group_members")
    .select("group_id, prayer_campaign_groups!inner(path_id)")
    .eq("user_id", user.id)
    .eq("prayer_campaign_groups.path_id", parsed.data.pathId);
  const ids = ((mine ?? []) as { group_id: string }[]).map((r) => r.group_id);
  if (!ids.length) return NextResponse.json({ ok: true, circles: 0 });

  const { day, read } = parsed.data;
  const { error } = read
    ? await admin
        .from("group_path_days")
        .upsert(ids.map((group_id) => ({ group_id, user_id: user.id, day })), { onConflict: "group_id,user_id,day", ignoreDuplicates: true })
    : await admin.from("group_path_days").delete().eq("user_id", user.id).eq("day", day).in("group_id", ids);
  if (error) {
    console.warn("[circles] read mark failed", error.message);
    return NextResponse.json({ error: "Couldn't update your circles." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, circles: ids.length });
}

export const POST = corsRoute(handlePOST);
export const OPTIONS = corsPreflight;
