import { NextResponse } from "next/server";

import { getAdminUser } from "@/lib/admin/access";
import { isTableAbsent } from "@/lib/admin/tableAbsent";
import { loadBank } from "@/lib/catechism/bank";
import { isoFromDate } from "@/lib/catechism/dates";
import { pickDaily } from "@/lib/catechism/select";
import type { QuestionType } from "@/lib/catechism/types";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export type CatechismQuestionStat = {
  id: string;
  type: QuestionType;
  prompt: string;
  tags: string[];
  anchored: boolean;
  /** Null while the stats table is absent: not measured is not zero. */
  shown: number | null;
  correct: number | null;
};

export type CatechismAdminPayload = {
  bankSize: number;
  today: { date: string; new: string[]; old: string[] };
  questions: CatechismQuestionStat[];
  /** Per table, whether the migration has been applied. */
  absent: { stats: boolean; attempts: boolean; events: boolean };
  /** Null where the read failed; the tab renders "unmeasured", never 0. */
  attempts: { today: number | null; total: number | null };
  events: { started30: number | null; completed30: number | null };
};

// Reach > Catechism: the bank as the file holds it, today's two sets, and
// how each question lands. Counts only. quiz_attempts is read with the
// service role for two COUNTs and nothing else leaves it: no row, no user_id.
export async function GET() {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const bank = loadBank();
  const today = isoFromDate(new Date());
  const supa = createAdminClient();
  const since30 = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const [stats, attemptsToday, attemptsTotal, started, completed] = await Promise.all([
    supa.from("quiz_question_stats").select("question_id, shown, correct"),
    supa.from("quiz_attempts").select("id", { count: "exact", head: true }).eq("date", today),
    supa.from("quiz_attempts").select("id", { count: "exact", head: true }),
    supa
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("name", "catechism_started")
      .gte("ts", since30),
    supa
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("name", "catechism_completed")
      .gte("ts", since30),
  ]);

  const statsAbsent = isTableAbsent(stats.error);
  const byId = new Map<string, { shown: number; correct: number }>();
  if (!stats.error) {
    for (const r of (stats.data ?? []) as { question_id: string; shown: number; correct: number }[]) {
      byId.set(r.question_id, { shown: r.shown, correct: r.correct });
    }
  }

  const questions: CatechismQuestionStat[] = bank.map((q) => {
    const s = byId.get(q.id);
    return {
      id: q.id,
      type: q.type,
      prompt: q.prompt,
      tags: q.tags,
      anchored: !!q.calendar_anchor,
      shown: stats.error ? null : (s?.shown ?? 0),
      correct: stats.error ? null : (s?.correct ?? 0),
    };
  });

  const count = (r: { count: number | null; error: { message: string } | null }) =>
    r.error ? null : (r.count ?? null);

  const payload: CatechismAdminPayload = {
    bankSize: bank.length,
    today: {
      date: today,
      new: bank.length ? pickDaily(bank, today, "new") : [],
      old: bank.length ? pickDaily(bank, today, "old") : [],
    },
    questions,
    absent: {
      stats: statsAbsent,
      attempts: isTableAbsent(attemptsTotal.error),
      events: isTableAbsent(started.error),
    },
    attempts: { today: count(attemptsToday), total: count(attemptsTotal) },
    events: { started30: count(started), completed30: count(completed) },
  };

  return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
}
