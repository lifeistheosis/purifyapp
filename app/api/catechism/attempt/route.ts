import { NextResponse } from "next/server";

import { corsPreflight, corsRoute } from "@/lib/api/cors";
import { isTableAbsent } from "@/lib/admin/tableAbsent";
import { handleAttempt } from "@/lib/catechism/attempt";
import { loadBank } from "@/lib/catechism/bank";
import { isoFromDate } from "@/lib/catechism/dates";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Record a signed-in reader's catechism for the day.
 *
 * The rule lives in lib/catechism/attempt.ts, where it is tested; this file
 * is the HTTP around it. Bearer or cookie (createClientFromRequest), so the
 * native shell can call it cross-origin; the insert runs as the user under
 * RLS, which is what proves the row is theirs. The aggregate counters and the
 * quiz_daily record are written with the service role afterwards.
 *
 * SHIPS DARK. A missing table answers 503 and the client keeps the attempt on
 * the device, which is where it was written first. Nothing here can lose a
 * completed catechism.
 */
async function handlePOST(req: Request) {
  const ct = req.headers.get("content-type") ?? "";
  if (!ct.toLowerCase().includes("application/json")) {
    return NextResponse.json({ ok: false, error: "json only" }, { status: 415 });
  }

  const ip = ipKey(req.headers);
  if (await rateLimited(`catechism-attempt:${ip}`, 60, 20)) {
    return new NextResponse(null, { status: 429 });
  }

  const supa = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "sign in" }, { status: 401 });

  const raw = await req.json().catch(() => null);
  const admin = createAdminClient();

  const outcome = await handleAttempt(
    {
      bank: loadBank(),
      today: isoFromDate(new Date()),
      insert: async (row) => {
        const { error } = await supa.from("quiz_attempts").insert(row);
        return { error };
      },
      bump: async (shown, correct) => {
        const { error } = await admin.rpc("bump_quiz_stats", {
          question_ids: shown,
          correct_ids: correct,
        });
        if (error && !isTableAbsent(error)) {
          console.warn("[catechism] bump_quiz_stats failed", error.message);
        }
      },
      recordDaily: async (date, reckoning, ids) => {
        const { error } = await admin
          .from("quiz_daily")
          .upsert(
            { date, reckoning, question_ids: ids },
            { onConflict: "date,reckoning", ignoreDuplicates: true },
          );
        if (error && !isTableAbsent(error)) {
          console.warn("[catechism] quiz_daily upsert failed", error.message);
        }
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
