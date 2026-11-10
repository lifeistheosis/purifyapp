import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { saysDanger } from "@/lib/campaigns/safety";

// Words the safety line held (lib/campaigns/safety.ts): an update or a
// comment that may mean its writer, or someone they write of, is in danger.
//
// The moderators' rule for them (Admin's, 2026-11-10), which three places
// keep and this file serves:
//
//   never against the writer    removing such words does not count in their
//                               standing (./trustServer.ts). The record of
//                               who removed them stays as it is.
//   never "the house rules"     removing them needs a reason a moderator
//                               chose from the list, and never the one that
//                               is said when none was chosen
//                               (./moderation.ts, removeReply). If no rule
//                               is broken they are approved, or left
//                               waiting: a request for prayer in a hard
//                               hour is what campaigns are for.
//   never quoted                the moderators' log says what was done and
//                               not the words (./moderation.ts).
//
// A hold is known by the mark in its detail, whatever reason it is filed
// under and whether it still waits or was decided: so the rule holds on
// every path that reaches such words, the queue's or a report's.

/**
 * Which of these replies the safety line held. Empty where the holds cannot
 * be read, or carry no detail yet (before 20261005): there are none then.
 * Never throws.
 */
export async function repliesHeldForDanger(admin: SupabaseClient, replyIds: readonly (string | null | undefined)[]): Promise<Set<string>> {
  const ids = [...new Set(replyIds.filter((id): id is string => typeof id === "string" && id.length > 0))];
  const held = new Set<string>();
  if (ids.length === 0) return held;
  try {
    const { data, error } = await admin.from("community_text_holds").select("reply_id, detail").in("reply_id", ids).not("detail", "is", null).limit(1000);
    if (error) return held;
    for (const row of (data ?? []) as { reply_id: string | null; detail: string | null }[]) {
      if (row.reply_id && saysDanger(row.detail)) held.add(row.reply_id);
    }
  } catch {
    /* read as none */
  }
  return held;
}

/** What the moderators' log says in place of such words. */
export const DANGER_NOT_QUOTED = "words that may mean danger, not quoted";

/** What a moderator is told when they remove such words with no reason chosen, or with the one that stands for none. */
export const DANGER_NEEDS_REASON =
  "Choose why this is removed. Words that may mean their writer is in danger are never removed as against the house rules: approve them, leave them waiting, or name the real reason.";
/** The code of that answer, for a screen that then asks for the reason. */
export const DANGER_NEEDS_REASON_CODE = "reason_needed";
