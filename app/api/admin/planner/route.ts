import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { addDays, CATEGORY, mergeBoard, plannedTasks, type StoredTask } from "@/lib/admin/planner";
import { plannerEvidence } from "@/lib/admin/plannerEvidence";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The planner board: what is due between two days, and the four ways to
 * change it.
 *
 * GET  ?from=YYYY-MM-DD&to=YYYY-MM-DD
 * POST a task of your own
 * PATCH mark done, skip, reopen, move, or rename. A generated task has no row
 *       until it is marked, so PATCH takes a ruleKey and writes one.
 * DELETE a task of your own. A generated one is skipped instead of deleted,
 *       because the rule would only bring it back.
 */

const TABLE = "admin_tasks";
const COLUMNS = "id, title, notes, category, due_on, status, rule_key, auto";
const DAY = /^\d{4}-\d{2}-\d{2}$/;

function notReady(e: { message: string }) {
  return NextResponse.json(
    { error: `${e.message}. Is supabase/migrations/20260919_ops_board.sql applied?`, ready: false },
    { status: 503 },
  );
}

export async function GET(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  if (!DAY.test(from) || !DAY.test(to) || to < from) {
    return NextResponse.json({ error: "Give a from and to day." }, { status: 400 });
  }

  const admin = createAdminClient();
  const [stored, evidence] = await Promise.all([
    admin.from(TABLE).select(COLUMNS).gte("due_on", from).lte("due_on", to).limit(500),
    plannerEvidence(admin, { from, to }).catch(() => new Set<string>()),
  ]);
  if (stored.error) {
    return NextResponse.json({
      tasks: mergeBoard({ planned: plannedTasks(from, to), stored: [], evidence }),
      ready: false,
      error: stored.error.message,
    });
  }

  return NextResponse.json({
    tasks: mergeBoard({
      planned: plannedTasks(from, to),
      stored: (stored.data ?? []) as StoredTask[],
      evidence,
    }),
    ready: true,
  });
}

const New = z.object({
  title: z.string().trim().min(1).max(160),
  notes: z.string().trim().max(2000).optional(),
  category: z.enum(Object.keys(CATEGORY) as [string, ...string[]]).default("task"),
  dueOn: z.string().regex(DAY),
});

export async function POST(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = New.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Give it a title and a day." }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from(TABLE)
    .insert({
      title: parsed.data.title,
      notes: parsed.data.notes ?? null,
      category: parsed.data.category,
      due_on: parsed.data.dueOn,
      created_by_email: adminUser.email ?? null,
    })
    .select(COLUMNS)
    .single();
  if (error) return notReady(error);
  return NextResponse.json({ task: data });
}

const Change = z
  .object({
    id: z.string().uuid().optional(),
    /** For a generated task with no row yet. */
    ruleKey: z.string().min(1).max(120).optional(),
    title: z.string().trim().min(1).max(160).optional(),
    notes: z.string().trim().max(2000).optional(),
    category: z.enum(Object.keys(CATEGORY) as [string, ...string[]]).optional(),
    dueOn: z.string().regex(DAY).optional(),
    status: z.enum(["open", "done", "skipped"]).optional(),
  })
  .refine((v) => v.id || v.ruleKey, { message: "id or ruleKey" });

export async function PATCH(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = Change.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const { id, ruleKey, status, ...rest } = parsed.data;

  const admin = createAdminClient();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (rest.title !== undefined) patch.title = rest.title;
  if (rest.notes !== undefined) patch.notes = rest.notes;
  if (rest.category !== undefined) patch.category = rest.category;
  if (rest.dueOn !== undefined) patch.due_on = rest.dueOn;
  if (status !== undefined) {
    patch.status = status;
    patch.done_at = status === "done" ? new Date().toISOString() : null;
  }

  if (id) {
    const { data, error } = await admin.from(TABLE).update(patch).eq("id", id).select(COLUMNS).maybeSingle();
    if (error) return notReady(error);
    if (!data) return NextResponse.json({ error: "No such task." }, { status: 404 });
    return NextResponse.json({ task: data });
  }

  // A generated task being marked for the first time: write the row the rule
  // implied, so the mark survives and the rule stops asking.
  // Rules a year either side of today, which covers anything markable.
  const today = new Date().toISOString().slice(0, 10);
  const planned = plannedTasks(addDays(today, -400), addDays(today, 400)).find((p) => p.ruleKey === ruleKey);
  const { data, error } = await admin
    .from(TABLE)
    .upsert(
      {
        rule_key: ruleKey,
        auto: true,
        title: rest.title ?? planned?.title ?? ruleKey!,
        notes: rest.notes ?? planned?.notes ?? null,
        category: rest.category ?? planned?.category ?? "task",
        due_on: rest.dueOn ?? planned?.dueOn ?? new Date().toISOString().slice(0, 10),
        created_by_email: adminUser.email ?? null,
        ...patch,
      },
      { onConflict: "rule_key" },
    )
    .select(COLUMNS)
    .single();
  if (error) return notReady(error);
  return NextResponse.json({ task: data });
}

export async function DELETE(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Which task?" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from(TABLE).delete().eq("id", id);
  if (error) return notReady(error);
  return NextResponse.json({ ok: true });
}
