import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminUser } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Owner moderation for the community features: prayer campaigns and the Trapeza
 * recipe board. Read the queue (pending recipe submissions, reported campaigns,
 * reported recipes) and act (publish/remove a recipe, remove a campaign, dismiss
 * a report). Service-role, gated to the admin email allowlist. Web only, like
 * the rest of the admin console.
 */

export async function GET() {
  const adminUser = await getAdminUser();
  if (!adminUser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();

  const [pendingRecipes, campaignReports, recipeReports] = await Promise.all([
    admin
      .from("trapeza_recipes")
      .select(
        "id, title, fast_level, season, tradition, summary, ingredients, steps, created_at",
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(200),
    admin
      .from("prayer_campaign_reports")
      .select(
        "id, reason, created_at, campaign:prayer_campaigns(id, title, status, intention, subject_name)",
      )
      .order("created_at", { ascending: false })
      .limit(200),
    admin
      .from("trapeza_recipe_reports")
      .select("id, reason, created_at, recipe:trapeza_recipes(id, title, status)")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  return NextResponse.json(
    {
      pendingRecipes: pendingRecipes.data ?? [],
      campaignReports: campaignReports.data ?? [],
      recipeReports: recipeReports.data ?? [],
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

const actionSchema = z.object({
  action: z.enum([
    "publish_recipe",
    "remove_recipe",
    "remove_campaign",
    "dismiss_campaign_report",
    "dismiss_recipe_report",
  ]),
  id: z.string().uuid(),
});

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
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }
  const { action, id } = parsed.data;
  const admin = createAdminClient();
  const now = new Date().toISOString();

  let error: { message: string } | null = null;
  switch (action) {
    case "publish_recipe":
      ({ error } = await admin
        .from("trapeza_recipes")
        .update({ status: "published", updated_at: now })
        .eq("id", id));
      break;
    case "remove_recipe":
      ({ error } = await admin
        .from("trapeza_recipes")
        .update({ status: "removed", updated_at: now })
        .eq("id", id));
      break;
    case "remove_campaign":
      ({ error } = await admin
        .from("prayer_campaigns")
        .update({ status: "removed", updated_at: now })
        .eq("id", id));
      break;
    case "dismiss_campaign_report":
      ({ error } = await admin.from("prayer_campaign_reports").delete().eq("id", id));
      break;
    case "dismiss_recipe_report":
      ({ error } = await admin.from("trapeza_recipe_reports").delete().eq("id", id));
      break;
  }

  if (error) {
    console.warn("[admin/community] action failed", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
