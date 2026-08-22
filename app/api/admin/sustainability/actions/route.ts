import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAdminUser } from "@/lib/admin/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { monthlyFrom } from "@/lib/support/cadence";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("expense-upsert"),
    id: z.number().int().optional(),
    label: z.string().min(1).max(200),
    // As entered, in the cadence's own period. monthlyCents is no longer sent
    // by the client at all: it is derived here so a client can never disagree
    // with the database about what a yearly line costs per month.
    amountCents: z.number().int().min(0).max(10_000_000),
    cadence: z.enum(["once", "monthly", "yearly"]).default("monthly"),
    note: z.string().max(2000).nullable().optional(),
    category: z.string().max(80).nullable().optional(),
    active: z.boolean().default(true),
    sortOrder: z.number().int().min(0).default(0),
  }),
  // Bulk reorder, one request for the whole ladder. A drag that fired one
  // request per row would land the positions in whatever order the network
  // returned them, which is the exact race the adopt-all path documents and
  // avoids by posting sequentially. Sequential is fine for a one-off adopt and
  // wrong for a gesture the operator repeats.
  z.object({
    action: z.literal("expense-reorder"),
    ids: z.array(z.number().int().positive()).min(1).max(200),
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
        amount_cents: parsed.amountCents,
        cadence: parsed.cadence,
        monthly_cents: monthlyFrom(parsed.cadence, parsed.amountCents),
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
    case "expense-reorder": {
      // Position is the index in the array the client sent. Nothing else about
      // the rows is touched, and updated_at is deliberately NOT bumped:
      // /support publishes it as the date the numbers were last true, and
      // moving a line up the page does not change a number.
      const results = await Promise.all(
        parsed.ids.map((id, i) =>
          supa.from("expense_lines").update({ sort_order: i }).eq("id", id),
        ),
      );
      const failed = results.filter((r) => r.error).length;
      if (failed > 0) {
        return NextResponse.json(
          { error: `${failed} of ${parsed.ids.length} rows did not move` },
          { status: 500 },
        );
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
