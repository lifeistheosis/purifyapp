import { NextResponse } from "next/server";
import { z } from "zod";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { readPreferences, writePreferences } from "@/lib/email/preferences";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A signed-in reader's email choices: the two optional lists, both off until
 * they turn them on.
 *
 * corsRoute and createClientFromRequest because the app reaches this
 * cross-origin with a Bearer token, the same as /api/eikon-box/address. Writes
 * use the service role; the table lets a reader read their own row and nothing
 * more.
 */

const Body = z.object({
  shopOffers: z.boolean(),
  productUpdates: z.boolean(),
});

async function signedInUser(req: Request) {
  const supabase = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

async function handleGET(req: Request) {
  const user = await signedInUser(req);
  if (!user) return NextResponse.json({ error: "Sign in to choose what email you get." }, { status: 401 });
  try {
    return NextResponse.json(await readPreferences(createAdminClient(), user.id));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 503 });
  }
}

async function handlePUT(req: Request) {
  const user = await signedInUser(req);
  if (!user) return NextResponse.json({ error: "Sign in to choose what email you get." }, { status: 401 });
  if (await rateLimited(`email-prefs:${user.id ?? ipKey(req.headers)}`, 60, 20)) {
    return NextResponse.json({ error: "Too many changes. Try again in a minute." }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid preferences." }, { status: 400 });
  try {
    return NextResponse.json(await writePreferences(createAdminClient(), user.id, parsed.data));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 503 });
  }
}

export const GET = corsRoute(handleGET);
export const PUT = corsRoute(handlePUT);
export const OPTIONS = corsPreflight;
