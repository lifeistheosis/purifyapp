import { NextResponse } from "next/server";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { loadBank } from "@/lib/catechism/bank";
import { loadCollections } from "@/lib/catechism/collections";
import { isoFromDate } from "@/lib/catechism/dates";
import { handleProgress, type ProgressRow } from "@/lib/catechism/progress";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { createClientFromRequest } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Advance a signed-in reader's collections.
 *
 * The rule lives in lib/catechism/progress.ts, where it is tested; this file
 * is the HTTP around it. Bearer or cookie (createClientFromRequest), so the
 * native shell can call it cross-origin; the read and the upsert both run as
 * the user under RLS (collection_progress is self-only), which is what
 * proves the row is theirs. No service role here: nothing in this route
 * needs to touch anyone else's row.
 *
 * SHIPS DARK. A missing table answers 503 and the client keeps the set on
 * the device, which is where it was written first. Nothing here can lose a
 * correct answer: the server only ever unions.
 */
async function handlePOST(req: Request) {
  const ct = req.headers.get("content-type") ?? "";
  if (!ct.toLowerCase().includes("application/json")) {
    return NextResponse.json({ ok: false, error: "json only" }, { status: 415 });
  }

  // Practice mode posts after every correct answer, so the ceiling is a
  // reader going quickly, not the five a day.
  const ip = ipKey(req.headers);
  if (await rateLimited(`catechism-progress:${ip}`, 60, 120)) {
    return new NextResponse(null, { status: 429 });
  }

  const supa = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "sign in" }, { status: 401 });

  const raw = await req.json().catch(() => null);

  const outcome = await handleProgress(
    {
      collections: loadCollections(),
      bank: loadBank(),
      today: isoFromDate(new Date()),
      read: async (slugs) => {
        const { data, error } = await supa
          .from("collection_progress")
          .select("user_id, slug, correct_question_ids, completed_at")
          .eq("user_id", user.id)
          .in("slug", slugs);
        return { rows: ((data ?? []) as ProgressRow[]), error };
      },
      upsert: async (rows) => {
        const { error } = await supa
          .from("collection_progress")
          .upsert(rows, { onConflict: "user_id,slug" });
        return { error };
      },
    },
    raw,
    user.id,
  );

  return NextResponse.json(outcome, {
    status: outcome.status,
    headers: { "Cache-Control": "no-store" },
  });
}

export const POST = corsRoute(handlePOST);
export const OPTIONS = corsPreflight;
