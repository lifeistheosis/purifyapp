import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { isAdminEmail } from "@/lib/admin/access";

import { AUTO, logMod } from "./moderation";
import { AUTO_HIDE_WEIGHT, reportWeight } from "./trust";
import { staffAmong } from "./trustServer";

// A post or reply that enough different readers report hides itself until a
// moderator looks (lib/community/moderation.ts restores or removes it).
//
// Not everything can be hidden this way: an announcement, the day's feast
// thread, anything the team or a moderator wrote, and anything a moderator
// already looked at and kept up. Reports from accounts made today count half
// (lib/community/trust.ts), so a few accounts made for the purpose cannot
// hide a post on their own; a moderator's report hides it at once.

type Target = { postId: string } | { replyId: string };

export async function maybeAutoHide(admin: SupabaseClient, target: Target): Promise<boolean> {
  try {
    const isPost = "postId" in target;
    const id = isPost ? target.postId : target.replyId;
    const table = isPost ? "community_posts" : "community_post_replies";
    const cols = isPost ? "user_id, status, mod_cleared_at, pinned_at, feast_day, title, body, author_name" : "user_id, post_id, status, mod_cleared_at, body, author_name";
    const { data, error } = await admin.from(table).select(cols).eq("id", id).maybeSingle();
    // Before 20261005 there is no mod_cleared_at, and no way to hold anything.
    if (error || !data) return false;
    const row = data as unknown as {
      user_id: string;
      post_id?: string;
      status: string;
      mod_cleared_at: string | null;
      pinned_at?: string | null;
      feast_day?: string | null;
      title?: string | null;
      body: string | null;
      author_name: string;
    };
    if (row.status !== "visible" || row.mod_cleared_at || row.pinned_at || row.feast_day) return false;

    const { data: reports } = await admin
      .from("community_reports")
      .select("reporter_id")
      .eq(isPost ? "post_id" : "reply_id", id)
      .eq("status", "open")
      .limit(50);
    const reporters = [
      ...new Set(((reports ?? []) as { reporter_id: string | null }[]).map((r) => r.reporter_id).filter((v): v is string => Boolean(v))),
    ];
    if (reporters.length === 0) return false;

    const [staffSet, profiles] = await Promise.all([
      staffAmong(admin, [...reporters, row.user_id]),
      admin.from("profiles").select("id, joined_at").in("id", reporters),
    ]);
    if (staffSet.has(row.user_id)) return false;
    const joined = new Map(
      ((profiles.data ?? []) as { id: string; joined_at: string | null }[]).map((p) => [p.id, p.joined_at ? new Date(p.joined_at).getTime() : NaN]),
    );
    const now = Date.now();
    let weight = 0;
    for (const r of reporters) {
      const at = joined.get(r);
      const age = at !== undefined && Number.isFinite(at) ? now - at : Number.MAX_SAFE_INTEGER;
      weight += reportWeight(age, staffSet.has(r));
    }
    if (weight < AUTO_HIDE_WEIGHT) return false;

    // An author on the team by email (no badge) cannot be seen from here
    // without one more read, so it is asked last, only when it matters.
    const { data: author } = await admin.auth.admin.getUserById(row.user_id);
    if (isAdminEmail(author?.user?.email)) return false;

    const { error: hideError } = await admin.from(table).update({ status: "held" }).eq("id", id).eq("status", "visible");
    if (hideError) return false;
    if (!isPost && row.post_id) await admin.rpc("community_bump_reply_count", { p_post_id: row.post_id, p_delta: -1 });
    const detail = `Hidden after ${reporters.length} ${reporters.length === 1 ? "report" : "reports"}`;
    const { error: holdError } = await admin
      .from("community_text_holds")
      .insert({ [isPost ? "post_id" : "reply_id"]: id, reason: "reports", detail, hits: Math.min(500, Math.max(1, reporters.length)) });
    // 23505: a hold for this is already waiting, which is the same thing.
    if (holdError && holdError.code !== "23505") console.warn("[community] auto-hide hold not written", holdError.message);
    const words = (isPost ? row.title || row.body : row.body) ?? "";
    await logMod(admin, AUTO, {
      action: "auto_hide",
      target: isPost ? "post" : "reply",
      targetId: id,
      summary: `${detail}. ${row.author_name}: ${words.replace(/\s+/g, " ").slice(0, 120)}`,
    });
    return true;
  } catch (e) {
    console.warn("[community] auto-hide failed", e instanceof Error ? e.message : String(e));
    return false;
  }
}
