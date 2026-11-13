import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { logActivity } from "@/lib/admin/activityLog";
import { readToday } from "@/lib/admin/briefToday";
import {
  BRIEF_HOURS,
  HOLD_WINDOW_MINUTES,
  SEND_HOURS,
  deskSettingsProblem,
  isAutoPiece,
  isWeeklyBrief,
  localClock,
  withHold,
  withoutHold,
  type DeskSettings,
} from "@/lib/admin/ownerDesk";
import { briefSent, DESK_KEYS, readDesk, writeDesk, type DeskState } from "@/lib/admin/ownerDeskStore";
import { briefKey, composeBrief } from "@/lib/admin/ownerBriefSend";
import { rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The owner's desk (components/admin/planner/OwnerDesk.tsx; the rules are
 * lib/admin/ownerDesk.ts).
 *
 * GET   the desk: his settings, today's emails and whether each goes out by
 *       itself, the board message's draft when it is due, and whether today's
 *       brief has gone.
 * POST  { action: "settings", settings }  the brief's hour, the weekly day,
 *                                         the sends' hour, the switch;
 *       { action: "hold", ruleKey }       keep one of today's emails back;
 *       { action: "release", ruleKey }    let a held one go out by itself;
 *       { action: "preview" }             today's brief as it stands, made
 *                                         and shown, never sent or saved.
 *
 * Admin only, every write validated, rate limited and written to the
 * activity log with what it replaced. Settings live in site_settings, which
 * the production baseline found already made; while it is not there the
 * writes say so and the defaults stand.
 */

type Admin = ReturnType<typeof createAdminClient>;

async function view(admin: Admin, desk: DeskState, now: Date) {
  const { day } = localClock(now);
  const [today, log] = await Promise.all([
    readToday(admin, now, desk, "panel"),
    briefSent(admin, briefKey(day)),
  ]);
  return {
    present: desk.present,
    ok: desk.ok,
    settings: desk.settings,
    saved: desk.saved,
    limits: { brief: BRIEF_HOURS, send: SEND_HOURS, holdMinutes: HOLD_WINDOW_MINUTES },
    brief: { sent: log ? log.sent : null, at: log?.at ?? null, weekly: isWeeklyBrief(now, desk.settings) },
    today: { day: today.day, needs: today.needs, pieces: today.pieces, board: today.board, boardError: today.boardError },
  };
}

export async function GET() {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const admin = createAdminClient();
  try {
    const now = new Date();
    return NextResponse.json(await view(admin, await readDesk(admin), now), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 503 });
  }
}

const Clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("settings"),
    settings: z.object({
      autoSend: z.boolean(),
      sendAt: Clock,
      briefAt: Clock,
      weeklyDay: z.number().int().min(0).max(6),
    }),
  }),
  z.object({ action: z.literal("hold"), ruleKey: z.string().min(3).max(80) }),
  z.object({ action: z.literal("release"), ruleKey: z.string().min(3).max(80) }),
  z.object({ action: z.literal("preview") }),
]);

const NOT_THERE =
  "The desk keeps its settings in site_settings, which this database does not have. Until it does, the defaults stand and nothing goes out by itself.";

export async function POST(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (await rateLimited(`owner-desk:${adminUser.id}`, 60, 30)) {
    return NextResponse.json({ error: "Give it a moment between changes." }, { status: 429 });
  }
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "That is not something the desk can do." }, { status: 400 });
  const input = parsed.data;
  const admin = createAdminClient();
  const now = new Date();
  const by = adminUser.email ?? null;

  if (input.action === "preview") {
    try {
      const brief = await composeBrief(admin, now, "preview");
      return NextResponse.json({ subject: brief.subject, html: brief.html });
    } catch (e) {
      return NextResponse.json({ error: `The brief could not be made: ${(e as Error).message}` }, { status: 503 });
    }
  }

  const desk = await readDesk(admin);
  if (!desk.present) return NextResponse.json({ error: NOT_THERE }, { status: 409 });
  if (!desk.ok) return NextResponse.json({ error: "The desk could not be read just now. Nothing was changed." }, { status: 503 });

  if (input.action === "settings") {
    const next: DeskSettings = input.settings;
    const problem = deskSettingsProblem(next);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });
    const w = await writeDesk(admin, DESK_KEYS.settings, { ...next }, by);
    if (!w.ok) return NextResponse.json({ error: w.absent ? NOT_THERE : w.error }, { status: w.absent ? 409 : 500 });
    void logActivity({
      actorEmail: by,
      action: "desk.settings",
      entityType: "site_settings",
      entityId: DESK_KEYS.settings,
      // The prior values are the undo: the row holds only the new ones.
      detail: { prior: desk.settings, next },
    });
    return NextResponse.json(await view(admin, await readDesk(admin), now));
  }

  // A hold, or letting one go.
  if (!isAutoPiece(input.ruleKey)) {
    return NextResponse.json({ error: "Only the Sunday email, the monthly note and the feast shop email can be held." }, { status: 400 });
  }
  const holds = input.action === "hold" ? withHold(desk.holds, input.ruleKey, by, now) : withoutHold(desk.holds, input.ruleKey, now);
  const w = await writeDesk(admin, DESK_KEYS.holds, { holds }, by);
  if (!w.ok) return NextResponse.json({ error: w.absent ? NOT_THERE : w.error }, { status: w.absent ? 409 : 500 });
  void logActivity({
    actorEmail: by,
    action: input.action === "hold" ? "desk.hold" : "desk.release",
    entityType: "site_settings",
    entityId: input.ruleKey,
    detail: { wasHeld: !!desk.holds[input.ruleKey] },
  });
  return NextResponse.json(await view(admin, await readDesk(admin), now));
}
