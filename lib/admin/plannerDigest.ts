import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { adminEmails } from "@/lib/admin/access";
import { escapeHtml } from "@/lib/email/send";
import { emailLayout } from "@/lib/email/layout";
import { p as para } from "@/lib/email/blocks";
import { sendEmailOnce } from "@/lib/email/ledger";
import { listProducts } from "@/lib/shop/catalog";
import { SITE_URL } from "@/lib/site";

import { addDays, mergeBoard, morningMail, plannedTasks, waitsOnHim } from "./planner";
import { plannerEvidence } from "./plannerEvidence";
import { readStoredTasks } from "./plannerRead";

/**
 * One email a morning, to the owner, when something on the board needs him.
 *
 * The board only reminds someone who opens the panel. This is the part that
 * reaches out, and since 2026-11-12 it says only what needs his hand or his
 * word (his word that day, docs/plans/owner-desk.md section 1: "If it doesn't
 * have anything to do with my input ... So you can automate that process,
 * right?"). It used to list every planned task of the last six weeks with no
 * sign of being done, about thirty "late" lines on a morning in a long build,
 * most of them the team's or things he already knew.
 *
 * So, with the rules in lib/admin/planner.ts (morningMail):
 *   - only his: the EIKON Box, a drop's steps, a task a person added. What
 *     the team prepares (the board message, the Sunday email, the monthly
 *     note, the feast shop email) is never late here;
 *   - a task he has given a day ("not before", in the Calendar) is quiet until
 *     that day, however far off (lib/admin/plannerRead.ts keeps its row);
 *   - a missed run is one line: "The EIKON Box drop: not opened for 2 months";
 *   - a team piece shows on its own day only, under "Ready to send" with the
 *     link that sends it (never as late, never on a later day), and a
 *     morning whose only item is one still sends;
 *   - the subject names what needs him, never a count of what is late;
 *   - a morning with nothing for him and nothing ready sends nothing.
 *
 * Keyed `planner_digest:<day>`, so the heartbeat calling twice sends once. It
 * goes to ADMIN_EMAILS, never to a reader, and counts against the reserve
 * rather than the bulk budget.
 */

/** `overdue` and `today` count his tasks only: the team's are never late here. */
export type DigestReport = { sent: boolean; overdue: number; today: number; reason?: string };

export async function sendPlannerDigest(admin: SupabaseClient, now: Date = new Date()): Promise<DigestReport> {
  const today = now.toISOString().slice(0, 10);
  const from = addDays(today, -42);

  const products = await listProducts({ limit: 60 });
  const planned = plannedTasks(from, today, products);
  const [stored, evidence] = await Promise.all([
    readStoredTasks(admin, { from, to: today }, planned.map((t) => t.ruleKey)),
    plannerEvidence(admin, { from, to: today }).catch(() => new Set<string>()),
  ]);

  const tasks = mergeBoard({ planned, stored: stored.rows, evidence });
  const mine = tasks.filter((t) => t.status === "open" && t.dueOn <= today && waitsOnHim(t));
  const overdue = mine.filter((t) => t.dueOn < today).length;
  const dueToday = mine.length - overdue;

  const mail = morningMail(tasks, today);
  if (!mail) return { sent: false, overdue: 0, today: 0, reason: "nothing needs him" };

  const to = adminEmails()[0];
  if (!to) return { sent: false, overdue, today: dueToday, reason: "ADMIN_EMAILS unset" };

  // `#tab=`, never `?tab=`: the panel reads the fragment, so the old link,
  // /admin?tab=calendar, opened Home instead of the board.
  const viewLink = `${SITE_URL.replace(/\/$/, "")}/admin#tab=`;
  const list = (items: string[]) => `<ul style="margin:0;padding-left:18px">${items.join("")}</ul>`;
  const needs = mail.lines.map(
    (l) =>
      `<li style="margin:0 0 6px">${escapeHtml(l.text)}${l.when ? ` <span style="opacity:.7">(${escapeHtml(l.when)})</span>` : ""}</li>`,
  );
  const ready = mail.ready.map(
    (r) => `<li style="margin:0 0 6px">${escapeHtml(r.text)}: <a href="${viewLink}${r.tab}">send it</a></li>`,
  );
  const body =
    (needs.length > 0 ? para("These need your hand or your word. The rest of the board is the team's.") + list(needs) : "") +
    (ready.length > 0
      ? `<p style="margin:${needs.length > 0 ? "18px" : "0"} 0 6px;font-weight:600">Ready to send</p>` +
        para("Ready for today, each sent from its own page.", "margin-bottom:8px") +
        list(ready)
      : "") +
    `<p style="margin:18px 0 0"><a href="${viewLink}calendar">Open the board</a></p>` +
    (needs.length > 0
      ? para("A task you give a day stays out of this email until then: open it in the Calendar and choose Not before.", "margin-top:18px;font-size:14px")
      : "");

  const result = await sendEmailOnce(admin, {
    dedupeKey: `planner_digest:${today}`,
    kind: "planner_digest",
    userId: null,
    to,
    subject: mail.subject,
    html: emailLayout({
      heading: mail.lines.length > 0 ? "What needs you" : "Ready to send today",
      bodyHtml: body,
      eyebrow: "Purify",
      footer: "You are getting this because your address is in ADMIN_EMAILS.",
    }),
  });

  return { sent: result.status === "sent", overdue, today: dueToday, reason: result.status };
}
