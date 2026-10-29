import { NextResponse } from "next/server";

import { isAdminEmail } from "@/lib/admin/access";
import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { createClientFromRequest } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Is the reader signed in here an admin? `{ admin: boolean }`, and nothing
 * else: never the list itself, which stays in ADMIN_EMAILS on the server
 * (lib/admin/access.ts).
 *
 * Asked by Settings, which shows Testers mode only on a yes (1.8,
 * components/settings/SettingsClient.tsx, TestersSection): on the website
 * with the cookie session, and in the apps across origins with the reader's
 * token (createClientFromRequest; the CORS answer and OPTIONS are
 * lib/api/cors.ts).
 * A signed-out reader, and any reader not on the list, is told no. Every
 * caller is held to a budget by address first, so the question cannot be
 * asked in bulk, and a signed-in one to their own budget after it.
 */
async function handleGET(req: Request) {
  const noStore = { "Cache-Control": "no-store" };
  if (await rateLimited(`admin-whoami:${ipKey(req.headers)}`, 60, 30)) {
    return NextResponse.json({ admin: false }, { status: 429, headers: noStore });
  }

  const supabase = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ admin: false }, { headers: noStore });

  if (await rateLimited(`admin-whoami:${user.id}`, 60, 20)) {
    return NextResponse.json({ admin: false }, { status: 429, headers: noStore });
  }
  return NextResponse.json({ admin: isAdminEmail(user.email) }, { headers: noStore });
}

export const GET = corsRoute(handleGET);
export const OPTIONS = corsPreflight;
