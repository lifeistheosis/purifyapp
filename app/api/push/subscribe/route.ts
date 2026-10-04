import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { endpointsToLetGo } from "@/lib/push/browserLimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A push service hands out an https address and two short keys (87 and 22
// characters today). Anything else is not a subscription.
const Body = z.object({
  endpoint: z.string().url().max(2048).startsWith("https://"),
  keys: z.object({
    p256dh: z.string().min(1).max(256),
    auth: z.string().min(1).max(128),
  }),
  morningTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  eveningTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  timezone: z.string().max(80).optional(),
});

export async function POST(req: NextRequest) {
  const supa = await createClient();
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

  // Written with the service role, for the signed-in reader named above. A
  // browser has one endpoint whoever is signed in, so the row may belong to
  // the account that used this browser before, and under RLS that update is
  // refused: the new reader was told "on" and the reminders went to nobody.
  // And the answer is checked. This used to return ok whatever the database
  // said, so a failed save looked exactly like a saved one.
  const admin = createAdminClient();

  // One account, a handful of browsers (audit F-42). The hourly run and
  // every Community alert make a request per row, so the oldest rows are let
  // go when another browser would be one too many: the run cannot grow
  // without end, and a reader on a new browser is never refused. Since
  // 20261010000000_push_subscriptions_server_writes.sql this route is the
  // only way a row is made, so the ceiling holds.
  const { data: mine } = await admin
    .from("push_subscriptions")
    .select("endpoint, created_at")
    .eq("user_id", user.id)
    .limit(200);
  const letGo = endpointsToLetGo(mine ?? [], parsed.endpoint);
  if (letGo.length) {
    await admin.from("push_subscriptions").delete().eq("user_id", user.id).in("endpoint", letGo);
  }

  const { error } = await admin
    .from("push_subscriptions")
    .upsert(
      {
        endpoint: parsed.endpoint,
        user_id: user.id,
        p256dh: parsed.keys.p256dh,
        auth: parsed.keys.auth,
        morning_time: parsed.morningTime ?? null,
        evening_time: parsed.eveningTime ?? null,
        timezone: parsed.timezone ?? "UTC",
      },
      { onConflict: "endpoint" },
    );
  if (error) {
    console.warn("[push/subscribe] save failed", error.message);
    return NextResponse.json({ error: "Could not save this browser." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const supa = await createClient();
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const endpoint = req.nextUrl.searchParams.get("endpoint");
  if (!endpoint) return NextResponse.json({ error: "missing endpoint" }, { status: 400 });

  await supa
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}
