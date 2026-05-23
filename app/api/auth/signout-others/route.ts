import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Revokes all sessions for the current user EXCEPT this one.
 * Calls `supabase.auth.signOut({ scope: 'others' })` server-side so the
 * cookie on this request stays valid.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const { error } = await supabase.auth.signOut({ scope: "others" });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
