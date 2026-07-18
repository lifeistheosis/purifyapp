import { NextResponse } from "next/server";
import { z } from "zod";
import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { createClientFromRequest } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Native push token registration for the iOS/Android Capacitor shells.
 * The web counterpart is /api/push/subscribe (Web Push endpoints); this one
 * stores APNs / FCM device tokens in `device_push_tokens`. Same auth + RLS
 * shape: a row is owned by the signed-in user.
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

  await supa.from("device_push_tokens").upsert(
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
