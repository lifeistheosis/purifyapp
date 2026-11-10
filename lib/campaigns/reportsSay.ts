import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { isAdminEmail } from "@/lib/admin/access";
import { AUTO_HIDE_WEIGHT, NEW_ACCOUNT_MS, reportWeight } from "@/lib/community/trust";
import { staffAmong } from "@/lib/community/trustServer";

// When readers' reports hide something of a campaign until a moderator
// looks: the campaign itself (./moderation.ts) and each of its pictures
// (./pictures.ts), by one rule, written once.
//
//   - at once, for the reason "it is about me or someone in my care", from
//     an account older than a day: a person named or shown without their
//     blessing should not wait for two more readers to agree;
//   - when reports add up as they do for a post (lib/community/trust.ts:
//     three readers, a new account counting half, a moderator's at once).
//
// Never the team's own. And whoever calls this has already asked whether a
// moderator has looked at these reports' like before and kept the thing: one
// kept after reports is not hidden by reports again, so that neither rule
// can be used to silence it.

export type OpenReport = { reporter_id: string | null; reason_code: string | null };

export type ReportsSay = { hide: false } | { hide: true; aboutMe: boolean; reporters: number };

/** What these open reports say of something `creatorId` put up. Reads who reported only to weigh them. */
export async function reportsSay(admin: SupabaseClient, creatorId: string, reports: readonly OpenReport[], now: number = Date.now()): Promise<ReportsSay> {
  const rows = reports.filter((r) => r.reporter_id);
  const reporters = [...new Set(rows.map((r) => r.reporter_id as string))];
  if (reporters.length === 0) return { hide: false };

  const [staffSet, profiles] = await Promise.all([staffAmong(admin, [...reporters, creatorId]), admin.from("profiles").select("id, joined_at").in("id", reporters)]);
  if (staffSet.has(creatorId)) return { hide: false };
  const joined = new Map(
    ((profiles.data ?? []) as { id: string; joined_at: string | null }[]).map((p) => [p.id, p.joined_at ? new Date(p.joined_at).getTime() : NaN]),
  );
  const ageOf = (id: string) => {
    const at = joined.get(id);
    return at !== undefined && Number.isFinite(at) ? now - at : Number.MAX_SAFE_INTEGER;
  };
  let weight = 0;
  for (const r of reporters) weight += reportWeight(ageOf(r), staffSet.has(r));
  const aboutMe = rows.some((r) => r.reason_code === "about_me" && ageOf(r.reporter_id as string) >= NEW_ACCOUNT_MS);
  if (!aboutMe && weight < AUTO_HIDE_WEIGHT) return { hide: false };

  // The team's own, by email and with no badge, is asked last, only when it matters.
  const { data: author } = await admin.auth.admin.getUserById(creatorId);
  if (isAdminEmail(author?.user?.email)) return { hide: false };
  return { hide: true, aboutMe, reporters: reporters.length };
}
