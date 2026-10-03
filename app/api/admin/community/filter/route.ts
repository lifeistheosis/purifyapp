import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { isTableAbsent } from "@/lib/admin/tableAbsent";
import { logMod, moderatorFor, readModLog, readPendingHolds, runModAction } from "@/lib/community/moderation";
import { forgetFilter, getFilter } from "@/lib/moderation/server";
import { handleBlocked } from "@/lib/moderation/filter";
import { resetToPlainHandle } from "@/lib/profile/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * The word and spam filter's moderator side (lib/moderation,
 * lib/community/spam.ts, 20261004000000_community_filter.sql and
 * 20261005000000_community_three.sql).
 *
 * GET  what waits for a decision: posts and replies published with words
 *      masked, and the ones held from everyone (spam, a new account's link,
 *      hidden by reports), each beside what was written; the team's own
 *      words and blocked web addresses; handles that carry a listed word; the
 *      latest lines of the moderation log.
 * POST approve, keep or remove a held item (the same actions moderators take
 *      in the app, lib/community/moderation.ts); add or drop a word or a web
 *      address; give a flagged handle a plain new one.
 *
 * Service role, behind the admin allowlist, like the rest of the console.
 * The built-in list itself never leaves the server, here or anywhere.
 */

export async function GET() {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const admin = createAdminClient();

  let holds: Awaited<ReturnType<typeof readPendingHolds>>;
  let log: Awaited<ReturnType<typeof readModLog>>;
  try {
    [holds, log] = await Promise.all([readPendingHolds(admin), readModLog(admin, { limit: 40, withEmail: true })]);
  } catch (e) {
    console.error("[admin/community/filter] read failed", (e as Error).message);
    return NextResponse.json({ error: "The review queue could not be read. This is not an empty queue." }, { status: 500 });
  }
  const [terms, handles] = await Promise.all([
    admin.from("community_filter_terms").select("term, scope, whole_word, created_at").order("created_at", { ascending: false }).limit(500),
    admin.from("profiles").select("handle").not("handle", "is", null).limit(20000),
  ]);
  const live = { holds: holds.live, terms: !isTableAbsent(terms.error), log: log.live };
  const readError = (live.terms ? terms.error : null) ?? handles.error;
  if (readError) {
    console.error("[admin/community/filter] read failed", readError.message);
    return NextResponse.json({ error: "The review queue could not be read. This is not an empty queue." }, { status: 500 });
  }

  const filter = await getFilter(admin);
  const flaggedHandles = ((handles.data ?? []) as { handle: string }[])
    .map((r) => r.handle)
    .filter((h) => handleBlocked(h, filter))
    .slice(0, 100);

  return NextResponse.json(
    {
      live,
      holds: holds.rows,
      terms: live.terms ? terms.data ?? [] : [],
      flaggedHandles,
      log: log.rows,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.enum(["approve_hold", "keep_hold", "remove_hold"]), id: z.string().uuid() }),
  z.object({
    action: z.literal("add_term"),
    term: z.string().trim().min(2).max(60),
    scope: z.enum(["text", "handle", "link"]),
    wholeWord: z.boolean(),
  }),
  z.object({ action: z.literal("remove_term"), term: z.string().trim().min(2).max(60) }),
  z.object({ action: z.literal("reset_handle"), handle: z.string().trim().min(3).max(24) }),
]);

/** A web address as the list keeps it: the host alone, no scheme or path. */
function hostTerm(raw: string): string | null {
  const s = raw.trim().toLowerCase();
  try {
    const host = new URL(/^https?:\/\//.test(s) ? s : `https://${s}`).hostname.replace(/^www\./, "");
    return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(host) && host.length <= 60 ? host : null;
  } catch {
    return null;
  }
}

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
  const actor = await moderatorFor(admin, adminUser);
  if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const by = adminUser.email ?? null;

  if (a.action === "add_term" || a.action === "remove_term") {
    let term = a.term.toLowerCase();
    if (a.action === "add_term" && a.scope === "link") {
      const host = hostTerm(term);
      if (!host) return NextResponse.json({ error: "That is not a web address." }, { status: 400 });
      term = host;
    }
    const { error } =
      a.action === "add_term"
        ? await admin
            .from("community_filter_terms")
            .upsert({ term, scope: a.scope, whole_word: a.wholeWord, created_by_email: by }, { onConflict: "term" })
        : await admin.from("community_filter_terms").delete().eq("term", term);
    if (error) {
      console.error("[admin/community/filter] term", error.message);
      return NextResponse.json(
        {
          error:
            a.action === "add_term" && a.scope === "link" && /check/i.test(error.message)
              ? "Blocked web addresses open with 20261005000000_community_three.sql."
              : "That word could not be saved.",
        },
        { status: 500 },
      );
    }
    forgetFilter();
    // The log names the change, not the word: a slur does not belong in a
    // list every moderator reads.
    await logMod(admin, actor, {
      action: a.action,
      target: "term",
      summary: a.action === "add_term" ? `Added a ${a.scope === "link" ? "web address" : a.scope === "handle" ? "handle word" : "word"}` : "Removed a word",
    });
    return NextResponse.json({ ok: true });
  }

  if (a.action === "reset_handle") {
    const { data } = await admin.from("profiles").select("id").eq("handle", a.handle.toLowerCase()).maybeSingle();
    const id = (data as { id: string } | null)?.id;
    if (!id) return NextResponse.json({ error: "No reader has that handle now." }, { status: 404 });
    await resetToPlainHandle(admin, id);
    await logMod(admin, actor, { action: "reset_handle", target: "profile", summary: "A flagged handle" });
    return NextResponse.json({ ok: true });
  }

  const res = await runModAction(admin, actor, a.action, a.id);
  if (!res.ok) {
    console.error("[admin/community/filter] hold", res.error);
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  return NextResponse.json({ ok: true });
}
