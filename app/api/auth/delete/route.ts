import { NextResponse } from "next/server";
import { corsPreflight, withCors } from "@/lib/api/cors";
import { createClientFromRequest } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
 *
 * Two things here are load-bearing for the native app, where this route is
 * reached cross-origin from https://localhost with a Bearer token:
 *
 *   - auth is `createClientFromRequest`, not the cookie-only `createClient`,
 *     which could never see a native caller and answered 401 to all of them;
 *   - the answer is JSON `{ ok: true }`, not a redirect. It used to redirect
 *     because the only caller was a form POST, and a form POST cannot report
 *     failure. The caller now asserts the JSON body (lib/api/expectOk.ts), so
 *     a deletion that did not happen can no longer be reported as one.
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

  if (await rateLimited(`delete:${user.id}`, 60, 5)) {
    return withCors(
      NextResponse.json({ error: "Too many attempts." }, { status: 429 }),
      req,
    );
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return withCors(
      NextResponse.json(
        { error: "Couldn't delete the account. Please try again." },
        { status: 500 },
      ),
      req,
    );
  }

  await supabase.auth.signOut();
  return withCors(NextResponse.json({ ok: true }), req);
}

export const OPTIONS = corsPreflight;
