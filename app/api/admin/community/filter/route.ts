import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { isTableAbsent } from "@/lib/admin/tableAbsent";
import { forgetFilter, getFilter } from "@/lib/moderation/server";
import { handleBlocked } from "@/lib/moderation/filter";
import { resetToPlainHandle } from "@/lib/profile/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * The word filter's moderator side (lib/moderation, 20261004_community_filter.sql).
 *
 * GET  the posts and replies published with words masked, each beside what
 *      was written; the team's own words; handles that carry a listed word.
 * POST approve a held post as written, keep it hidden, or remove it; add or
 *      drop one of the team's words; give a flagged handle a plain new one.
 *
 * Service role, behind the admin allowlist, like the rest of the console.
 * The built-in list itself never leaves the server, here or anywhere.
 */

const HOLD_COLS =
  "id, post_id, reply_id, original_title, original_body, hits, created_at, post:community_posts(id, kind, title, body, author_name, author_handle, status), reply:community_post_replies(id, post_id, body, author_name, author_handle, status)";

export async function GET() {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const admin = createAdminClient();

  const [holds, terms, handles] = await Promise.all([
    admin.from("community_text_holds").select(HOLD_COLS).eq("status", "pending").order("created_at", { ascending: false }).limit(100),
    admin.from("community_filter_terms").select("term, scope, whole_word, created_at").order("created_at", { ascending: false }).limit(500),
    admin.from("profiles").select("handle").not("handle", "is", null).limit(20000),
  ]);
  const live = { holds: !isTableAbsent(holds.error), terms: !isTableAbsent(terms.error) };
  const readError = (live.holds ? holds.error : null) ?? (live.terms ? terms.error : null) ?? handles.error;
  if (readError) {
    console.error("[admin/community/filter] read failed", readError.message);
    return NextResponse.json(
      { error: "The word filter queue could not be read. This is not an empty queue." },
      { status: 500 },
    );
  }

  const filter = await getFilter(admin);
  const flaggedHandles = ((handles.data ?? []) as { handle: string }[])
    .map((r) => r.handle)
    .filter((h) => handleBlocked(h, filter))
    .slice(0, 100);

  return NextResponse.json(
    {
      live,
      holds: live.holds ? holds.data ?? [] : [],
      terms: live.terms ? terms.data ?? [] : [],
      flaggedHandles,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.enum(["approve_hold", "keep_hold", "remove_hold"]), id: z.string().uuid() }),
  z.object({
    action: z.literal("add_term"),
    term: z.string().trim().min(2).max(60),
    scope: z.enum(["text", "handle"]),
    wholeWord: z.boolean(),
  }),
  z.object({ action: z.literal("remove_term"), term: z.string().trim().min(2).max(60) }),
  z.object({ action: z.literal("reset_handle"), handle: z.string().trim().min(3).max(24) }),
]);

type Hold = {
  id: string;
  post_id: string | null;
  reply_id: string | null;
  original_title: string | null;
  original_body: string | null;
  status: string;
};

export async function POST(req: Request) {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  const a = parsed.data;
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const by = adminUser.email ?? null;

  if (a.action === "add_term" || a.action === "remove_term") {
    const term = a.term.toLowerCase();
    const { error } =
      a.action === "add_term"
        ? await admin
            .from("community_filter_terms")
            .upsert({ term, scope: a.scope, whole_word: a.wholeWord, created_by_email: by }, { onConflict: "term" })
        : await admin.from("community_filter_terms").delete().eq("term", term);
    if (error) {
      console.error("[admin/community/filter] term", error.message);
      return NextResponse.json({ error: "That word could not be saved." }, { status: 500 });
    }
    forgetFilter();
    return NextResponse.json({ ok: true });
  }

  if (a.action === "reset_handle") {
    const { data } = await admin.from("profiles").select("id").eq("handle", a.handle.toLowerCase()).maybeSingle();
    const id = (data as { id: string } | null)?.id;
    if (!id) return NextResponse.json({ error: "No reader has that handle now." }, { status: 404 });
    await resetToPlainHandle(admin, id);
    return NextResponse.json({ ok: true });
  }

  const { data: holdRow, error: holdError } = await admin
    .from("community_text_holds")
    .select("id, post_id, reply_id, original_title, original_body, status")
    .eq("id", a.id)
    .maybeSingle();
  const hold = holdRow as Hold | null;
  if (holdError || !hold) return NextResponse.json({ error: "That item is not in the queue." }, { status: 404 });
  if (hold.status !== "pending") return NextResponse.json({ error: "Already decided." }, { status: 409 });

  let error: { message: string } | null = null;
  if (a.action === "approve_hold") {
    // As written: the original words back in the public row.
    if (hold.post_id) {
      ({ error } = await admin
        .from("community_posts")
        .update({ title: hold.original_title, body: hold.original_body })
        .eq("id", hold.post_id));
    } else if (hold.reply_id && hold.original_body) {
      ({ error } = await admin.from("community_post_replies").update({ body: hold.original_body }).eq("id", hold.reply_id));
    }
  } else if (a.action === "remove_hold") {
    // Soft removal, as the rest of the console does it: the row and its record stay.
    const removal = { status: "removed", removed_reason: "Word filter", removed_by_email: by };
    if (hold.post_id) {
      ({ error } = await admin.from("community_posts").update(removal).eq("id", hold.post_id));
    } else if (hold.reply_id) {
      const { data: reply } = await admin.from("community_post_replies").select("post_id, status").eq("id", hold.reply_id).maybeSingle();
      ({ error } = await admin.from("community_post_replies").update(removal).eq("id", hold.reply_id));
      const r = reply as { post_id: string; status: string } | null;
      if (!error && r && r.status !== "removed") {
        await admin.rpc("community_bump_reply_count", { p_post_id: r.post_id, p_delta: -1 });
      }
    }
  }
  if (error) {
    console.error("[admin/community/filter] hold", error.message);
    return NextResponse.json({ error: "That could not be done. Nothing changed." }, { status: 500 });
  }

  const status = a.action === "approve_hold" ? "approved" : a.action === "keep_hold" ? "kept" : "removed";
  await admin.from("community_text_holds").update({ status, resolved_by_email: by, resolved_at: now }).eq("id", hold.id);
  return NextResponse.json({ ok: true });
}
