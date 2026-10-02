import { NextResponse } from "next/server";
import { z } from "zod";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { communityEnabled } from "@/lib/community/flags";
import { MOD_ACTIONS, moderatorFor, readModLog, readOpenReports, readPendingHolds, runModAction } from "@/lib/community/moderation";
import { signedInUser } from "@/lib/community/social";
import { rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The moderation queue for readers who hold the Moderator badge (and the
 * team), from any device, the phone apps included: what waits for a
 * decision, the open reports, and the log of who did what.
 *
 * GET              the queue and the log.
 * GET ?summary=1   how many things wait, for the button in Community.
 * POST             one action: remove, restore, dismiss, approve, keep, or
 *                  clear and reset a reported profile. The same actions the
 *                  team's console takes (lib/community/moderation.ts), each
 *                  written to the log under the moderator's name.
 *
 * Words, web addresses, pins and badges stay with the team's console.
 * Nothing here carries a reader's auth id or email.
 */

async function moderator(req: Request) {
  const user = await signedInUser(req);
  if (!user) return { ok: false as const, response: NextResponse.json({ error: "Sign in first." }, { status: 401 }) };
  const admin = createAdminClient();
  const actor = await moderatorFor(admin, user);
  if (!actor) return { ok: false as const, response: NextResponse.json({ error: "Not found." }, { status: 404 }) };
  return { ok: true as const, admin, actor, user };
}

async function handleGET(req: Request) {
  if (!communityEnabled()) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const who = await moderator(req);
  if (!who.ok) return who.response;
  const { admin } = who;

  if (new URL(req.url).searchParams.get("summary") === "1") {
    const head = (table: string) => admin.from(table).select("id", { count: "exact", head: true });
    const [holds, reports] = await Promise.all([head("community_text_holds").eq("status", "pending"), head("community_reports").eq("status", "open")]);
    return NextResponse.json(
      { waiting: (holds.error ? 0 : (holds.count ?? 0)) + (reports.error ? 0 : (reports.count ?? 0)) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }

  try {
    const [holds, reports, log] = await Promise.all([readPendingHolds(admin), readOpenReports(admin), readModLog(admin, { limit: 60 })]);
    return NextResponse.json(
      { holds: holds.rows, reports, log: log.rows, live: { holds: holds.live, log: log.live }, me: { name: who.actor.name, admin: who.actor.admin } },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    console.error("[community/moderation] read failed", (e as Error).message);
    // Never an empty queue for a failed read: "nothing waiting" is the
    // sentence that makes a moderator stop looking.
    return NextResponse.json({ error: "The queue could not be read. This is not an empty queue." }, { status: 500 });
  }
}

const schema = z.object({
  action: z.enum(MOD_ACTIONS),
  id: z.string().uuid(),
  reason: z.string().max(300).optional().nullable(),
});

async function handlePOST(req: Request) {
  if (!communityEnabled()) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const who = await moderator(req);
  if (!who.ok) return who.response;
  if (await rateLimited(`community-moderate:${who.user.id}`, 3600, 600)) {
    return NextResponse.json({ error: "Too many actions just now." }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  const res = await runModAction(who.admin, who.actor, parsed.data.action, parsed.data.id, parsed.data.reason);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json({ ok: true });
}

export const GET = corsRoute(handleGET);
export const POST = corsRoute(handlePOST);
export const OPTIONS = corsPreflight;
