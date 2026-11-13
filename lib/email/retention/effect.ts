import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { pageAllSettled } from "@/lib/supabase/pageAll";

import { RETENTION_KINDS, type RetentionKind } from "./kinds";
import { parseRetentionKey } from "./plan";
import { readActivity } from "./signals";

/**
 * What each retention email did, for the owner's brief: of the readers it
 * reached, how many came back within seven days.
 *
 * The arbiter's brief, 2026-11-13: "Each email's effect (readers who come
 * back within 7 days) is ready for the owner's brief." The brief itself is
 * Admin panel 3's (lib/admin); this is the figure, ready to be read there:
 *
 *   readRetentionEffect(admin, now) → { from, to, effects: [{ kind, reached, cameBack }], errors }
 *
 * CAME BACK MEANS KEPT SOMETHING WITH THEIR ACCOUNT: a prayer checked off, a
 * verse bookmarked or noted, a place, plan or Remember kept, or a chapter
 * shown as being read, in the seven days after the email. It is the same
 * account data the emails themselves are written from (signals.ts), never the
 * visit data: the privacy page promises the two are never joined, and this
 * keeps it. A reader who came back and kept nothing is not counted, so the
 * figure is a floor, and the brief should say so.
 *
 * ONLY WHOLE WEEKS. An email counts once its seven days have passed, so the
 * window ends a week before now. The owner's own first sends are left out.
 * A reader is counted once per email however many of its notes they had.
 * No reader is named: the figures are counts, read when the brief is made and
 * written nowhere. A figure that could not be read is null, which the brief
 * says as "not read", never 0.
 */

const DAY = 86_400_000;
export const CAME_BACK_DAYS = 7;

export type RetentionEffect = {
  kind: RetentionKind;
  /** Readers this email reached in the window, each once; null when the send log could not be read. */
  reached: number | null;
  /** Of them, readers whose account kept something within seven days of it; null when that could not be read. */
  cameBack: number | null;
};

/** Of the readers sent something, how many kept something within `days` after one of their emails. Pure. */
export function cameBackWithin(
  sends: readonly { userId: string; at: number }[],
  activity: ReadonlyMap<string, readonly number[]>,
  days: number = CAME_BACK_DAYS,
): { reached: number; cameBack: number } {
  const reached = new Set(sends.map((s) => s.userId));
  const back = new Set<string>();
  for (const s of sends) {
    if (back.has(s.userId)) continue;
    const times = activity.get(s.userId) ?? [];
    if (times.some((t) => t > s.at && t <= s.at + days * DAY)) back.add(s.userId);
  }
  return { reached: reached.size, cameBack: back.size };
}

export async function readRetentionEffect(
  admin: SupabaseClient,
  now: Date = new Date(),
  opts: { days?: number } = {},
): Promise<{ from: string; to: string; effects: RetentionEffect[]; errors: string[] }> {
  const errors: string[] = [];
  const to = new Date(now.getTime() - CAME_BACK_DAYS * DAY);
  const from = new Date(to.getTime() - (opts.days ?? 28) * DAY);
  const unread = (): RetentionEffect[] => RETENTION_KINDS.map((kind) => ({ kind, reached: null, cameBack: null }));

  const { data, error } = await pageAllSettled<{ user_id: string | null; dedupe_key: string; kind: string; sent_at: string | null }>(
    (f, t) =>
      admin
        .from("email_sends")
        .select("user_id, dedupe_key, kind, sent_at")
        .in("kind", [...RETENTION_KINDS])
        .eq("status", "sent")
        .gte("sent_at", from.toISOString())
        .lte("sent_at", to.toISOString())
        .order("id")
        .range(f, t),
  );
  if (error) {
    errors.push(`email_sends for the retention figures: ${error.message}`);
    return { from: from.toISOString(), to: to.toISOString(), effects: unread(), errors };
  }

  const sends = new Map<RetentionKind, { userId: string; at: number }[]>(RETENTION_KINDS.map((k) => [k, []]));
  for (const r of data) {
    const key = parseRetentionKey(r.dedupe_key);
    const at = r.sent_at ? Date.parse(r.sent_at) : NaN;
    if (!key || key.owner || !r.user_id || !Number.isFinite(at)) continue;
    sends.get(key.kind)?.push({ userId: r.user_id, at });
  }
  const ids = [...new Set([...sends.values()].flat().map((s) => s.userId))];
  const activity = ids.length > 0 ? await readActivity(admin, ids, from, new Date(to.getTime() + CAME_BACK_DAYS * DAY), errors) : new Map<string, number[]>();

  const effects = RETENTION_KINDS.map((kind): RetentionEffect => {
    const mine = sends.get(kind) ?? [];
    if (!activity) return { kind, reached: new Set(mine.map((s) => s.userId)).size, cameBack: null };
    return { kind, ...cameBackWithin(mine, activity) };
  });
  return { from: from.toISOString(), to: to.toISOString(), effects, errors };
}
