import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { adminEmails } from "@/lib/admin/access";
import { escapeHtml } from "@/lib/email/send";
import { emailLayout } from "@/lib/email/layout";
import { p as para } from "@/lib/email/blocks";
import { sendEmailOnce } from "@/lib/email/ledger";
import { SITE_URL } from "@/lib/site";

import { addDays, CATEGORY, dueSummary, mergeBoard, plannedTasks, type BoardTask, type StoredTask } from "./planner";
import { plannerEvidence } from "./plannerEvidence";

/**
 * One email a morning, to the owner, when the board has something on it.
 *
 * The board only reminds someone who opens the panel. This is the part that
 * reaches out: what is late and what is due today, at the start of the day,
 * and nothing at all on a day with neither. Keyed `planner_digest:<day>`, so
 * the heartbeat calling twice sends once.
 *
 * It goes to ADMIN_EMAILS, never to a reader, and it counts against the
 * reserve rather than the bulk budget: it is one email and it is the point of
 * the reserve.
 */

const list = (title: string, tasks: BoardTask[]): string => {
  if (tasks.length === 0) return "";
  const items = tasks
    .map(
      (t) =>
        `<li style="margin:0 0 6px"><strong>${escapeHtml(CATEGORY[t.category].label)}</strong> ${escapeHtml(
          t.title,
        )} <span style="opacity:.7">(${escapeHtml(t.dueOn)})</span></li>`,
    )
    .join("");
  return `<p style="margin:18px 0 6px;font-weight:600">${escapeHtml(title)}</p><ul style="margin:0;padding-left:18px">${items}</ul>`;
};

export type DigestReport = { sent: boolean; overdue: number; today: number; reason?: string };

export async function sendPlannerDigest(admin: SupabaseClient, now: Date = new Date()): Promise<DigestReport> {
  const today = now.toISOString().slice(0, 10);
  const from = addDays(today, -42);
  const to = addDays(today, 7);

  const [stored, evidence] = await Promise.all([
    admin
      .from("admin_tasks")
      .select("id, title, notes, category, due_on, status, rule_key, auto")
      .gte("due_on", from)
      .lte("due_on", to)
      .limit(500),
    plannerEvidence(admin, { from, to }).catch(() => new Set<string>()),
  ]);

  const tasks = mergeBoard({
    planned: plannedTasks(from, to),
    stored: (stored.data ?? []) as StoredTask[],
    evidence,
  });
  const due = dueSummary(tasks, today);
  if (due.overdue.length === 0 && due.today.length === 0) {
    return { sent: false, overdue: 0, today: 0, reason: "nothing due" };
  }

  const to_ = adminEmails()[0];
  if (!to_) return { sent: false, overdue: due.overdue.length, today: due.today.length, reason: "ADMIN_EMAILS unset" };

  const soon = due.later.filter((t) => t.dueOn <= addDays(today, 3));
  const body =
    para(
      due.overdue.length > 0
        ? `${due.overdue.length} thing${due.overdue.length === 1 ? " is" : "s are"} past its day, and ${due.today.length} ${
            due.today.length === 1 ? "is" : "are"
          } due today.`
        : `${due.today.length} thing${due.today.length === 1 ? " is" : "s are"} due today.`,
    ) +
    list("Late", due.overdue) +
    list("Today", due.today) +
    list("In the next few days", soon) +
    `<p style="margin:18px 0 0"><a href="${SITE_URL}/admin?tab=calendar">Open the board</a></p>`;

  const result = await sendEmailOnce(admin, {
    dedupeKey: `planner_digest:${today}`,
    kind: "planner_digest",
    userId: null,
    to: to_,
    subject:
      due.overdue.length > 0
        ? `${due.overdue.length} late, ${due.today.length} due today`
        : `${due.today.length} due today`,
    html: emailLayout({
      heading: "The board this morning",
      bodyHtml: body,
      eyebrow: "Purify",
      footer: "You are getting this because your address is in ADMIN_EMAILS.",
    }),
  });

  return { sent: result.status === "sent", overdue: due.overdue.length, today: due.today.length, reason: result.status };
}
