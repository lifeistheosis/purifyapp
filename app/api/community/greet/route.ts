import { NextResponse } from "next/server";
import { z } from "zod";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { communityEnabled } from "@/lib/community/flags";
import { blockedBy, insertNotifications } from "@/lib/community/notify";
import { actorOf, handleFrom, notYet, signedInUser } from "@/lib/community/social";
import { nameDay } from "@/lib/profile/nameDay";
import { loadProfileRow } from "@/lib/profile/server";
import { getSaint } from "@/lib/saints/saints";
import { rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * "Many years!" on a reader's name day.
 *
 * Only while it is their name day (lib/profile/nameDay.ts), once per reader
 * per year (name_day_greetings' primary key), and the reader greeted hears
 * about each new greeting in their inbox. Answers with the day's count.
 */
const schema = z.object({ handle: z.string().max(40) });

async function handlePOST(req: Request) {
  if (!communityEnabled()) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const user = await signedInUser(req);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (await rateLimited(`community-greet:${user.id}`, 3600, 60)) {
    return NextResponse.json({ error: "Too many greetings just now." }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  const handle = parsed.success ? handleFrom(parsed.data.handle) : null;
  if (!handle) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const admin = createAdminClient();
  const row = await loadProfileRow(admin, { handle });
  if (!row || row === "unavailable" || row.profile_private) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (row.id === user.id) return NextResponse.json({ error: "That is you." }, { status: 400 });
  const saint = row.patron_saint ? getSaint(row.patron_saint) : null;
  const day = saint ? nameDay(saint.feastDays, row.calendar_reckoning) : null;
  if (!day?.today) return NextResponse.json({ error: "It is not their name day.", code: "not_today" }, { status: 409 });

  const { error } = await admin
    .from("name_day_greetings")
    .insert({ recipient_id: row.id, sender_id: user.id, year: day.year });
  if (error && error.code !== "23505") {
    if (notYet(error)) return NextResponse.json({ error: "Greetings open soon.", code: "unavailable" }, { status: 409 });
    console.warn("[community] greeting failed", error.message);
    return NextResponse.json({ error: "Couldn't send that." }, { status: 500 });
  }
  if (!error && !(await blockedBy(admin, [row.id], user.id)).has(row.id)) {
    const actor = await actorOf(admin, user);
    await insertNotifications(admin, [
      { user_id: row.id, kind: "name_day", actor_name: actor.name, actor_handle: actor.handle },
    ]);
  }
  const { count } = await admin
    .from("name_day_greetings")
    .select("sender_id", { count: "exact", head: true })
    .eq("recipient_id", row.id)
    .eq("year", day.year);
  return NextResponse.json({ ok: true, count: count ?? 0 });
}

export const POST = corsRoute(handlePOST);
export const OPTIONS = corsPreflight;
