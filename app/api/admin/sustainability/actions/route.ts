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
  /**
   * The donations figure, entered by the owner.
   *
   * There was no way to set this. donations_monthly was writable only for its
   * GOAL, and its total was supposed to arrive from the Buy Me a Coffee cron,
   * which needs CRON_SECRET and a BMC key and has neither on production. So
   * the total sat at whatever had been put there by hand, the owner could not
   * correct it from the panel, and they have said the number currently there
   * is a placeholder for an amount they could not remember.
   *
   * This is why the figure is excluded from revenue and from the P&L
   * everywhere else in this codebase: it is recalled, not measured. Making it
   * editable does not change that, so nothing here re-admits it to a total.
   */
  z.object({
    action: z.literal("donations-set"),
    yearMonth: z.string().regex(/^\d{4}-\d{2}$/),
    totalCents: z.number().int().min(0).max(100_000_000),
    supporters: z.number().int().min(0).max(1_000_000).default(0),
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
    case "donations-set": {
      // Upsert on year_month, which is the primary key, so re-entering a
      // month's figure corrects it rather than adding a second row.
      const { error } = await supa.from("donations_monthly").upsert(
        {
          year_month: parsed.yearMonth,
          total_cents: parsed.totalCents,
          supporters: parsed.supporters,
          snapshot_date: new Date().toISOString().slice(0, 10),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "year_month" },
      );
      if (error) {
        // Reported rather than swallowed. A silent failure here leaves the
        // owner believing they corrected a figure they did not.
        return NextResponse.json(
          { error: "Could not save that figure.", detail: error.message },
          { status: 500 },
        );
      }
      // /support publishes the donations total, so it has to be rebuilt.
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
