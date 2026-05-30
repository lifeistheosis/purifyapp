import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("expense-upsert"),
    id: z.number().int().optional(),
    label: z.string().min(1).max(200),
    monthlyCents: z.number().int().min(0).max(10_000_000),
    note: z.string().max(2000).nullable().optional(),
    category: z.string().max(80).nullable().optional(),
    active: z.boolean().default(true),
    sortOrder: z.number().int().default(0),
  }),
  z.object({
    action: z.literal("expense-delete"),
    id: z.number().int().positive(),
  }),
  z.object({
    action: z.literal("goal-set"),
    yearMonth: z.string().regex(/^\d{4}-\d{2}$/),
    goalCents: z.number().int().min(0).max(10_000_000),
  }),
]);

export async function POST(req: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid body", detail: String(err) },
      { status: 400 },
    );
  }

  const supa = createAdminClient();
  const email = admin.email ?? "unknown";

  switch (parsed.action) {
    case "expense-upsert": {
      const row = {
        label: parsed.label,
        monthly_cents: parsed.monthlyCents,
        note: parsed.note ?? null,
        category: parsed.category ?? null,
        active: parsed.active,
        sort_order: parsed.sortOrder,
        updated_at: new Date().toISOString(),
        updated_by_email: email,
      };
      if (parsed.id && parsed.id > 0) {
        await supa.from("expense_lines").update(row).eq("id", parsed.id);
      } else {
        await supa.from("expense_lines").insert(row);
      }
      revalidatePath("/support");
      return NextResponse.json({ ok: true });
    }
    case "expense-delete": {
      await supa.from("expense_lines").delete().eq("id", parsed.id);
      revalidatePath("/support");
      return NextResponse.json({ ok: true });
    }
    case "goal-set": {
      await supa.from("donations_monthly").upsert(
        {
          year_month: parsed.yearMonth,
          goal_cents: parsed.goalCents,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "year_month" },
      );
      revalidatePath("/support");
      return NextResponse.json({ ok: true });
    }
  }
}
