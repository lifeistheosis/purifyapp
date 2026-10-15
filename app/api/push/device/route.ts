import { NextResponse } from "next/server";
import { z } from "zod";
import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Native push token registration for the iOS/Android Capacitor shells.
 * The web counterpart is /api/push/subscribe (Web Push endpoints); this one
 * stores APNs / FCM device tokens in `device_push_tokens`. A row is owned by
 * the signed-in user: saved for them with the service role (POST, below),
 * and deleted by them under RLS (DELETE).
 *
 * This route is ONLY ever called by the native shell, which reaches it
 * cross-origin from https://localhost with a Bearer token (see
 * lib/push/native.ts → apiFetch). So it must authenticate from the header
 * rather than a cookie, and it must answer the CORS preflight — exactly like
 * the shop/checkout routes. Using the cookie-bound client here made every
 * registration 401, which left device_push_tokens empty and silently broke
 * every native broadcast.
 */
const Body = z.object({
  token: z.string().min(1).max(4096),
  platform: z.enum(["ios", "android"]),
  morningTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  eveningTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  timezone: z.string().max(80).optional(),
});

async function handlePOST(req: Request) {
  const supa = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid body", detail: String(err) },
      { status: 400 },
    );
  }

  // Written with the service role, for the signed-in reader named above, the
  // way /api/push/subscribe has saved browsers since 2026-10-04. A phone has
  // one token whoever is signed in to it, so the row may belong to the
  // account that used this phone before. Under RLS that update is refused
  // (an upsert that meets another reader's row is an error, not a skip), and
  // this route never read the answer: the new reader was told "on", their
  // phone went on showing the other account's notifications and none of
  // theirs, and every launch asked again and was refused again. The token is
  // this phone's and the request carries this account's session, so the row
  // is this account's now.
  //
  // And the answer is checked. A save that failed used to look exactly like
  // one that worked, and the app only asks again on its next launch.
  const admin = createAdminClient();
  const { error } = await admin.from("device_push_tokens").upsert(
    {
      token: parsed.token,
      user_id: user.id,
      platform: parsed.platform,
      morning_time: parsed.morningTime ?? null,
      evening_time: parsed.eveningTime ?? null,
      timezone: parsed.timezone ?? "UTC",
    },
    { onConflict: "token" },
  );
  if (error) {
    console.warn("[push/device] save failed", error.message);
    return NextResponse.json({ error: "Could not save this phone." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

async function handleDELETE(req: Request) {
  const supa = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = new URL(req.url).searchParams.get("token");
  if (!token) return NextResponse.json({ error: "missing token" }, { status: 400 });

  await supa
    .from("device_push_tokens")
    .delete()
    .eq("token", token)
    .eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}

export const POST = corsRoute(handlePOST);
export const DELETE = corsRoute(handleDELETE);
export const OPTIONS = corsPreflight;
