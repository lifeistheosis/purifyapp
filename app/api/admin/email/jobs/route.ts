import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { logActivity } from "@/lib/admin/activityLog";
import { JOB_ORDERS } from "@/lib/email/audienceOrder";
import { readBudget } from "@/lib/email/budget";
import { listJobs, runEmailJob, updateJob, type EmailJob } from "@/lib/email/jobs";
import { rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The email jobs (lib/email/jobs.ts): list them, and steer one.
 *
 * PATCH changes who goes first, the per-day limit, or the state: pause, resume,
 * cancel, or "send today's share now" instead of waiting for the heartbeat. A
 * finished, expired or cancelled job cannot be resumed: a cancelled send is a
 * decision, and restarting it is a new send from the Send tab.
 */

export async function GET() {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const admin = createAdminClient();
  const budget = await readBudget(admin);
  try {
    return NextResponse.json({ jobs: await listJobs(admin), budget, ready: true });
  } catch {
    return NextResponse.json({ jobs: [], budget, ready: false });
  }
}

const Patch = z.object({
  id: z.string().uuid(),
  action: z.enum(["pause", "resume", "cancel", "run_now"]).optional(),
  order: z.enum(JOB_ORDERS).optional(),
  perDay: z.number().int().min(1).max(1000).nullable().optional(),
});

const OPEN = new Set<EmailJob["status"]>(["running", "paused"]);

export async function PATCH(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (await rateLimited(`email-jobs:${adminUser.id}`, 60, 20)) {
    return NextResponse.json({ error: "Slow down a little." }, { status: 429 });
  }
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const { id, action, order, perDay } = parsed.data;

  const admin = createAdminClient();
  const { data: current, error } = await admin.from("email_jobs").select("*").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 503 });
  if (!current) return NextResponse.json({ error: "No such send." }, { status: 404 });
  const job = current as EmailJob;
  if (!OPEN.has(job.status)) {
    return NextResponse.json({ error: `This send is ${job.status} and cannot be changed.` }, { status: 409 });
  }

  const patch: Parameters<typeof updateJob>[2] = {};
  if (order) patch.audience_order = order;
  if (perDay !== undefined) patch.per_day = perDay;
  if (action === "pause") patch.status = "paused";
  if (action === "resume" || action === "run_now") patch.status = "running";
  if (action === "cancel") patch.status = "cancelled";

  let updated = job;
  if (Object.keys(patch).length) {
    try {
      updated = await updateJob(admin, id, patch);
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 503 });
    }
  }

  let run = null;
  if (action === "run_now") {
    const budget = await readBudget(admin);
    run = await runEmailJob(admin, updated, { allowance: budget.bulkLeft });
  }

  void logActivity({
    actorEmail: adminUser.email ?? null,
    action: "email.job_update",
    entityType: "email_job",
    entityId: job.mailing_key,
    detail: { action: action ?? null, order: order ?? null, perDay: perDay ?? null, sent: run?.counts.sent ?? null },
  });

  const [fresh] = (await admin.from("email_jobs").select("*").eq("id", id)).data ?? [updated];
  return NextResponse.json({ job: fresh, run });
}
