import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { goalHitEmail } from "@/lib/email/goalHit";
import { KIT_ASSETS } from "@/lib/email/kitLetters";
import { sendEmailOnce } from "@/lib/email/ledger";
import { SITE_URL } from "@/lib/site";

import { adminEmails } from "./access";
import { readGoals } from "./goals.server";
import { goalsToMail } from "./milestones";

/**
 * The goal email, sent (his word, 2026-11-24: "build the sender"). The hourly
 * heartbeat (app/api/cron/hourly-goals) calls this after it answers. Each goal
 * he reaches (its milestone held four weeks running, lib/admin/milestones.ts)
 * is mailed to him once: the email ledger's key is the goal and its amount, so
 * a goal mailed is never mailed again, and a mark he changes is a new goal. A
 * goal reached more than a fortnight before is old news and is not mailed, so
 * the first run never sends a pile. It goes to the first address in
 * ADMIN_EMAILS, as the owner's brief does, and not at all when he has turned
 * it off on his Goals page.
 */

export type GoalMailReport = { sent: string[]; skipped: string | null };

const tierOfLevel = (n: number) => Math.min(Math.max(n, 1), 5);
const masthead = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
const aWeek = (cents: number) => `$${Math.round(cents / 100).toLocaleString("en-US")} a week`;

export async function sendGoalMail(admin: SupabaseClient, now: Date = new Date()): Promise<GoalMailReport> {
  const to = adminEmails()[0];
  if (!to) return { sent: [], skipped: "ADMIN_EMAILS unset" };
  const read = await readGoals(admin, now);
  if (!read.ok) return { sent: [], skipped: read.error };
  if (!read.setting.mail) return { sent: [], skipped: "turned off on his Goals page" };

  const sent: string[] = [];
  for (const step of goalsToMail(read.data.steps, now)) {
    const level = read.data.steps.indexOf(step) + 1;
    const tier = tierOfLevel(level);
    const { subject, html } = goalHitEmail(
      { level, tier, name: step.name, amount: aWeek(step.weeklyCents), date: masthead.format(now) },
      { admin: `${SITE_URL}/admin` },
      { ...KIT_ASSETS, mark: `${SITE_URL}/email/level-${tier}.png` },
    );
    const result = await sendEmailOnce(admin, { dedupeKey: `goal_hit:${step.id}:${step.weeklyCents}`, kind: "goal_hit", userId: null, to, subject, html });
    if (result.status === "sent") sent.push(step.id);
  }
  return { sent, skipped: null };
}
