import { NextResponse } from "next/server";
import { z } from "zod";

import { corsPreflight, withCors } from "@/lib/api/cors";
import { communityEnabled } from "@/lib/community/flags";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";

/** Delete your OWN post (replies cascade). Moderation removals happen with
 *  the service role directly and set status='removed' instead. */
async function handleDELETE(req: Request, id: string) {
  if (!communityEnabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid post." }, { status: 400 });
  }

  const supabase = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("community_posts")
    .select("id, user_id")
    .eq("id", id)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (row.user_id !== user.id) {
    return NextResponse.json({ error: "Not your post." }, { status: 403 });
  }

  const { error } = await admin.from("community_posts").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: "Couldn't delete it." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return withCors(await handleDELETE(req, id), req);
}
export const OPTIONS = corsPreflight;
