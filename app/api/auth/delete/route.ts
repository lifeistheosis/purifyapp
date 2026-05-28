import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/site";
import { rateLimited } from "@/lib/security/ratelimit";

/**
 * Delete the signed-in user's account and every server-side row they own.
 *
 * The on-delete cascades from auth.users to profiles, bookmarks,
 * annotations, and saint_bumps drop everything when the auth row goes.
 *
 * POST is required so this can't be triggered by a stray link click.
 * Rate-limited to 5/min per user to slow accidental double-clicks and
 * any compromised-session abuse window.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  if (await rateLimited(`delete:${user.id}`, 60, 5)) {
    return new NextResponse(null, { status: 429 });
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", SITE_URL));
}
