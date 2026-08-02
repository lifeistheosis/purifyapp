import { NextResponse } from "next/server";
import { corsPreflight, withCors } from "@/lib/api/cors";
import { createClientFromRequest } from "@/lib/supabase/server";

/**
 * Revokes all sessions for the current user EXCEPT this one.
 * Calls `supabase.auth.signOut({ scope: 'others' })` server-side so the
 * cookie on this request stays valid.
 *
 * `createClientFromRequest` and CORS, because the native shell calls this
 * cross-origin with a Bearer token. Under the cookie-only client it answered
 * 401 to every native caller, and the caller reported success anyway.
 */
export async function POST(req: Request) {
  const supabase = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return withCors(
      NextResponse.json({ error: "Not signed in." }, { status: 401 }),
      req,
    );
  }
  const { error } = await supabase.auth.signOut({ scope: "others" });
  if (error) {
    return withCors(
      NextResponse.json(
        { error: "Couldn't revoke the other sessions." },
        { status: 500 },
      ),
      req,
    );
  }
  return withCors(NextResponse.json({ ok: true }), req);
}

export const OPTIONS = corsPreflight;
