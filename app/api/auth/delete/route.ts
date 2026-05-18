import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Delete the signed-in user's account and every server-side row they own.
 *
 * The on-delete cascades from auth.users to profiles, bookmarks, and
 * annotations are wired in the v3.3 migration, so deleting the auth.users
 * row is enough to drop everything. We only need the admin client because
 * auth.admin.deleteUser is privileged.
 *
 * POST is required so this can't be triggered by a stray link click.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "not signed in" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Clear the session cookie on this device too.
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url));
}
