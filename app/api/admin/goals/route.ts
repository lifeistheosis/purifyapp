import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { GOALS_KEY, GoalsSetting, readGoals, readSetting } from "@/lib/admin/goals.server";
import { isTableAbsent } from "@/lib/admin/tableAbsent";
import { rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * The Goals page's figures, and his settings for it (docs/handoffs/admin-milestones.md).
 *
 * GET: lib/admin/goals.server.ts reads every source and lib/admin/milestones.ts
 * counts. POST: his two marks and the goal email's switch, kept in
 * public.site_settings under one key as the panel's other settings are kept
 * (the service role, checked input, a rate limit). No migration. The marks are
 * his and live only in the database; the repository is public and never holds them.
 */

export async function GET() {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const read = await readGoals(createAdminClient());
  if (!read.ok) return NextResponse.json({ error: read.error }, { status: read.status });
  return NextResponse.json({ data: read.data, marksSaved: read.marksSaved, costsRead: read.costsRead, costsFrom: read.costsFrom });
}

/** What a save may change: his marks, the email's switch, or both. */
const Change = z.object({
  marks: GoalsSetting.shape.marks.removeDefault().optional(),
  mail: z.boolean().optional(),
});

export async function POST(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (await rateLimited(`admin-goals-marks:${adminUser.id}`, 60, 20)) {
    return NextResponse.json({ error: "Too many saves just now. Try again in a minute." }, { status: 429 });
  }
  const parsed = Change.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Each mark needs a name and an amount of at least $1 a week." }, { status: 400 });
  }
  const [first, second] = parsed.data.marks ?? [];
  if (first && second && second.weeklyCents <= first.weeklyCents) {
    return NextResponse.json({ error: "The second mark is higher than the first." }, { status: 400 });
  }

  const admin = createAdminClient();
  const current = await admin.from("site_settings").select("value").eq("key", GOALS_KEY).maybeSingle();
  const was = current.error ? { marks: [], mail: true } : readSetting(current.data?.value);
  const value = { marks: parsed.data.marks ?? was.marks, mail: parsed.data.mail ?? was.mail };

  const { error } = await admin
    .from("site_settings")
    .upsert({ key: GOALS_KEY, value, updated_at: new Date().toISOString(), updated_by_email: adminUser.email ?? null }, { onConflict: "key" });
  if (error) {
    return NextResponse.json(
      { error: isTableAbsent(error) ? "site_settings is not on this database yet." : "Your goals could not be saved just now." },
      { status: 503 },
    );
  }
  return NextResponse.json({ ok: true });
}
