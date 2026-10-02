import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { commemorationsOn, shiftForStyle } from "@/lib/calendar/orthodox";
import { identity } from "@/lib/profile/server";
import { isColumnAbsent } from "@/lib/supabase/columnAbsent";

import { communityDay, feastThreadText } from "./feastText";

// The day's feast thread: one conversation for each day's feast or saint,
// opened by @purify and pinned above the feed for that day, then let go when
// the next day's opens. Made the first time anyone reads the feed on a new
// day (app/api/community/posts, after the response), so it needs no cron; the
// unique index on feast_day (20261005) keeps it to one however many servers
// race to open it.
//
// The day is New York's and the calendar is the New Calendar, the same
// choice the Sunday email makes (lib/email/weekly.ts): one shared feed can
// only keep one day, and this is the one most readers are on.

/** The official account the thread is opened by. */
export const OFFICIAL_HANDLE = "purify";

/** The day this server last saw a thread for, so most reads skip the check. */
let confirmed: string | null = null;

export async function ensureFeastThread(admin: SupabaseClient, now: Date = new Date()): Promise<void> {
  const day = communityDay(now);
  if (confirmed === day) return;
  try {
    const { data: existing, error } = await admin.from("community_posts").select("id").eq("feast_day", day).maybeSingle();
    if (error) {
      // Before 20261005 there is no feast_day. Stop asking until tomorrow.
      if (isColumnAbsent(error)) confirmed = day;
      else console.warn("[community] feast thread check failed", error.message);
      return;
    }
    if (!existing) {
      const [y, m, d] = day.split("-").map(Number);
      // One shared feed keeps one reckoning, and it is named here rather
      // than assumed: the New Calendar, as the Sunday email keeps.
      const all = commemorationsOn(shiftForStyle(new Date(Date.UTC(y, m - 1, d, 12)), "new"));
      const headline = all.find((c) => c.kind === "feast") ?? all[0];
      const { data: official } = await admin
        .from("profiles")
        .select("id, display_name, avatar_url")
        .eq("handle", OFFICIAL_HANDLE)
        .maybeSingle();
      if (!headline || !official) {
        confirmed = day;
        return;
      }
      const who = await identity(admin, official as { id: string; display_name: string | null; avatar_url?: string | null });
      const text = feastThreadText(headline);
      const { error: insertError } = await admin.from("community_posts").insert({
        user_id: (official as { id: string }).id,
        kind: "discussion",
        category: "feast",
        feast_day: day,
        feast_slug: text.slug,
        title: text.title,
        body: text.body,
        author_name: who.name,
        // The picture comes from the profile, by trigger (20261003).
        author_avatar: null,
        pinned_at: now.toISOString(),
        // Not an admin's address: the thread pinned itself.
        pinned_by: "feast-thread",
      });
      // 23505: another server opened it a moment ago, which is the same thing.
      if (insertError && insertError.code !== "23505") {
        console.warn("[community] feast thread not opened", insertError.message);
        return;
      }
    }
    // Yesterday's thread steps down from the top; it stays in the feed.
    await admin
      .from("community_posts")
      .update({ pinned_at: null, pinned_by: null })
      .lt("feast_day", day)
      .not("pinned_at", "is", null);
    confirmed = day;
  } catch (e) {
    console.warn("[community] feast thread failed", e instanceof Error ? e.message : String(e));
  }
}
