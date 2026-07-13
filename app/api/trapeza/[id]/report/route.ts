import { NextResponse } from "next/server";

import { corsPreflight, withCors } from "@/lib/api/cors";
import { trapezaEnabled } from "@/lib/trapeza/flags";
import { ipKey, rateLimited } from "@/lib/security/ratelimit";
import { trapezaReportSchema } from "@/lib/security/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClientFromRequest } from "@/lib/supabase/server";

/** Report a recipe for moderation. Signed-in only; lands service-role. */
async function handleReport(req: Request, id: string) {
  if (!trapezaEnabled()) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (await rateLimited(`trapeza-report:${ipKey(req.headers)}`, 3600, 30)) {
    return NextResponse.json({ error: "Too many reports." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = trapezaReportSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const supabase = await createClientFromRequest(req);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to report." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: recipe } = await admin
    .from("trapeza_recipes")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!recipe) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const { error } = await admin.from("trapeza_recipe_reports").insert({
    recipe_id: id,
    reporter_id: user.id,
    reason: parsed.data.reason?.trim() || null,
  });
  if (error) {
    console.warn("[trapeza] report insert failed", error.message);
    return NextResponse.json({ error: "Couldn't send the report." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return withCors(await handleReport(req, id), req);
}

export const OPTIONS = corsPreflight;
